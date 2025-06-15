const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai")

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    this.safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ]
  }

  async generateTopicExplanation(topic, customizations) {
    const prompt = this.buildTopicPrompt(topic, customizations)

    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        safetySettings: this.safetySettings,
      })

      const response = await result.response
      return response.text()
    } catch (error) {
      console.error("Error generating topic explanation:", error)
      throw new Error("Failed to generate topic explanation")
    }
  }

  async processDocument(fileBuffer, mimeType, prompt) {
    try {
      let documentPart

      if (mimeType === "application/pdf") {
        documentPart = {
          inlineData: {
            data: Buffer.from(fileBuffer).toString("base64"),
            mimeType,
          },
        }
      } else {
        // For text content (already extracted from DOCX)
        documentPart = { text: fileBuffer.toString() }
      }

      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [documentPart, { text: prompt }],
          },
        ],
        safetySettings: this.safetySettings,
      })

      const response = await result.response
      return response.text()
    } catch (error) {
      console.error("Error processing document:", error)
      throw new Error("Failed to process document")
    }
  }

  async generateQuiz(content, settings) {
    const prompt = this.buildQuizPrompt(content, settings)

    try {
      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
        safetySettings: this.safetySettings,
      })

      const response = await result.response
      const jsonText = response.text()
      return JSON.parse(jsonText)
    } catch (error) {
      console.error("Error generating quiz:", error)
      throw new Error("Failed to generate quiz")
    }
  }

  async generateChatResponse(messages, context = "") {
    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }))

      if (context) {
        conversationHistory.unshift({
          role: "user",
          parts: [{ text: `Context: ${context}` }],
        })
      }

      const result = await this.model.generateContent({
        contents: conversationHistory,
        safetySettings: this.safetySettings,
      })

      const response = await result.response
      return response.text()
    } catch (error) {
      console.error("Error generating chat response:", error)
      throw new Error("Failed to generate chat response")
    }
  }

  buildTopicPrompt(topic, customizations) {
    let prompt = `Please provide a comprehensive explanation of the topic: "${topic}"\n\n`

    prompt += `Customize the explanation for the following requirements:\n`
    prompt += `- Level: ${customizations.level}\n`

    if (customizations.includeCalculations) {
      prompt += `- Include relevant calculations and mathematical examples\n`
    }

    if (customizations.includePracticeQuestions) {
      prompt += `- Include practice questions at the end\n`
    }

    if (customizations.includeExamples) {
      prompt += `- Include practical examples and real-world applications\n`
    }

    if (customizations.includeApplications) {
      prompt += `- Focus on practical applications and use cases\n`
    }

    if (customizations.focusAreas && customizations.focusAreas.length > 0) {
      prompt += `- Focus specifically on these areas: ${customizations.focusAreas.join(", ")}\n`
    }

    if (customizations.additionalRequirements) {
      prompt += `- Additional requirements: ${customizations.additionalRequirements}\n`
    }

    prompt += `\nPlease structure the response with clear headings and make it engaging and educational.`

    return prompt
  }

  buildQuizPrompt(content, settings) {
    let prompt = `Based on the following content, generate a quiz with exactly ${settings.numberOfQuestions} questions.\n\n`
    prompt += `Content: ${content}\n\n`

    prompt += `Quiz Requirements:\n`
    prompt += `- Difficulty: ${settings.difficulty}\n`
    prompt += `- Include calculations: ${settings.includeCalculations ? "Yes" : "No"}\n`

    prompt += `\nReturn the quiz in the following JSON format:\n`
    prompt += `{
      "title": "Quiz Title",
      "questions": [
        {
          "questionText": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctOption": 0,
          "explanation": "Explanation for the correct answer",
          "difficulty": "easy|medium|hard",
          "includesCalculation": true|false
        }
      ]
    }\n\n`

    prompt += `Make sure each question has exactly 4 options, and the correctOption index is 0-based (0, 1, 2, or 3).`

    return prompt
  }
}

module.exports = new GeminiService()
