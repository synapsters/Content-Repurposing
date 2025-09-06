import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface ContentGenerationRequest {
    type: 'summary' | 'quiz' | 'case_study' | 'short_lecture' | 'flashcard';
    sourceContent: string;
    language: string;
    additionalContext?: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
}

export interface FlashCard {
    front: string;
    back: string;
    category: string;
}

export interface CaseStudy {
    title: string;
    scenario: string;
    challenges: string[];
    questions: string[];
    learningObjectives: string[];
}

export class AIContentGenerator {
    private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    async generateSummary(content: string, language: string = 'en'): Promise<string> {
        const prompt = `
      Create a comprehensive summary of the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Keep it concise but comprehensive
      - Highlight key points and main concepts
      - Use bullet points for better readability
      - Maintain the original context and meaning
      
      Please provide only the summary without any additional text.
    `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateQuiz(content: string, language: string = 'en', numQuestions: number = 5): Promise<QuizQuestion[]> {
        const prompt = `
      Create ${numQuestions} multiple-choice quiz questions based on the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Each question should have 4 options
      - Include the correct answer index (0-3)
      - Provide explanations for correct answers
      - Cover different aspects of the content
      - Make questions challenging but fair
      
      Return the response as a JSON array with this structure:
      [
        {
          "question": "Question text",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0,
          "explanation": "Explanation text"
        }
      ]
    `;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            // Clean the response to extract JSON
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Invalid JSON response');
        } catch (error) {
            console.error('Error parsing quiz JSON:', error);
            throw new Error('Failed to generate quiz questions');
        }
    }

    async generateCaseStudy(content: string, language: string = 'en'): Promise<CaseStudy> {
        const prompt = `
      Create a detailed case study based on the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Create a realistic scenario that applies the concepts
      - Include specific challenges that need to be addressed
      - Provide thought-provoking questions for analysis
      - Define clear learning objectives
      - Make it practical and engaging
      
      Return the response as JSON with this structure:
      {
        "title": "Case Study Title",
        "scenario": "Detailed scenario description",
        "challenges": ["Challenge 1", "Challenge 2", "Challenge 3"],
        "questions": ["Question 1", "Question 2", "Question 3"],
        "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"]
      }
    `;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Invalid JSON response');
        } catch (error) {
            console.error('Error parsing case study JSON:', error);
            throw new Error('Failed to generate case study');
        }
    }

    async generateShortLecture(content: string, language: string = 'en'): Promise<string> {
        const prompt = `
      Transform the following content into a short, engaging lecture format in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Create an engaging introduction
      - Break down complex concepts into digestible parts
      - Use examples and analogies where appropriate
      - Include a clear conclusion with key takeaways
      - Keep it concise but informative (5-10 minutes reading time)
      - Use a conversational, educational tone
      
      Please provide only the lecture content without any additional text.
    `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateFlashCards(content: string, language: string = 'en', numCards: number = 10): Promise<FlashCard[]> {
        const prompt = `
      Create ${numCards} flashcards based on the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Each card should have a clear question/term on the front
      - Provide concise, accurate answers on the back
      - Cover key concepts, definitions, and important facts
      - Categorize cards by topic when possible
      - Make them useful for quick review and memorization
      
      Return the response as a JSON array with this structure:
      [
        {
          "front": "Question or term",
          "back": "Answer or definition",
          "category": "Topic category"
        }
      ]
    `;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Invalid JSON response');
        } catch (error) {
            console.error('Error parsing flashcards JSON:', error);
            throw new Error('Failed to generate flashcards');
        }
    }

    async generateContent(request: ContentGenerationRequest): Promise<any> {
        const { type, sourceContent, language, additionalContext } = request;

        // Enhanced content processing for different source types
        let processedContent = sourceContent;

        // If it's a YouTube URL, provide context about video content
        if (sourceContent.includes('youtube.com') || sourceContent.includes('youtu.be')) {
            processedContent = `Video Content from YouTube URL: ${sourceContent}\n\nNote: This is educational video content. Please generate ${type} based on typical educational video content structure and common learning objectives for video-based learning materials.`;
        }
        // If it's another video URL
        else if (sourceContent.match(/\.(mp4|avi|mov|wmv|webm)$/i) || sourceContent.startsWith('http')) {
            processedContent = `Video Content from URL: ${sourceContent}\n\nNote: This is video content. Please generate ${type} based on typical video-based educational content, focusing on visual and auditory learning elements.`;
        }

        const contextualContent = additionalContext
            ? `${processedContent}\n\nAdditional Context: ${additionalContext}`
            : processedContent;

        switch (type) {
            case 'summary':
                return await this.generateSummary(contextualContent, language);

            case 'quiz':
                return await this.generateQuiz(contextualContent, language);

            case 'case_study':
                return await this.generateCaseStudy(contextualContent, language);

            case 'short_lecture':
                return await this.generateShortLecture(contextualContent, language);

            case 'flashcard':
                return await this.generateFlashCards(contextualContent, language);

            default:
                throw new Error(`Unsupported content type: ${type}`);
        }
    }
}

export const aiGenerator = new AIContentGenerator();
