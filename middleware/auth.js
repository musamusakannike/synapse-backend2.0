const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ error: "Access denied. No token provided." })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ error: "Invalid token. User not found." })
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ error: "Please verify your email before accessing this resource." })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token." })
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired." })
    }
    res.status(500).json({ error: "Server error during authentication." })
  }
}

module.exports = auth
