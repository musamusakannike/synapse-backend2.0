const mongoose = require("mongoose")

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: [
    {
      type: String,
      required: true,
    },
  ],
  correctOption: {
    type: Number,
    required: true,
    min: 0,
  },
  explanation: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  includesCalculation: {
    type: Boolean,
    default: false,
  },
})

const quizSchema = new mongoose.Schema(
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
    sourceType: {
      type: String,
      enum: ["topic", "document", "website"],
      required: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "sourceModel",
    },
    sourceModel: {
      type: String,
      enum: ["Topic", "Document", "Website"],
    },
    questions: [questionSchema],
    settings: {
      numberOfQuestions: {
        type: Number,
        default: 10,
      },
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
      },
      includeCalculations: {
        type: Boolean,
        default: false,
      },
      timeLimit: Number, // in minutes
    },
    attempts: [
      {
        attemptedAt: {
          type: Date,
          default: Date.now,
        },
        answers: [
          {
            questionIndex: Number,
            selectedOption: Number,
            isCorrect: Boolean,
            timeSpent: Number, // in seconds
          },
        ],
        score: Number,
        totalQuestions: Number,
        completedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Quiz", quizSchema)
