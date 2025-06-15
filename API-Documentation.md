# Synapse AI API Documentation

## Overview

Synapse is an AI-powered educational platform that leverages Google's Gemini API to provide intelligent topic explanations, document analysis, quiz generation, and interactive chat functionality. The platform supports multiple content sources including topics, PDF/DOCX documents, and websites.

## Base URL

\`\`\`
http://localhost:3000/api
\`\`\`

## Authentication

The API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## API Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "User registered successfully. Please check your email to verify your account.",
  "userId": "user_id"
}
\`\`\`

#### POST /auth/verify-email
Verify user email address.

**Request Body:**
\`\`\`json
{
  "token": "verification_token"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Email verified successfully",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true
  }
}
\`\`\`

#### POST /auth/login
Login with email and password.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Login successful",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true,
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

#### GET /auth/me
Get current user information. Requires authentication.

**Response:**
\`\`\`json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isEmailVerified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastLogin": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

### Topics

#### POST /topics
Create a new topic explanation with customizations.

**Request Body:**
\`\`\`json
{
  "title": "Machine Learning Basics",
  "description": "Introduction to machine learning concepts",
  "content": "Explain machine learning, its types, and basic algorithms",
  "customizations": {
    "level": "beginner",
    "includeCalculations": false,
    "includePracticeQuestions": true,
    "includeExamples": true,
    "includeApplications": true,
    "focusAreas": ["supervised learning", "unsupervised learning"],
    "additionalRequirements": "Include real-world examples"
  }
}
\`\`\`

**Customization Options:**
- `level`: "beginner", "intermediate", "expert"
- `includeCalculations`: boolean
- `includePracticeQuestions`: boolean
- `includeExamples`: boolean
- `includeApplications`: boolean
- `focusAreas`: array of strings
- `additionalRequirements`: string

**Response:**
\`\`\`json
{
  "message": "Topic explanation generated successfully",
  "topic": {
    "id": "topic_id",
    "title": "Machine Learning Basics",
    "description": "Introduction to machine learning concepts",
    "content": "Explain machine learning...",
    "customizations": {...},
    "generatedContent": "AI-generated explanation...",
    "chatId": "chat_id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

#### GET /topics
Get user's topics with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:**
\`\`\`json
{
  "topics": [...],
  "pagination": {
    "current": 1,
    "pages": 5,
    "total": 50
  }
}
\`\`\`

#### GET /topics/:id
Get specific topic by ID.

#### PUT /topics/:id
Update topic and regenerate content if needed.

#### DELETE /topics/:id
Delete topic and associated chat.

### Documents

#### POST /documents/upload
Upload and process PDF or DOCX document.

**Request:** Multipart form data
- `document`: File (PDF or DOCX)
- `prompt`: Text (optional, default: "Please summarize this document and provide key insights.")

**Response:**
\`\`\`json
{
  "message": "Document processed successfully",
  "document": {
    "id": "document_id",
    "originalName": "document.pdf",
    "size": 1024000,
    "summary": "AI-generated summary...",
    "chatId": "chat_id",
    "processingStatus": "completed",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

#### GET /documents
Get user's documents with pagination.

#### GET /documents/:id
Get specific document by ID.

#### POST /documents/:id/ask
Ask a question about a specific document.

**Request Body:**
\`\`\`json
{
  "question": "What are the main conclusions of this document?"
}
\`\`\`

**Response:**
\`\`\`json
{
  "question": "What are the main conclusions...",
  "answer": "AI-generated answer...",
  "chatId": "chat_id"
}
\`\`\`

#### DELETE /documents/:id
Delete document, associated chat, and physical file.

### Quizzes

#### POST /quizzes/from-topic/:topicId
Generate quiz from a topic.

**Request Body:**
\`\`\`json
{
  "settings": {
    "numberOfQuestions": 10,
    "difficulty": "medium",
    "includeCalculations": false,
    "timeLimit": 30
  }
}
\`\`\`

**Quiz Settings:**
- `numberOfQuestions`: 1-50 (default: 10)
- `difficulty`: "easy", "medium", "hard", "mixed" (default: "mixed")
- `includeCalculations`: boolean (default: false)
- `timeLimit`: minutes (optional)

**Response:**
\`\`\`json
{
  "message": "Quiz generated successfully",
  "quiz": {
    "id": "quiz_id",
    "title": "Quiz: Machine Learning Basics",
    "description": "Generated from topic: Machine Learning Basics",
    "sourceType": "topic",
    "questions": [
      {
        "questionText": "What is machine learning?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctOption": 0,
        "explanation": "Explanation for correct answer",
        "difficulty": "easy",
        "includesCalculation": false
      }
    ],
    "settings": {...},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

#### POST /quizzes/from-document/:documentId
Generate quiz from a document.

#### POST /quizzes/from-website/:websiteId
Generate quiz from a website.

#### GET /quizzes
Get user's quizzes with pagination.

#### GET /quizzes/:id
Get specific quiz by ID.

#### POST /quizzes/:id/start
Start a quiz attempt (returns questions without correct answers).

**Response:**
\`\`\`json
{
  "quizId": "quiz_id",
  "title": "Quiz Title",
  "description": "Quiz description",
  "settings": {...},
  "questions": [
    {
      "index": 0,
      "questionText": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "difficulty": "medium",
      "includesCalculation": false
    }
  ],
  "totalQuestions": 10
}
\`\`\`

#### POST /quizzes/:id/submit
Submit quiz attempt and get results.

**Request Body:**
\`\`\`json
{
  "answers": [
    {
      "questionIndex": 0,
      "selectedOption": 2,
      "timeSpent": 45
    },
    {
      "questionIndex": 1,
      "selectedOption": 0,
      "timeSpent": 30
    }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Quiz submitted successfully",
  "results": {
    "score": 80,
    "correctAnswers": 8,
    "totalQuestions": 10,
    "percentage": 80,
    "detailedResults": [
      {
        "questionIndex": 0,
        "selectedOption": 2,
        "correctOption": 1,
        "isCorrect": false,
        "timeSpent": 45,
        "explanation": "Explanation for correct answer"
      }
    ],
    "attemptId": "attempt_id"
  }
}
\`\`\`

#### GET /quizzes/:id/attempts
Get all attempts for a specific quiz.

#### DELETE /quizzes/:id
Delete quiz.

### Chats

#### GET /chats
Get user's chats with pagination.

**Response:**
\`\`\`json
{
  "chats": [
    {
      "id": "chat_id",
      "title": "Topic: Machine Learning",
      "type": "topic",
      "sourceId": "source_id",
      "sourceModel": "Topic",
      "messageCount": 5,
      "lastMessage": {
        "role": "assistant",
        "content": "Last message preview...",
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      "lastActivity": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
\`\`\`

#### GET /chats/:id
Get specific chat with all messages.

#### POST /chats/:id/message
Send a message to a chat.

**Request Body:**
\`\`\`json
{
  "content": "Can you explain this concept in more detail?"
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Message sent successfully",
  "userMessage": {
    "role": "user",
    "content": "Can you explain this concept in more detail?",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "aiResponse": {
    "role": "assistant",
    "content": "AI-generated response...",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

#### POST /chats/new
Create a new general chat.

**Request Body:**
\`\`\`json
{
  "title": "General Discussion"
}
\`\`\`

#### PUT /chats/:id/title
Update chat title.

#### DELETE /chats/:id
Delete chat (soft delete - marks as inactive).

#### DELETE /chats/:id/messages
Clear all messages from a chat.

### Websites

#### POST /websites/process
Process a website URL using Cheerio for content extraction.

**Request Body:**
\`\`\`json
{
  "url": "https://example.com",
  "prompt": "Please analyze this website and provide key insights about its content."
}
\`\`\`

**Response:**
\`\`\`json
{
  "message": "Website processed successfully",
  "website": {
    "id": "website_id",
    "url": "https://example.com",
    "title": "Website Title",
    "summary": "AI-generated summary...",
    "chatId": "chat_id",
    "processingStatus": "completed",
    "scrapedAt": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

#### GET /websites
Get user's processed websites with pagination.

#### GET /websites/:id
Get specific website by ID.

#### POST /websites/:id/ask
Ask a question about a specific website.

**Request Body:**
\`\`\`json
{
  "question": "What are the main topics covered on this website?"
}
\`\`\`

#### DELETE /websites/:id
Delete website and associated chat.

### Health Check

#### GET /health
Check API health status.

**Response:**
\`\`\`json
{
  "status": "OK",
  "message": "Synapse API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

## Error Responses

All endpoints return consistent error responses:

\`\`\`json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
\`\`\`

Common HTTP status codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15 minutes per IP address
- Rate limit headers are included in responses

## File Upload Limits

- Maximum file size: 50MB
- Supported formats: PDF, DOCX
- Files are automatically deleted after processing

## Environment Variables

Required environment variables:

\`\`\`env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/synapse

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Email Configuration (Gmail)
GMAIL_EMAIL=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
FROM_NAME=Synapse AI

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key-here
\`\`\`

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start MongoDB
5. Run the server: `npm run dev`
6. Import the Postman collection for testing

## Support

For issues and support, please refer to the API documentation or contact the development team.
\`\`\`
