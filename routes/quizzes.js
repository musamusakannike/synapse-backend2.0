const express = require("express")
const { body, validationResult } = require("express-validator")
const auth = require("../middleware/auth")
const Quiz = require("../models/Quiz")
const Topic = require("../models/Topic")
const Document = require("../models/Document")
const Website = require("../models/Website")
const geminiService = require("../services/geminiService")

const router = express.Router()

// Generate quiz from topic
router.post(
  "/from-topic/:topicId",
  auth,
  [
    body("settings.numberOfQuestions").optional().isInt({ min: 1, max: 50 }),
    body("settings.difficulty").optional().isIn(["easy", "medium", "hard", "mixed"]),
    body("settings.includeCalculations").optional().isBoolean(),
    body("settings.timeLimit").optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const topic = await Topic.findOne({
        _id: req.params.topicId,
        userId: req.user._id,
      })

      if (!topic) {
        return res.status(404).json({ error: "Topic not found" })
      }

      const defaultSettings = {
        numberOfQuestions: 10,
        difficulty: "mixed",
        includeCalculations: false,
        timeLimit: null,
      }

      const settings = { ...defaultSettings, ...req.body.settings }

      // Generate quiz using Gemini
      const content = topic.generatedContent || topic.content
      const quizData = await geminiService.generateQuiz(content, settings)

      // Create quiz
      const quiz = new Quiz({
        userId: req.user._id,
        title: quizData.title || `Quiz: ${topic.title}`,
        description: `Generated from topic: ${topic.title}`,
        sourceType: "topic",
        sourceId: topic._id,
        sourceModel: "Topic",
        questions: quizData.questions,
        settings,
      })

      await quiz.save()

      res.status(201).json({
        message: "Quiz generated successfully",
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          sourceType: quiz.sourceType,
          questions: quiz.questions,
          settings: quiz.settings,
          createdAt: quiz.createdAt,
        },
      })
    } catch (error) {
      console.error("Quiz generation from topic error:", error)
      res.status(500).json({ error: "Failed to generate quiz from topic" })
    }
  },
)

// Generate quiz from document
router.post(
  "/from-document/:documentId",
  auth,
  [
    body("settings.numberOfQuestions").optional().isInt({ min: 1, max: 50 }),
    body("settings.difficulty").optional().isIn(["easy", "medium", "hard", "mixed"]),
    body("settings.includeCalculations").optional().isBoolean(),
    body("settings.timeLimit").optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const document = await Document.findOne({
        _id: req.params.documentId,
        userId: req.user._id,
      })

      if (!document) {
        return res.status(404).json({ error: "Document not found" })
      }

      if (document.processingStatus !== "completed") {
        return res.status(400).json({ error: "Document is still being processed" })
      }

      const defaultSettings = {
        numberOfQuestions: 10,
        difficulty: "mixed",
        includeCalculations: false,
        timeLimit: null,
      }

      const settings = { ...defaultSettings, ...req.body.settings }

      // Generate quiz using Gemini
      const content = document.extractedText
      const quizData = await geminiService.generateQuiz(content, settings)

      // Create quiz
      const quiz = new Quiz({
        userId: req.user._id,
        title: quizData.title || `Quiz: ${document.originalName}`,
        description: `Generated from document: ${document.originalName}`,
        sourceType: "document",
        sourceId: document._id,
        sourceModel: "Document",
        questions: quizData.questions,
        settings,
      })

      await quiz.save()

      res.status(201).json({
        message: "Quiz generated successfully",
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          sourceType: quiz.sourceType,
          questions: quiz.questions,
          settings: quiz.settings,
          createdAt: quiz.createdAt,
        },
      })
    } catch (error) {
      console.error("Quiz generation from document error:", error)
      res.status(500).json({ error: "Failed to generate quiz from document" })
    }
  },
)

// Generate quiz from website
router.post(
  "/from-website/:websiteId",
  auth,
  [
    body("settings.numberOfQuestions").optional().isInt({ min: 1, max: 50 }),
    body("settings.difficulty").optional().isIn(["easy", "medium", "hard", "mixed"]),
    body("settings.includeCalculations").optional().isBoolean(),
    body("settings.timeLimit").optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const website = await Website.findOne({
        _id: req.params.websiteId,
        userId: req.user._id,
      })

      if (!website) {
        return res.status(404).json({ error: "Website not found" })
      }

      if (website.processingStatus !== "completed") {
        return res.status(400).json({ error: "Website is still being processed" })
      }

      const defaultSettings = {
        numberOfQuestions: 10,
        difficulty: "mixed",
        includeCalculations: false,
        timeLimit: null,
      }

      const settings = { ...defaultSettings, ...req.body.settings }

      // Generate quiz using Gemini
      const content = website.extractedContent
      const quizData = await geminiService.generateQuiz(content, settings)

      // Create quiz
      const quiz = new Quiz({
        userId: req.user._id,
        title: quizData.title || `Quiz: ${website.title || website.url}`,
        description: `Generated from website: ${website.url}`,
        sourceType: "website",
        sourceId: website._id,
        sourceModel: "Website",
        questions: quizData.questions,
        settings,
      })

      await quiz.save()

      res.status(201).json({
        message: "Quiz generated successfully",
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          sourceType: quiz.sourceType,
          questions: quiz.questions,
          settings: quiz.settings,
          createdAt: quiz.createdAt,
        },
      })
    } catch (error) {
      console.error("Quiz generation from website error:", error)
      res.status(500).json({ error: "Failed to generate quiz from website" })
    }
  },
)

