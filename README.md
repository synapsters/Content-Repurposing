# ContentAI - AI-Powered Content Repurposing & Localization Platform

A comprehensive Next.js application that transforms existing content (lectures, case studies, assignments) into multiple formats using AI, with support for regional languages and interactive content generation.

## 🚀 Features

### Core Functionality
- **Content Management System**: Upload and manage video, text, and document assets
- **AI-Powered Content Generation**: 
  - Smart Summaries
  - Interactive Quizzes
  - Case Studies
  - Short-form Lectures
  - Flashcards
- **Multi-language Localization**: Support for 12+ languages with automatic translation
- **Video Player**: Custom video player with full controls and progress tracking
- **Publishing System**: Publish and manage generated content with versioning

### AI Content Types

1. **📝 Summaries**: Comprehensive summaries that highlight key points and main concepts
2. **❓ Quizzes**: Interactive multiple-choice questions with explanations
3. **📚 Case Studies**: Practical scenarios with challenges and learning objectives
4. **🎥 Short Lectures**: Engaging, condensed lecture formats
5. **🃏 Flashcards**: Quick review cards for memorization and study

### Supported Languages
- English 🇺🇸
- Spanish 🇪🇸
- French 🇫🇷
- German 🇩🇪
- Italian 🇮🇹
- Portuguese 🇵🇹
- Russian 🇷🇺
- Japanese 🇯🇵
- Korean 🇰🇷
- Chinese 🇨🇳
- Hindi 🇮🇳
- Arabic 🇸🇦

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Google Gemini Flash Model
- **Video Player**: React Player
- **File Upload**: React Dropzone
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)
- Google AI API Key (for Gemini)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hacthon-new
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/content-repurposing

# Google Gemini AI
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# NextAuth (optional for future authentication)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# File Upload
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=100000000
```

### 3. Database Setup

Make sure MongoDB is running locally or provide a cloud MongoDB URI.

### 4. Get Google AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file

### 5. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Creating a Program

1. **Navigate to Programs**: Click "Programs" in the navigation
2. **Create New Program**: Click "Create Program" button
3. **Fill Details**: Add title, description, tags, and supported languages
4. **Add Assets**: Upload videos, documents, or add text content
5. **Save Program**: Click "Create Program" to save

### Generating AI Content

1. **Open Program**: Click on any program from the programs list
2. **Select Asset**: Choose an asset from the right sidebar
3. **Choose Generation Type**: Click on any of the 5 generation options:
   - Create Summary
   - Create Quiz
   - Create Case Study
   - Create Short Lecture
   - Create Flashcards
4. **Select Languages**: Choose target languages for localization
5. **Generate**: Click "Generate" and wait for AI processing
6. **Review & Publish**: Review generated content and publish when ready

### Managing Content

- **View Generated Content**: Switch to "Generated" tab in program view
- **Regenerate**: Click the refresh icon to regenerate any content
- **Publish/Unpublish**: Toggle content visibility
- **Export**: Download generated content in various formats

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── programs/      # Program CRUD operations
│   │   ├── generate-content/  # AI content generation
│   │   └── regenerate-content/ # Content regeneration
│   ├── programs/          # Program pages
│   │   ├── create/        # Program creation
│   │   └── [id]/          # Individual program view
│   └── page.tsx           # Dashboard
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── ui/               # UI components
│   ├── VideoPlayer.tsx   # Custom video player
│   └── ContentGenerator.tsx # AI content generation
├── lib/                  # Utility libraries
│   ├── mongodb.ts        # Database connection
│   ├── ai-service.ts     # AI integration
│   └── utils.ts          # Helper functions
├── models/               # Database models
│   ├── Program.ts        # Program schema
│   └── User.ts           # User schema
└── types/                # TypeScript definitions
```

## 🎯 Key Features Explained

### AI Content Generation

The platform uses Google's Gemini Flash model to generate various types of content:

- **Smart Prompting**: Each content type has specialized prompts for optimal results
- **Structured Output**: AI responses are parsed into structured formats (JSON for quizzes, flashcards)
- **Context Awareness**: Generated content maintains context from source material
- **Multi-language Support**: Content can be generated in multiple languages simultaneously

### Video Integration

- **Custom Player**: Built-in video player with full controls
- **Progress Tracking**: Track viewing progress and duration
- **Multiple Formats**: Support for MP4, AVI, MOV, and more
- **Responsive Design**: Works on all device sizes

### Content Management

- **Asset Organization**: Organize content by programs and asset types
- **Version Control**: Track content generation and regeneration
- **Publishing Workflow**: Draft → Review → Publish workflow
- **Bulk Operations**: Generate content for multiple languages at once

## 🔧 API Endpoints

### Programs
- `GET /api/programs` - List all programs
- `POST /api/programs` - Create new program
- `GET /api/programs/[id]` - Get specific program
- `PUT /api/programs/[id]` - Update program
- `DELETE /api/programs/[id]` - Delete program

### Content Generation
- `POST /api/generate-content` - Generate new AI content
- `POST /api/regenerate-content` - Regenerate existing content

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface with gradient accents
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Dark Mode Support**: Automatic dark/light mode based on system preference
- **Loading States**: Smooth loading animations and progress indicators
- **Interactive Elements**: Hover effects, transitions, and micro-interactions
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS
- Google Cloud
- DigitalOcean

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code comments for implementation details

## 🎯 Future Enhancements

- **Authentication System**: User accounts and role-based access
- **Analytics Dashboard**: Content performance metrics
- **Advanced AI Features**: Custom AI models and fine-tuning
- **Collaboration Tools**: Team sharing and commenting
- **API Integration**: Third-party content sources
- **Mobile App**: React Native companion app
- **Advanced Export**: PDF, SCORM, and other formats
- **Real-time Collaboration**: Live editing and sharing

---

Built with ❤️ for the hackathon - transforming education through AI-powered content repurposing.