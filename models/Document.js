const mongoose = require("mongoose")

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    extractedText: String,
    summary: String,
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    processingError: String,
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Document", documentSchema)
