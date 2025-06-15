const mongoose = require("mongoose")

const topicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    content: {
      type: String,
      required: true,
    },
    customizations: {
      level: {
        type: String,
        enum: ["beginner", "intermediate", "expert"],
        default: "intermediate",
      },
      includeCalculations: {
        type: Boolean,
        default: false,
      },
      includePracticeQuestions: {
        type: Boolean,
        default: false,
      },
      includeExamples: {
        type: Boolean,
        default: true,
      },
      includeApplications: {
        type: Boolean,
        default: false,
      },
      focusAreas: [String],
      additionalRequirements: String,
    },
    generatedContent: String,
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Topic", topicSchema)
