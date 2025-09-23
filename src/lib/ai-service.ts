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
        const languageInstructions = {
            'hi': 'सभी सामग्री हिंदी भाषा में होनी चाहिए। देवनागरी लिपि का उपयोग करें। तकनीकी शब्दों को हिंदी में अनुवादित करें।',
            'en': 'All content should be in English.',
            'fr': 'Tout le contenu doit être en français.',
            'es': 'Todo el contenido debe estar en español.',
            'ru': 'Весь контент должен быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
**You are an expert technical content summarizer.**

**LANGUAGE REQUIREMENT: ${langInstruction}**

**Your primary task is to summarize the technical content in ${language} language.**

**Strict rules for the summary:**
* Include **only** the technical terms and concepts from the user's content
* Omit all jargon, filler words, and long-winded explanations
* Each technical term should be accompanied by a very short, one-line explanation
* The final summary must be between 120 and 150 words
* The summary should be presented as a concise, structured list or series of bullet points
* Write everything in ${language} language

Content: ${content}
    `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateQuiz(content: string, language: string = 'en', numQuestions: number = 5): Promise<QuizQuestion[]> {
        const languageInstructions = {
            'hi': 'सभी प्रश्न, विकल्प और स्पष्टीकरण हिंदी भाषा में होने चाहिए। देवनागरी लिपि का उपयोग करें।',
            'en': 'All questions, options, and explanations should be in English.',
            'fr': 'Toutes les questions, options et explications doivent être en français.',
            'es': 'Todas las preguntas, opciones y explicaciones deben estar en español.',
            'ru': 'Все вопросы, варианты ответов и объяснения должны быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
You are an expert quiz master. Generate ${numQuestions} single-choice questions from the provided content.

LANGUAGE REQUIREMENT: ${langInstruction}

IMPORTANT: Generate content in ${language} language. If the language is Hindi (hi), use proper Devanagari script.

### Requirements:
1. Generate exactly ${numQuestions} questions with 4 options each
2. Each question has one correct answer (index 0-3)
3. Cover the provided content comprehensively
4. Mix difficulty levels: 30% easy, 50% medium, 20% advanced
5. Include clear explanations for correct answers

CRITICAL OUTPUT FORMAT:
- Return ONLY valid JSON
- No markdown code blocks
- No additional text
- No comments

EXACT JSON STRUCTURE:
[
  {
    "question": "Question text in ${language}",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": 0,
    "explanation": "Explanation in ${language}"
  }
]

JSON RULES:
- Use double quotes only
- Escape internal quotes with backslash
- correctAnswer is a number (0-3)
- No trailing commas

Content to create quiz from:
${content}
`;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            // Clean the response to extract JSON
            let cleanedResponse = response.trim();

            // Remove markdown code blocks if present
            cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

            // Remove any leading/trailing text that might interfere
            cleanedResponse = cleanedResponse.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '');

            // Find JSON array in the response (more flexible matching)
            const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/) || cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];

                // Step 1: Basic cleaning
                jsonStr = jsonStr.trim();

                // Step 2: Try to parse as-is first
                try {
                    const parsed = JSON.parse(jsonStr);
                    // If it's an object but we need an array, wrap it
                    return Array.isArray(parsed) ? parsed : [parsed];
                } catch (initialParseError) {
                    console.log('Initial parse failed, attempting fixes...');

                    // Step 3: Apply quote fixes
                    jsonStr = this.fixJsonQuotes(jsonStr);

                    // Step 4: Try parsing again
                    try {
                        const parsed = JSON.parse(jsonStr);
                        return Array.isArray(parsed) ? parsed : [parsed];
                    } catch (secondParseError) {
                        console.error('JSON parse error after fixes:', secondParseError);
                        console.error('Problematic JSON:', jsonStr.substring(0, 300) + '...');

                        // Step 5: Last resort - try manual extraction
                        return this.extractQuestionsManually(jsonStr, language);
                    }
                }
            }
            throw new Error('No valid JSON found in response');
        } catch (error) {
            console.error('Error parsing quiz JSON:', error);
            console.error('Raw response:', response.substring(0, 500) + '...');

            // Return a fallback quiz if parsing fails
            return this.getFallbackQuiz(language);
        }
    }

    private extractQuestionsManually(jsonStr: string, language: string): QuizQuestion[] {
        try {
            // Last resort: try to extract questions manually using regex
            const questionPattern = /"question"\s*:\s*"([^"]+)"/g;
            const optionsPattern = /"options"\s*:\s*\[([^\]]+)\]/g;
            const correctAnswerPattern = /"correctAnswer"\s*:\s*(\d+)/g;
            const explanationPattern = /"explanation"\s*:\s*"([^"]+)"/g;

            const questions: string[] = [];
            const options: string[][] = [];
            const correctAnswers: number[] = [];
            const explanations: string[] = [];

            let match;

            // Extract questions
            while ((match = questionPattern.exec(jsonStr)) !== null) {
                questions.push(match[1]);
            }

            // Extract options
            while ((match = optionsPattern.exec(jsonStr)) !== null) {
                const optionStr = match[1];
                const optionArray = optionStr.split(',').map(opt =>
                    opt.trim().replace(/^["']|["']$/g, '')
                );
                options.push(optionArray);
            }

            // Extract correct answers
            while ((match = correctAnswerPattern.exec(jsonStr)) !== null) {
                correctAnswers.push(parseInt(match[1]));
            }

            // Extract explanations
            while ((match = explanationPattern.exec(jsonStr)) !== null) {
                explanations.push(match[1]);
            }

            // Build questions array
            const extractedQuestions: QuizQuestion[] = [];
            const maxLength = Math.min(questions.length, options.length, correctAnswers.length, explanations.length);

            for (let i = 0; i < maxLength; i++) {
                extractedQuestions.push({
                    question: questions[i],
                    options: options[i],
                    correctAnswer: correctAnswers[i],
                    explanation: explanations[i]
                });
            }

            return extractedQuestions.length > 0 ? extractedQuestions : this.getFallbackQuiz(language);
        } catch (error) {
            console.error('Manual extraction failed:', error);
            return this.getFallbackQuiz(language);
        }
    }

    private fixJsonQuotes(jsonStr: string): string {
        // More sophisticated quote fixing
        try {
            // Step 1: Handle unquoted keys
            jsonStr = jsonStr.replace(/([{,]\s*)(\w+):/g, '$1"$2":');

            // Step 2: Replace single quotes with double quotes, but avoid breaking existing escaped quotes
            jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');

            // Step 3: Fix escaped quotes that might be causing issues
            // Find strings and fix internal quotes
            jsonStr = jsonStr.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
                // If the content contains unescaped quotes, escape them
                const fixedContent = content.replace(/(?<!\\)"/g, '\\"');
                return `"${fixedContent}"`;
            });

            // Step 4: Remove any potential trailing commas
            jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

            // Step 5: Fix common text artifacts that might break JSON
            jsonStr = jsonStr.replace(/\.\.\./g, '...');  // Fix ellipsis
            jsonStr = jsonStr.replace(/'/g, "'");  // Fix smart quotes
            jsonStr = jsonStr.replace(/"/g, '"');  // Fix smart quotes
            jsonStr = jsonStr.replace(/"/g, '"');  // Fix smart quotes

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
            ],
            hi: [
                {
                    question: "इस सामग्री का मुख्य विषय क्या है?",
                    options: ["प्रोग्रामिंग", "तकनीक", "सामान्य ज्ञान", "अन्य"],
                    correctAnswer: 0,
                    explanation: "यह एक आपातकालीन प्रश्न है जो AI सेवा में त्रुटि होने पर उत्पन्न होता है।"
                }
            ],
            ru: [
                {
                    question: "Какова основная тема этого контента?",
                    options: ["Программирование", "Технология", "Общие знания", "Другое"],
                    correctAnswer: 0,
                    explanation: "Это резервный вопрос, генерируемый при возникновении ошибки в службе ИИ."
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
            ],
            hi: [
                {
                    front: "इस सामग्री का मुख्य विषय क्या है?",
                    back: "यह एक आपातकालीन फ्लैशकार्ड है जो AI सेवा में त्रुटि होने पर उत्पन्न होता है।",
                    category: "सामान्य"
                }
            ],
            ru: [
                {
                    front: "Какова основная тема этого контента?",
                    back: "Это резервная флеш-карта, генерируемая при возникновении ошибки в службе ИИ.",
                    category: "Общее"
                }
            ]
        };

        return fallbackCards[language as keyof typeof fallbackCards] || fallbackCards.en;
    }

    async generateCaseStudy(content: string, language: string = 'en'): Promise<CaseStudy> {
        const languageInstructions = {
            'hi': 'सभी केस स्टडी हिंदी भाषा में होनी चाहिए। देवनागरी लिपि का उपयोग करें।',
            'en': 'All case study should be in English.',
            'fr': 'Toute l\'étude de cas doit être en français.',
            'es': 'Todo el estudio de caso debe estar en español.',
            'ru': 'Все кейс-стади должны быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
You are an expert case study creator.

**LANGUAGE REQUIREMENT: ${langInstruction}**

**Your task is to generate a comprehensive and practical case study in ${language} language tailored for a specific technology and user-provided content. The case study should be highly relevant and focus on the practical application of the provided material.
 
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
        
        Strictly return the response as JSON with this structure (all content in ${language}):
      {
        "title": "Case Study Title in ${language}",
        "scenario": "Detailed scenario description in ${language}",
        "challenges": ["Challenge 1 in ${language}", "Challenge 2 in ${language}", "Challenge 3 in ${language}"],
        "questions": ["Question 1 in ${language}", "Question 2 in ${language}", "Question 3 in ${language}"],
        "learningObjectives": ["Objective 1 in ${language}", "Objective 2 in ${language}", "Objective 3 in ${language}"]
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
        const languageInstructions = {
            'hi': 'सभी सामग्री हिंदी भाषा में होनी चाहिए। देवनागरी लिपि का उपयोग करें। तकनीकी शब्दों को हिंदी में समझाएं।',
            'en': 'All content should be in English.',
            'fr': 'Tout le contenu doit être en français.',
            'es': 'Todo el contenido debe estar en español.',
            'ru': 'Весь контент должен быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
You are a technical content summarization expert.

**LANGUAGE REQUIREMENT: ${langInstruction}**

**Your task is to analyze and summarize technical learning materials in ${language} language.**

Your response must meet the following criteria:

* **Structure**: Present the summary in a well-organized, point-by-point format. Use headings and bullet points to ensure clarity and readability.
* **Accuracy and Completeness**:
    * Thoroughly capture all key technical concepts, topics, and definitions from the original content. Do not omit any technical term.
    * Do not add any new information, examples, or interpretations. Your summary must be derived *exclusively* from the user's provided text.
* **Clarity**:
    * Rewrite complex technical jargon into simple, easy-to-understand language.
    * Strictly omit all jargons and storylines from the content.
    * Maintain a clear, concise, and professional tone.
* **Summary Length**:
    * Response should be strictly at-most one-third the size of the original data.
* **Format**: The output should be a clean, direct summary. Do not include any conversational filler, introductory phrases, or concluding remarks. Just provide the summary.
* **Language**: Write everything in ${language} language.

Content: ${content}
    `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateFlashCards(content: string, language: string = 'en', numCards: number = 10): Promise<FlashCard[]> {
        const languageInstructions = {
            'hi': 'सभी फ्लैशकार्ड हिंदी भाषा में होने चाहिए। देवनागरी लिपि का उपयोग करें।',
            'en': 'All flashcards should be in English.',
            'fr': 'Toutes les cartes mémoire doivent être en français.',
            'es': 'Todas las tarjetas de estudio deben estar en español.',
            'ru': 'Все флеш-карты должны быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
Create ${numCards} flashcards based on the following content.

LANGUAGE REQUIREMENT: ${langInstruction}

Requirements:
- Each card should have a clear question/term on the front in ${language}
- Provide concise, accurate answers on the back in ${language}
- Cover key concepts, definitions, and important facts
- Categorize cards by topic when possible in ${language}
- Make them useful for quick review and memorization

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, no other text.

EXACT JSON STRUCTURE:
[
  {
    "front": "Question or term in ${language}",
    "back": "Answer or definition in ${language}",
    "category": "Topic category in ${language}"
  }
]

JSON FORMATTING RULES:
- Use ONLY double quotes, never single quotes
- Escape quotes inside strings with backslash (\")
- No trailing commas
- No comments in JSON

Content: ${content}
    `;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            // Clean the response to extract JSON
            let cleanedResponse = response.trim();

            // Remove markdown code blocks if present
            cleanedResponse = cleanedResponse.replace(/```json\s*/gi, '').replace(/```\s*/g, '');

            // Remove any leading/trailing text that might interfere
            cleanedResponse = cleanedResponse.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '');

            // Find JSON array in the response (more flexible matching)
            const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/) || cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                let jsonStr = jsonMatch[0];

                // Step 1: Basic cleaning
                jsonStr = jsonStr.trim();

                // Step 2: Try to parse as-is first
                try {
                    const parsed = JSON.parse(jsonStr);
                    // If it's an object but we need an array, wrap it
                    return Array.isArray(parsed) ? parsed : [parsed];
                } catch (initialParseError) {
                    console.log('Initial flashcard parse failed, attempting fixes...');

                    // Step 3: Apply quote fixes
                    jsonStr = this.fixJsonQuotes(jsonStr);

                    // Step 4: Try parsing again
                    try {
                        const parsed = JSON.parse(jsonStr);
                        return Array.isArray(parsed) ? parsed : [parsed];
                    } catch (secondParseError) {
                        console.error('Flashcard JSON parse error after fixes:', secondParseError);
                        console.error('Problematic JSON:', jsonStr.substring(0, 300) + '...');

                        // Return fallback if all else fails
                        return this.getFallbackFlashCards(language);
                    }
                }
            }
            throw new Error('No valid JSON found in flashcard response');
        } catch (error) {
            console.error('Error parsing flashcards JSON:', error);
            console.error('Raw response:', response.substring(0, 500) + '...');

            // Return a fallback flashcard set if parsing fails
            return this.getFallbackFlashCards(language);
        }
    }

    async generateAudioTrack(content: string, language: string = 'en'): Promise<string> {
        const languageInstructions = {
            'hi': 'सभी ऑडियो स्क्रिप्ट हिंदी भाषा में होनी चाहिए। देवनागरी लिपि का उपयोग करें।',
            'en': 'All audio script should be in English.',
            'fr': 'Tout le script audio doit être en français.',
            'es': 'Todo el guión de audio debe estar en español.',
            'ru': 'Весь аудио-скрипт должен быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
Create an engaging audio narration script for the following content.

**LANGUAGE REQUIREMENT: ${langInstruction}**

**Create the script in ${language} language.**

Requirements:
- Write a natural, conversational narration script suitable for text-to-speech in ${language}
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
- Write everything in ${language} language

Content: ${content}

Format the response as a clean, plain text narration script with only timing and tone markers in brackets.
Do not use markdown headers, bold text, or other formatting symbols.
      `;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    async generateVideoScript(content: string, language: string = 'en'): Promise<VideoScript> {
        const languageInstructions = {
            'hi': 'सभी वीडियो स्क्रिप्ट हिंदी भाषा में होनी चाहिए। देवनागरी लिपि का उपयोग करें।',
            'en': 'All video script should be in English.',
            'fr': 'Tout le script vidéo doit être en français.',
            'es': 'Todo el guión de video debe estar en español.',
            'ru': 'Весь видео-скрипт должен быть на русском языке.'
        };

        const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['en'];

        const prompt = `
Create a comprehensive video script for the following content.

**LANGUAGE REQUIREMENT: ${langInstruction}**

**Create the script in ${language} language.**

Requirements:
- Create an engaging 2-3 minute educational video script in ${language}
- Structure it with clear scenes and visual descriptions
- Include detailed voiceover text for each scene in ${language}
- Provide visual descriptions suitable for video production
- Add on-screen text suggestions where appropriate in ${language}
- Include smooth transitions between scenes
- Make it suitable for educational/explainer video format
- Focus on visual storytelling and engagement
- Include a compelling call-to-action at the end in ${language}
- Write everything in ${language} language

Content: ${content}

Return the response as a JSON object with this exact structure:
{
  "title": "Video title in ${language}",
  "description": "Brief video description in ${language}",
  "duration": "2-3 minutes",
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "15-20 seconds",
      "visualDescription": "Detailed description of what viewers see in ${language}",
      "voiceoverText": "Exact text to be spoken in ${language}",
      "onScreenText": "Text overlay on screen in ${language} (optional)",
      "transitions": "How this scene transitions to next in ${language}"
    }
  ],
  "voiceover": "Complete voiceover script as one text in ${language}",
  "callToAction": "Final call-to-action message in ${language}"
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
