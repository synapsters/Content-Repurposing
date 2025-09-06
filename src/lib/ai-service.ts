import { GoogleGenerativeAI } from '@google/generative-ai';
import { youtubeService } from './youtube-service';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface ContentGenerationRequest {
    type: 'summary' | 'quiz' | 'case_study' | 'short_lecture' | 'flashcard' | 'audio_track';
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
      - If this is video content, focus on the actual video title, description, and topic
      - Base the summary ONLY on the provided content information
      
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

    async generateAudioTrack(content: string, language: string = 'en'): Promise<string> {
        const prompt = `
      Create an engaging audio narration script for the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Write a natural, conversational narration script suitable for text-to-speech
      - Include appropriate pauses marked with [PAUSE]
      - Add emphasis markers like [EMPHASIS] for important points
      - Structure it with clear introduction, main content, and conclusion
      - Keep sentences at moderate length for clear pronunciation
      - Add breathing spaces and natural flow
      - Include tone guidance like [FRIENDLY TONE] or [SERIOUS TONE] where appropriate
      - Make it engaging and educational
      - Duration should be approximately 3-5 minutes when narrated
      - If this is video content, create narration that complements the visual elements
      
      Format the response as a clean narration script with timing and tone markers.
      `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateContent(request: ContentGenerationRequest): Promise<string | QuizQuestion[] | FlashCard[] | CaseStudy> {
        const { type, sourceContent, language, additionalContext } = request;

        // Enhanced content processing for different source types
        let processedContent = sourceContent;

        // If it's a YouTube URL, fetch actual video information
        if (sourceContent.includes('youtube.com') || sourceContent.includes('youtu.be')) {
            console.log('🎥 YOUTUBE URL DETECTED! Fetching video information for:', sourceContent);
            console.log('🔍 Source content type check:', typeof sourceContent, sourceContent.length);

            try {
                const videoInfo = await youtubeService.getVideoInfo(sourceContent);
                if (videoInfo) {
                    processedContent = youtubeService.formatVideoInfoForAI(videoInfo);
                    console.log('✅ YouTube video info fetched successfully!');
                    console.log('📝 Video title:', videoInfo.title);
                    console.log('📄 Processed content preview:', processedContent.substring(0, 200) + '...');
                } else {
                    processedContent = `YouTube Video URL: ${sourceContent}\n\nNote: Could not fetch video details. Please generate ${type} based on general educational video content principles.`;
                    console.warn('⚠️ Could not fetch YouTube video info for:', sourceContent);
                }
            } catch (error) {
                console.error('❌ Error fetching YouTube video info:', error);
                processedContent = `YouTube Video URL: ${sourceContent}\n\nNote: Error fetching video details. Please generate ${type} based on general educational video content principles.`;
            }
        }
        // If it's another video URL
        else if (sourceContent.match(/\.(mp4|avi|mov|wmv|webm)$/i) || sourceContent.startsWith('http')) {
            console.log('🔍 NOT a YouTube URL but is a video URL. Source content:', sourceContent.substring(0, 100) + '...');
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

            case 'audio_track':
                return await this.generateAudioTrack(contextualContent, language);

            default:
                throw new Error(`Unsupported content type: ${type}`);
        }
    }
}

export const aiGenerator = new AIContentGenerator();
