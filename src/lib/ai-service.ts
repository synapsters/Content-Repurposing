import { GoogleGenerativeAI } from '@google/generative-ai';
import { youtubeService } from './youtube-service';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface ContentGenerationRequest {
    type: 'summary' | 'quiz' | 'case_study' | 'short_lecture' | 'flashcard' | 'audio_track' | 'video_script';
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

export interface VideoScript {
    title: string;
    description: string;
    duration: string;
    scenes: VideoScene[];
    voiceover: string;
    callToAction: string;
}

export interface VideoScene {
    sceneNumber: number;
    duration: string;
    visualDescription: string;
    voiceoverText: string;
    onScreenText?: string;
    transitions?: string;
}

export class AIContentGenerator {
    private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    async generateSummary(content: string, language: string = 'en'): Promise<string> {
        const prompt = `
      **You are an expert technical content summarizer.**

      **Your primary task is to summarize the technical content provided by the user in ${language} language.**:
      
      **Here are the strict rules for the summary:**
 
      * Include **only** the technical terms and concepts from the user's content.
      * Omit all jargon, filler words, and long-winded explanations.
      * Each technical term should be accompanied by a very short, one-line explanation. A second line is permissible only if the term is critically important and cannot be explained in a single line.
      * The final summary must be between 120 and 150 words.
      * The summary should be presented as a concise, structured list or series of bullet points for maximum clarity.
      
      ---
      Content: ${content}
    `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateQuiz(content: string, language: string = 'en', numQuestions: number = 5): Promise<QuizQuestion[]> {
        const prompt = `
      You are an expert quiz master. Your goal is to generate ${numQuestions} single-choice questions from the technical content provided by the user in ${language} language. These questions should cover the user-provided content comprehensively.
 
        ---
        
        ### **Question Generation Requirements**
        
        1.  **Question Count:** Generate a total of 10 to 15 single-choice questions. Each question must have exactly four options (A, B, C, D), with only one correct answer.
        2.  **Difficulty Distribution:**
            * **Easy/Beginner:** Approximately 30% of the questions should be easy level. These questions should test fundamental knowledge and straightforward concepts.
            * **Medium:** Approximately 50% of the questions should be medium level. These questions should require a deeper understanding and application of the concepts.
            * **Advanced:** Approximately 20% of the questions should be advanced level. These questions should be more complex, possibly requiring critical thinking, problem-solving, or the integration of multiple concepts.
        3.  **Question Variety:** Ensure a mix of question types to avoid monotony:
            * **Straightforward Questions:** These directly test knowledge recall.
            * **Creative Questions:** These might use analogies or ask the user to identify a concept based on a non-obvious description.
            * **Case-Based Questions:** These present a short scenario or problem and ask the user to apply their knowledge to find the best solution.
        4.  **Content Coverage:** The questions must be generated exclusively from the technical content provided by the user. Do not introduce new information or concepts.
        5.  **Output Format:** Present the questions clearly, with the correct answer specified for each.
        
        ---
        
        ### **Example Output Structure**
        
        To maintain consistency and clarity, please use the following format for each question:
        
        CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, no other text.
        
        Use this EXACT structure:
        [
            {
                "question": "Question text",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correctAnswer": 0,
                "explanation": "Explanation text"
            }
        ]
        
        JSON FORMATTING RULES:
        - Use ONLY double quotes, never single quotes
        - Escape quotes inside strings with backslash (\")
        - correctAnswer must be a number (0-3)
        - No trailing commas
        - No comments in JSON
        
        **Explanation: ** A concise explanation for the correct answer.

        ---

        Content: ${content}

    `;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            // Clean the response to extract JSON
            let cleanedResponse = response.trim();

            // Remove markdown code blocks if present
            cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Find JSON array in the response
            const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];

                // Fix common JSON issues
                // Replace single quotes with double quotes (but not inside strings)
                jsonStr = jsonStr.replace(/'/g, '"');

                // Fix escaped quotes that might have been double-escaped
                jsonStr = jsonStr.replace(/\\"/g, '\\"');

                // Try to parse the cleaned JSON
                try {
                    return JSON.parse(jsonStr);
                } catch (parseError) {
                    console.error('JSON parse error, trying fallback:', parseError);
                    console.error('Problematic JSON:', jsonStr.substring(0, 200) + '...');

                    // Fallback: try to fix more complex quote issues
                    jsonStr = this.fixJsonQuotes(jsonStr);
                    return JSON.parse(jsonStr);
                }
            }
            throw new Error('No valid JSON array found in response');
        } catch (error) {
            console.error('Error parsing quiz JSON:', error);
            console.error('Raw response:', response.substring(0, 300) + '...');

            // Return a fallback quiz if parsing fails
            return this.getFallbackQuiz(language);
        }
    }

    private fixJsonQuotes(jsonStr: string): string {
        // More sophisticated quote fixing
        // This is a simple approach - in production, you might want a more robust JSON fixer
        try {
            // Replace problematic patterns
            jsonStr = jsonStr
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Fix unquoted keys
                .replace(/:\s*'([^']*?)'/g, ': "$1"') // Fix single-quoted values
                .replace(/:\s*"([^"]*?)"/g, (match, content) => {
                    // Fix escaped quotes in content
                    const fixedContent = content.replace(/"/g, '\\"');
                    return `: "${fixedContent}"`;
                });

            return jsonStr;
        } catch (error) {
            console.error('Error fixing JSON quotes:', error);
            return jsonStr;
        }
    }

    private getFallbackQuiz(language: string): QuizQuestion[] {
        const fallbackQuestions = {
            en: [
                {
                    question: "What is the main topic of this content?",
                    options: ["Programming", "Technology", "General Knowledge", "Other"],
                    correctAnswer: 0,
                    explanation: "This is a fallback question generated when the AI service encounters an error."
                }
            ],
            fr: [
                {
                    question: "Quel est le sujet principal de ce contenu?",
                    options: ["Programmation", "Technologie", "Connaissances générales", "Autre"],
                    correctAnswer: 0,
                    explanation: "Ceci est une question de secours générée lorsque le service IA rencontre une erreur."
                }
            ],
            es: [
                {
                    question: "¿Cuál es el tema principal de este contenido?",
                    options: ["Programación", "Tecnología", "Conocimiento general", "Otro"],
                    correctAnswer: 0,
                    explanation: "Esta es una pregunta de respaldo generada cuando el servicio de IA encuentra un error."
                }
            ]
        };

        return fallbackQuestions[language as keyof typeof fallbackQuestions] || fallbackQuestions.en;
    }

    private getFallbackFlashCards(language: string): FlashCard[] {
        const fallbackCards = {
            en: [
                {
                    front: "What is the main topic of this content?",
                    back: "This is a fallback flashcard generated when the AI service encounters an error.",
                    category: "General"
                }
            ],
            fr: [
                {
                    front: "Quel est le sujet principal de ce contenu?",
                    back: "Ceci est une carte de révision de secours générée lorsque le service IA rencontre une erreur.",
                    category: "Général"
                }
            ],
            es: [
                {
                    front: "¿Cuál es el tema principal de este contenido?",
                    back: "Esta es una tarjeta de estudio de respaldo generada cuando el servicio de IA encuentra un error.",
                    category: "General"
                }
            ]
        };

        return fallbackCards[language as keyof typeof fallbackCards] || fallbackCards.en;
    }

    async generateCaseStudy(content: string, language: string = 'en'): Promise<CaseStudy> {
        const prompt = `
        You are an expert case study creator. Your task is to generate a comprehensive and practical case study in ${language} language tailored for a specific technology and user-provided content. The case study should be highly relevant and focus on the practical application of the provided material.
 
        Your output must include the following sections:
        
        ### **Case Explanation**
        
        * A brief, engaging, and realistic scenario that sets the context for the problem.
        * Clearly describe the business or real-world situation the learner will be addressing.
        
        ---
        
        ### **Problem Statement**
        
        * A concise and clear statement outlining the core problem the learner needs to solve.
        * The problem should directly relate to the content provided by the user.
        
        ---
        
        ### **Expectations & Deliverables**
        
        * A detailed list of the specific outcomes required from the learner.
        * This section should specify the exact deliverables, such as a project file (.py, .ipynb, .xlsx, etc.) and any additional materials like a presentation deck (e.g., 5 slides).
        * Clearly state what a successful solution should demonstrate (e.g., model accuracy, data insights, functional code, etc.).
        
        ---
        
        ### **Solution Structure**
        
        * A high-level guide on how the learner should approach the problem.
        * Suggest a logical flow, such as "Data Cleaning -> Exploratory Data Analysis -> Model Building -> Visualization."
        * This is not a step-by-step solution but a roadmap to guide their thinking.
        
        ---
        
        ### **File Format(s)**
        
        * Explicitly state the required file format(s) for the submission.
        * Be specific, for example: "A single Jupyter Notebook (.ipynb) file and a PDF of your 5-slide presentation."
        
        ---
        
        Strictly return the response as JSON with this structure:
      {
        "title": "Case Study Title",
        "scenario": "Detailed scenario description",
        "challenges": ["Challenge 1", "Challenge 2", "Challenge 3"],
        "questions": ["Question 1", "Question 2", "Question 3"],
        "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"]
      }

        ---

        Content: ${content}
      
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
        You are a technical content summarization expert. Your task is to analyze and summarize technical learning materials provided by the user in ${language} language.
 
        Your response must meet the following criteria:
        
        * **Structure**: Present the summary in a well-organized, point-by-point format. Use headings and bullet points to ensure clarity and readability.
        * **Accuracy and Completeness**:
            * Thoroughly capture all key technical concepts, topics, and definitions from the original content. Do not omit any technical term.
            * Do not add any new information, examples, or interpretations. Your summary must be derived *exclusively* from the user's provided text.
        * **Clarity**:
            * Rewrite complex technical jargon into simple, easy-to-understand language.
            * Stictly omit all jargons and storylines from the content.
            * Maintain a clear, concise, and professional tone.
        * **Summary Length**:
            * Response should be strictly at-most one-thrid the size of the original data.
        * **Format**: The output should be a clean, direct summary. Do not include any conversational filler, introductory phrases, or concluding remarks. Just provide the summary.
        
        ---

        Content: ${content}
        
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
      
      CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, no other text.
      
      Use this EXACT structure:
      [
        {
          "front": "Question or term",
          "back": "Answer or definition",
          "category": "Topic category"
        }
      ]
      
      JSON FORMATTING RULES:
      - Use ONLY double quotes, never single quotes
      - Escape quotes inside strings with backslash (\")
      - No trailing commas
      - No comments in JSON
    `;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            // Clean the response to extract JSON
            let cleanedResponse = response.trim();

            // Remove markdown code blocks if present
            cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Find JSON array in the response
            const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];

                // Fix common JSON issues
                jsonStr = jsonStr.replace(/'/g, '"');
                jsonStr = jsonStr.replace(/\\"/g, '\\"');

                // Try to parse the cleaned JSON
                try {
                    return JSON.parse(jsonStr);
                } catch (parseError) {
                    console.error('JSON parse error, trying fallback:', parseError);
                    console.error('Problematic JSON:', jsonStr.substring(0, 200) + '...');

                    // Fallback: try to fix more complex quote issues
                    jsonStr = this.fixJsonQuotes(jsonStr);
                    return JSON.parse(jsonStr);
                }
            }
            throw new Error('No valid JSON array found in response');
        } catch (error) {
            console.error('Error parsing flashcards JSON:', error);
            console.error('Raw response:', response.substring(0, 300) + '...');

            // Return a fallback flashcard set if parsing fails
            return this.getFallbackFlashCards(language);
        }
    }

    async generateAudioTrack(content: string, language: string = 'en'): Promise<string> {
        const prompt = `
      Create an engaging audio narration script for the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Write a natural, conversational narration script suitable for text-to-speech
      - DO NOT include markdown headers (##, ###) or formatting symbols
      - Include appropriate pauses marked with [PAUSE]
      - Add emphasis markers like [EMPHASIS] for important points
      - Structure it with clear introduction, main content, and conclusion
      - Keep sentences at moderate length for clear pronunciation
      - Add breathing spaces and natural flow
      - Include tone guidance like [FRIENDLY TONE] or [SERIOUS TONE] where appropriate
      - Make it engaging and educational
      - Duration should be approximately 3-5 minutes when narrated
      - If this is video content, create narration that complements the visual elements
      - Use plain text format without any markdown or special formatting
      - Avoid timestamps like (0:00-0:15) in the main narration text
      
      Format the response as a clean, plain text narration script with only timing and tone markers in brackets.
      Do not use markdown headers, bold text, or other formatting symbols.
      `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateVideoScript(content: string, language: string = 'en'): Promise<VideoScript> {
        const prompt = `
      Create a comprehensive video script for the following content in ${language}:
      
      Content: ${content}
      
      Requirements:
      - Create an engaging 2-3 minute educational video script
      - Structure it with clear scenes and visual descriptions
      - Include detailed voiceover text for each scene
      - Provide visual descriptions suitable for video production
      - Add on-screen text suggestions where appropriate
      - Include smooth transitions between scenes
      - Make it suitable for educational/explainer video format
      - Focus on visual storytelling and engagement
      - Include a compelling call-to-action at the end
      
      Return the response as a JSON object with this exact structure:
      {
        "title": "Video title",
        "description": "Brief video description",
        "duration": "2-3 minutes",
        "scenes": [
          {
            "sceneNumber": 1,
            "duration": "15-20 seconds",
            "visualDescription": "Detailed description of what viewers see",
            "voiceoverText": "Exact text to be spoken",
            "onScreenText": "Text overlay on screen (optional)",
            "transitions": "How this scene transitions to next"
          }
        ],
        "voiceover": "Complete voiceover script as one text",
        "callToAction": "Final call-to-action message"
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
            console.error('Error parsing video script JSON:', error);
            throw new Error('Failed to generate video script');
        }
    }

    async generateContent(request: ContentGenerationRequest): Promise<string | QuizQuestion[] | FlashCard[] | CaseStudy | VideoScript> {
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

            case 'video_script':
                return await this.generateVideoScript(contextualContent, language);

            default:
                throw new Error(`Unsupported content type: ${type}`);
        }
    }
}

export const aiGenerator = new AIContentGenerator();
