const express = require("express")
const multer = require("multer")
const fs = require("fs").promises
const path = require("path")
const pdfParse = require("pdf-parse")
const mammoth = require("mammoth")
const auth = require("../middleware/auth")
const Document = require("../models/Document")
const Chat = require("../models/Chat")
const geminiService = require("../services/geminiService")

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"), false)
    }
  },
})

// Helper function to extract text from documents
async function extractTextFromDocument(filePath, mimeType) {
  try {
    if (mimeType === "application/pdf") {
      const fileBuffer = await fs.readFile(filePath)
      const pdfData = await pdfParse(fileBuffer)
      return pdfData.text
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const fileBuffer = await fs.readFile(filePath)
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      return result.value
    }
    throw new Error("Unsupported file type")
  } catch (error) {
    console.error("Text extraction error:", error)
    throw error
  }
}

// Upload and process document
router.post("/upload", auth, upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document uploaded" })
    }

    const { prompt = "Please summarize this document and provide key insights." } = req.body

    // Create document record
    const document = new Document({
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filePath: req.file.path,
      processingStatus: "processing",
    })

    await document.save()

    try {
      // Extract text for storage
      const extractedText = await extractTextFromDocument(req.file.path, req.file.mimetype)
      document.extractedText = extractedText

      // Process with Gemini
      let geminiResponse
      if (req.file.mimetype === "application/pdf") {
        // Send PDF directly to Gemini
        const fileBuffer = await fs.readFile(req.file.path)
        geminiResponse = await geminiService.processDocument(fileBuffer, req.file.mimetype, prompt)
      } else {
        // Send extracted text for DOCX
        geminiResponse = await geminiService.processDocument(Buffer.from(extractedText), "text/plain", prompt)
      }

      document.summary = geminiResponse
      document.processingStatus = "completed"

      // Create associated chat
      const chat = new Chat({
        userId: req.user._id,
        title: `Document: ${req.file.originalname}`,
        type: "document",
        sourceId: document._id,
        sourceModel: "Document",
        messages: [
          {
            role: "user",
            content: prompt,
            metadata: {
              documentName: req.file.originalname,
              documentSize: req.file.size,
            },
          },
          {
            role: "assistant",
            content: geminiResponse,
          },
        ],
      })

      await chat.save()
      document.chatId = chat._id
      await document.save()

      res.status(201).json({
        message: "Document processed successfully",
        document: {
          id: document._id,
          originalName: document.originalName,
          size: document.size,
          summary: document.summary,
          chatId: document.chatId,
          processingStatus: document.processingStatus,
          createdAt: document.createdAt,
        },
      })
    } catch (processingError) {
      console.error("Document processing error:", processingError)
      document.processingStatus = "failed"
      document.processingError = processingError.message
      await document.save()

      res.status(500).json({
        error: "Failed to process document",
        documentId: document._id,
      })
    }
  } catch (error) {
    console.error("Document upload error:", error)

    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting uploaded file:", unlinkError)
      }
    }

    res.status(500).json({ error: "Failed to upload document" })
  }
})

// Get user's documents
router.get("/", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-extractedText -filePath") // Exclude large fields

    const total = await Document.countDocuments({ userId: req.user._id })

    res.json({
      documents,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Get documents error:", error)
    res.status(500).json({ error: "Failed to fetch documents" })
  }
})

// Get specific document
router.get("/:id", auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select("-filePath") // Don't expose file path

    if (!document) {
      return res.status(404).json({ error: "Document not found" })
    }

    res.json({ document })
  } catch (error) {
    console.error("Get document error:", error)
    res.status(500).json({ error: "Failed to fetch document" })
  }
})

// Ask question about document
router.post("/:id/ask", auth, async (req, res) => {
  try {
    const { question } = req.body

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question is required" })
    }

    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!document) {
      return res.status(404).json({ error: "Document not found" })
    }

    if (document.processingStatus !== "completed") {
      return res.status(400).json({ error: "Document is still being processed" })
    }

    // Get the associated chat
    const chat = await Chat.findById(document.chatId)
    if (!chat) {
      return res.status(404).json({ error: "Associated chat not found" })
    }

    // Generate response using document context
    const contextPrompt = `Based on the document "${document.originalName}", please answer the following question: ${question}`

    let geminiResponse
    if (document.mimeType === "application/pdf") {
      // For PDF, use the original file
      const fileBuffer = await fs.readFile(document.filePath)
      geminiResponse = await geminiService.processDocument(fileBuffer, document.mimeType, contextPrompt)
    } else {
      // For DOCX, use extracted text
      geminiResponse = await geminiService.processDocument(
        Buffer.from(document.extractedText),
        "text/plain",
        contextPrompt,
      )
    }

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
    console.error("Document question error:", error)
    res.status(500).json({ error: "Failed to process question" })
  }
})

// Delete document
router.delete("/:id", auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!document) {
      return res.status(404).json({ error: "Document not found" })
    }

    // Delete associated chat
    if (document.chatId) {
      await Chat.findByIdAndDelete(document.chatId)
    }

    // Delete physical file
    try {
      await fs.unlink(document.filePath)
    } catch (fileError) {
      console.error("Error deleting physical file:", fileError)
      // Continue with database deletion even if file deletion fails
    }

    await Document.findByIdAndDelete(req.params.id)

    res.json({ message: "Document deleted successfully" })
  } catch (error) {
    console.error("Document deletion error:", error)
    res.status(500).json({ error: "Failed to delete document" })
  }
})

module.exports = router
