const fs = require("fs").promises
const path = require("path")

class FileHelpers {
  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath)
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.mkdir(dirPath, { recursive: true })
      } else {
        throw error
      }
    }
  }

  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath)
      console.log(`File deleted: ${filePath}`)
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Error deleting file ${filePath}:`, error)
      }
    }
  }

  static getFileExtension(filename) {
    return path.extname(filename).toLowerCase()
  }

  static isValidFileType(
    mimeType,
    allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ) {
    return allowedTypes.includes(mimeType)
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  static generateUniqueFilename(originalName) {
    const timestamp = Date.now()
    const random = Math.round(Math.random() * 1e9)
    const extension = path.extname(originalName)
    const baseName = path.basename(originalName, extension)

    return `${baseName}-${timestamp}-${random}${extension}`
  }
}

module.exports = FileHelpers
