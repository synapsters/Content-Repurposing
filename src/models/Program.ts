import mongoose, { Document, Schema } from 'mongoose';
import { QuizQuestion, FlashCard, CaseStudy, VideoScript } from '@/lib/ai-service';

export interface IAsset {
    _id?: string;
    type: 'video' | 'text' | 'document';
    title: string;
    content?: string; // For text assets
    url?: string; // For video/document assets
    duration?: number; // For video assets in seconds
    fileSize?: number;
    mimeType?: string;
    uploadedAt: Date;
    generatedContent?: IGeneratedContent[]; // Generated content stored inside each asset
}

export interface IGeneratedContent {
    _id?: string;
    type: 'summary' | 'quiz' | 'case_study' | 'short_lecture' | 'flashcard' | 'audio_track' | 'video_script';
    title: string;
    content: string | QuizQuestion[] | FlashCard[] | CaseStudy | VideoScript; // Flexible content structure based on type
    language: string;
    generatedAt: Date;
    isPublished: boolean;
    version: number;
    status: 'published' | 'deprecated' | 'draft';
}

export interface IProgram extends Document {
    title: string;
    description: string;
    assets: IAsset[];
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string; // User ID
    supportedLanguages: string[];
    tags: string[];
}

const GeneratedContentSchema = new Schema<IGeneratedContent>({
    type: {
        type: String,
        enum: ['summary', 'quiz', 'case_study', 'short_lecture', 'flashcard', 'audio_track', 'video_script'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: Schema.Types.Mixed,
        required: true
    },
    language: {
        type: String,
        required: true,
        default: 'en'
    },
    generatedAt: {
        type: Date,
        default: Date.now
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    version: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['published', 'deprecated', 'draft'],
        default: 'published'
    }
});

const AssetSchema = new Schema<IAsset>({
    type: {
        type: String,
        enum: ['video', 'text', 'document'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    content: String,
    url: String,
    duration: Number,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    generatedContent: [GeneratedContentSchema] // Add generated content array to each asset
});

const ProgramSchema = new Schema<IProgram>({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    assets: [AssetSchema],
    isPublished: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        required: true
    },
    supportedLanguages: [{
        type: String,
        default: ['en']
    }],
    tags: [String]
});

// Update the updatedAt field before saving
ProgramSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.models.Program || mongoose.model<IProgram>('Program', ProgramSchema);
