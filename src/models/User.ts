import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    image?: string;
    role: 'admin' | 'creator' | 'viewer';
    createdAt: Date;
    updatedAt: Date;
    preferences: {
        defaultLanguage: string;
        preferredLanguages: string[];
    };
}

const UserSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: String,
    image: String,
    role: {
        type: String,
        enum: ['admin', 'creator', 'viewer'],
        default: 'creator'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    preferences: {
        defaultLanguage: {
            type: String,
            default: 'en'
        },
        preferredLanguages: [{
            type: String,
            default: ['en']
        }]
    }
});

UserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
