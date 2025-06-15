const express = require("express")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const Topic = require("../models/Topic")
const Chat = require("../models/Chat")
const geminiService = require("../services/geminiService")

const router = express.Router()

// Create topic explanation
router.post(
  "/",
  auth,
  [
    body("title").trim().isLength({ min: 1 }).withMessage("Title is required"),
    body("content").trim().isLength({ min: 1 }).withMessage("Content is required"),
    body("customizations.level").optional().isIn(["beginner", "intermediate", "expert"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, description, content, customizations = {} } = req.body

      // Set default customizations
      const defaultCustomizations = {
        level: "intermediate",
        includeCalculations: false,
        includePracticeQuestions: false,
        includeExamples: true,
        includeApplications: false,
        focusAreas: [],
        additionalRequirements: "",
      }

      const finalCustomizations = { ...defaultCustomizations, ...customizations }

      // Create topic
      const topic = new Topic({
        userId: req.user._id,
        title,
        description,
        content,
        customizations: finalCustomizations,
      })

      // Generate explanation using Gemini
      const generatedContent = await geminiService.generateTopicExplanation(content, finalCustomizations)
      topic.generatedContent = generatedContent

      // Create associated chat
      const chat = new Chat({
        userId: req.user._id,
        title: `Topic: ${title}`,
        type: "topic",
        sourceId: topic._id,
        sourceModel: "Topic",
        messages: [
          {
            role: "user",
            content: `Explain the topic: ${content}`,
            metadata: { customizations: finalCustomizations },
          },
          {
            role: "assistant",
            content: generatedContent,
          },
        ],
      })

      await topic.save()
      chat.sourceId = topic._id
      await chat.save()

      topic.chatId = chat._id
      await topic.save()

      res.status(201).json({
        message: "Topic explanation generated successfully",
        topic: {
          id: topic._id,
          title: topic.title,
          description: topic.description,
          content: topic.content,
          customizations: topic.customizations,
          generatedContent: topic.generatedContent,
          chatId: topic.chatId,
          createdAt: topic.createdAt,
        },
      })
    } catch (error) {
      console.error("Topic creation error:", error)
      res.status(500).json({ error: "Failed to generate topic explanation" })
    }
  },
)

// Get user's topics
router.get("/", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const topics = await Topic.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-generatedContent") // Exclude large content for list view

    const total = await Topic.countDocuments({ userId: req.user._id })

    res.json({
      topics,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Get topics error:", error)
    res.status(500).json({ error: "Failed to fetch topics" })
  }
})

// Get specific topic
router.get("/:id", auth, async (req, res) => {
  try {
    const topic = await Topic.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" })
    }

    res.json({ topic })
  } catch (error) {
    console.error("Get topic error:", error)
    res.status(500).json({ error: "Failed to fetch topic" })
  }
})

// Update topic
router.put(
  "/:id",
  auth,
  [
    body("title").optional().trim().isLength({ min: 1 }),
    body("content").optional().trim().isLength({ min: 1 }),
    body("customizations.level").optional().isIn(["beginner", "intermediate", "expert"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const topic = await Topic.findOne({
        _id: req.params.id,
        userId: req.user._id,
      })

      if (!topic) {
        return res.status(404).json({ error: "Topic not found" })
      }

      const { title, description, content, customizations } = req.body

      // Update fields if provided
      if (title) topic.title = title
      if (description !== undefined) topic.description = description
      if (content) topic.content = content
      if (customizations) {
        topic.customizations = { ...topic.customizations, ...customizations }
      }

      // Regenerate content if content or customizations changed
      if (content || customizations) {
        const generatedContent = await geminiService.generateTopicExplanation(topic.content, topic.customizations)
        topic.generatedContent = generatedContent

        // Update chat title if title changed
        if (title && topic.chatId) {
          await Chat.findByIdAndUpdate(topic.chatId, {
            title: `Topic: ${title}`,
          })
        }
      }

      await topic.save()

      res.json({
        message: "Topic updated successfully",
        topic,
      })
    } catch (error) {
      console.error("Topic update error:", error)
      res.status(500).json({ error: "Failed to update topic" })
    }
  },
)

// Delete topic
router.delete("/:id", auth, async (req, res) => {
  try {
    const topic = await Topic.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" })
    }

    // Delete associated chat
    if (topic.chatId) {
      await Chat.findByIdAndDelete(topic.chatId)
    }

    await Topic.findByIdAndDelete(req.params.id)

    res.json({ message: "Topic deleted successfully" })
  } catch (error) {
    console.error("Topic deletion error:", error)
    res.status(500).json({ error: "Failed to delete topic" })
  }
})

module.exports = router
