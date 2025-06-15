const express = require("express")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const { body, validationResult } = require("express-validator")
const User = require("../models/User")
const emailService = require("../services/emailService")
const auth = require("../middleware/auth")

const router = express.Router()

// Register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { email, password } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" })
      }

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString("hex")
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Create user
      const user = new User({
        email,
        password,
        emailVerificationToken,
        emailVerificationExpires,
      })

      await user.save()

      // Send verification email
      await emailService.sendVerificationEmail(email, emailVerificationToken)

      res.status(201).json({
        message: "User registered successfully. Please check your email to verify your account.",
        userId: user._id,
      })
    } catch (error) {
      console.error("Registration error:", error)
      res.status(500).json({ error: "Server error during registration" })
    }
  },
)

// Verify Email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: "Verification token is required" })
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token" })
    }

    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    user.emailVerificationExpires = undefined
    await user.save()

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    })

    res.json({
      message: "Email verified successfully",
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    })
  } catch (error) {
    console.error("Email verification error:", error)
    res.status(500).json({ error: "Server error during email verification" })
  }
})

// Login
router.post("/login", [body("email").isEmail().normalizeEmail(), body("password").exists()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ error: "Please verify your email before logging in" })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "7d" })

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Server error during login" })
  }
})

// Get current user
router.get("/me", auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      isEmailVerified: req.user.isEmailVerified,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin,
    },
  })
})

// Request password reset
router.post("/forgot-password", [body("email").isEmail().normalizeEmail()], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email } = req.body
    const user = await User.findOne({ email })

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    user.resetPasswordToken = resetToken
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken)

    res.json({ message: "If an account with that email exists, a password reset link has been sent." })
  } catch (error) {
    console.error("Password reset request error:", error)
    res.status(500).json({ error: "Server error during password reset request" })
  }
})

// Reset password
router.post("/reset-password", [body("token").exists(), body("password").isLength({ min: 6 })], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { token, password } = req.body

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" })
    }

    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    res.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Password reset error:", error)
    res.status(500).json({ error: "Server error during password reset" })
  }
})

module.exports = router