// Get user's quizzes
router.get("/", auth, async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const quizzes = await Quiz.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-questions.explanation -attempts") // Exclude detailed data for list view

    const total = await Quiz.countDocuments({ userId: req.user._id })

    res.json({
      quizzes,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    })
  } catch (error) {
    console.error("Get quizzes error:", error)
    res.status(500).json({ error: "Failed to fetch quizzes" })
  }
})

// Get specific quiz
router.get("/:id", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" })
    }

    res.json({ quiz })
  } catch (error) {
    console.error("Get quiz error:", error)
    res.status(500).json({ error: "Failed to fetch quiz" })
  }
})

// Start quiz attempt (returns questions without correct answers)
router.post("/:id/start", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" })
    }

    // Return questions without correct answers and explanations
    const questionsForAttempt = quiz.questions.map((q, index) => ({
      index,
      questionText: q.questionText,
      options: q.options,
      difficulty: q.difficulty,
      includesCalculation: q.includesCalculation,
    }))

    res.json({
      quizId: quiz._id,
      title: quiz.title,
      description: quiz.description,
      settings: quiz.settings,
      questions: questionsForAttempt,
      totalQuestions: quiz.questions.length,
    })
  } catch (error) {
    console.error("Start quiz error:", error)
    res.status(500).json({ error: "Failed to start quiz" })
  }
})

// Submit quiz attempt
router.post(
  "/:id/submit",
  auth,
  [
    body("answers").isArray().withMessage("Answers must be an array"),
    body("answers.*.questionIndex").isInt({ min: 0 }),
    body("answers.*.selectedOption").isInt({ min: 0, max: 3 }),
    body("answers.*.timeSpent").optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { answers } = req.body

      const quiz = await Quiz.findOne({
        _id: req.params.id,
        userId: req.user._id,
      })

      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" })
      }

      // Calculate score
      let correctAnswers = 0
      const detailedResults = answers.map((answer) => {
        const question = quiz.questions[answer.questionIndex]
        const isCorrect = question.correctOption === answer.selectedOption
        if (isCorrect) correctAnswers++

        return {
          questionIndex: answer.questionIndex,
          selectedOption: answer.selectedOption,
          correctOption: question.correctOption,
          isCorrect,
          timeSpent: answer.timeSpent || 0,
          explanation: question.explanation,
        }
      })

      const score = Math.round((correctAnswers / quiz.questions.length) * 100)

      // Save attempt
      const attempt = {
        attemptedAt: new Date(),
        answers: answers.map((a) => ({
          questionIndex: a.questionIndex,
          selectedOption: a.selectedOption,
          isCorrect: quiz.questions[a.questionIndex].correctOption === a.selectedOption,
          timeSpent: a.timeSpent || 0,
        })),
        score,
        totalQuestions: quiz.questions.length,
        completedAt: new Date(),
      }

      quiz.attempts.push(attempt)
      await quiz.save()

      res.json({
        message: "Quiz submitted successfully",
        results: {
          score,
          correctAnswers,
          totalQuestions: quiz.questions.length,
          percentage: score,
          detailedResults,
          attemptId: quiz.attempts[quiz.attempts.length - 1]._id,
        },
      })
    } catch (error) {
      console.error("Submit quiz error:", error)
      res.status(500).json({ error: "Failed to submit quiz" })
    }
  },
)

// Get quiz attempts
router.get("/:id/attempts", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select("title attempts")

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" })
    }

    res.json({
      quizTitle: quiz.title,
      attempts: quiz.attempts.map((attempt) => ({
        id: attempt._id,
        attemptedAt: attempt.attemptedAt,
        completedAt: attempt.completedAt,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
      })),
    })
  } catch (error) {
    console.error("Get quiz attempts error:", error)
    res.status(500).json({ error: "Failed to fetch quiz attempts" })
  }
})

// Delete quiz
router.delete("/:id", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" })
    }

    await Quiz.findByIdAndDelete(req.params.id)

    res.json({ message: "Quiz deleted successfully" })
  } catch (error) {
    console.error("Quiz deletion error:", error)
    res.status(500).json({ error: "Failed to delete quiz" })
  }
})

module.exports = router
