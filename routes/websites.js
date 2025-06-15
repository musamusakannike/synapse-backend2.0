const express = require("express")
const axios = require("axios")
const cheerio = require("cheerio")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const Website = require("../models/Website")
const Chat = require("../models/Chat")
const geminiService = require("../services/geminiService")

const router = express.Router()

// Helper function to scrape website content
async function scrapeWebsite(url) {
  try {
    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    const $ = cheerio.load(response.data)

    // Remove script and style elements
    $("script, style, nav, footer, header, aside, .advertisement, .ads").remove()

    // Extract title
    const title = $("title").text().trim() || $("h1").first().text().trim() || "Untitled"

    // Extract main content
    let content = ""

    // Try to find main content areas
    const contentSelectors = [
      "main",
      "article",
      ".content",
      ".main-content",
      ".post-content",
      ".entry-content",
      "#content",
      ".container",
    ]

    let foundContent = false
    for (const selector of contentSelectors) {
      const element = $(selector)
      if (element.length > 0 && element.text().trim().length > 100) {
        content = element.text().trim()
        foundContent = true
        break
      }
    }

    // Fallback to body content if no main content found
    if (!foundContent) {
      content = $("body").text().trim()
    }

    // Clean up content
    content = content.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim()

    // Limit content length
    if (content.length > 50000) {
      content = content.substring(0, 50000) + "..."
    }

    return {
      title,
      content,
      url: response.request.res.responseUrl || url, // Get final URL after redirects
    }
  } catch (error) {
    console.error("Website scraping error:", error)
    throw new Error(`Failed to scrape website: ${error.message}`)
  }
}

// Process website URL
router.post(
  "/process",
  auth,
  [body("url").isURL().withMessage("Valid URL is required"), body("prompt").optional().trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { url, prompt = "Please provide a comprehensive summary and analysis of this website content." } = req.body

      // Create website record
      const website = new Website({
        userId: req.user._id,
        url,
        processingStatus: "processing",
      })

      await website.save()

      try {
        // Scrape website content
        const scrapedData = await scrapeWebsite(url)

        website.title = scrapedData.title
        website.extractedContent = scrapedData.content
        website.url = scrapedData.url // Update with final URL

        // Process with Gemini
        const contextPrompt = `Website: ${scrapedData.title}\nURL: ${scrapedData.url}\nContent: ${scrapedData.content}\n\nTask: ${prompt}`
        const geminiResponse = await geminiService.generateChatResponse([{ role: "user", content: contextPrompt }])

        website.summary = geminiResponse
        website.processingStatus = "completed"

        // Create associated chat
        const chat = new Chat({
          userId: req.user._id,
          title: `Website: ${scrapedData.title}`,
          type: "website",
          sourceId: website._id,
          sourceModel: "Website",
          messages: [
            {
              role: "user",
              content: prompt,
              metadata: {
                websiteUrl: scrapedData.url,
                websiteTitle: scrapedData.title,
              },
            },
            {
              role: "assistant",
              content: geminiResponse,
            },
          ],
        })

        await chat.save()
        website.chatId = chat._id
        await website.save()

        res.status(201).json({
          message: "Website processed successfully",
          website: {
            id: website._id,
            url: website.url,
            title: website.title,
            summary: website.summary,
            chatId: website.chatId,
            processingStatus: website.processingStatus,
            scrapedAt: website.scrapedAt,
          },
        })
      } catch (processingError) {
        console.error("Website processing error:", processingError)
        website.processingStatus = "failed"
        website.processingError = processingError.message
        await website.save()

        res.status(500).json({
          error: "Failed to process website",
          websiteId: website._id,
          details: processingError.message,
        })
      }
    } catch (error) {
      console.error("Website processing error:", error)
      res.status(500).json({ error: "Failed to process website" })
    }
  },
)

// Get user's websites
router.get("/", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const websites = await Website.find({ userId: req.user._id })
      .sort({ scrapedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-extractedContent") // Exclude large content for list view

    const total = await Website.countDocuments({ userId: req.user._id })

    res.json({
      websites,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Get websites error:", error)
    res.status(500).json({ error: "Failed to fetch websites" })
  }
})

// Get specific website
router.get("/:id", auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!website) {
      return res.status(404).json({ error: "Website not found" })
    }

    res.json({ website })
  } catch (error) {
    console.error("Get website error:", error)
    res.status(500).json({ error: "Failed to fetch website" })
  }
})

// Ask question about website
router.post(
  "/:id/ask",
  auth,
  [body("question").trim().isLength({ min: 1 }).withMessage("Question is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { question } = req.body

      const website = await Website.findOne({
        _id: req.params.id,
        userId: req.user._id,
      })

      if (!website) {
        return res.status(404).json({ error: "Website not found" })
      }

      if (website.processingStatus !== "completed") {
        return res.status(400).json({ error: "Website is still being processed" })
      }

      // Get the associated chat
      const chat = await Chat.findById(website.chatId)
      if (!chat) {
        return res.status(404).json({ error: "Associated chat not found" })
      }

      // Generate response using website context
      const contextPrompt = `Based on the website "${website.title}" (${website.url}), please answer the following question: ${question}`

      const geminiResponse = await geminiService.generateChatResponse(
        [{ role: "user", content: contextPrompt }],
        website.extractedContent,
      )

      // Add messages to chat
      chat.messages.push(
        {
          role: "user",
          content: question,
        },
        {
          role: "assistant",
          content: geminiResponse,
        },
      )

      await chat.save()

      res.json({
        question,
        answer: geminiResponse,
        chatId: chat._id,
      })
    } catch (error) {
      console.error("Website question error:", error)
      res.status(500).json({ error: "Failed to process question" })
    }
  },
)

// Delete website
router.delete("/:id", auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!website) {
      return res.status(404).json({ error: "Website not found" })
    }

    // Delete associated chat
    if (website.chatId) {
      await Chat.findByIdAndDelete(website.chatId)
    }

    await Website.findByIdAndDelete(req.params.id)

    res.json({ message: "Website deleted successfully" })
  } catch (error) {
    console.error("Website deletion error:", error)
    res.status(500).json({ error: "Failed to delete website" })
  }
})

module.exports = router
