import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/mongodb';

// Sample users for demonstration (in a real app, these would be in the database)
const sampleUsers = [
    {
        email: 'admin@example.com',
        password: 'admin123', // In real app, this would be hashed
        name: 'Admin User',
        role: 'admin',
        preferences: {
            defaultLanguage: 'en',
            preferredLanguages: ['en', 'es', 'fr']
        }
    },
    {
        email: 'creator@example.com',
        password: 'creator123',
        name: 'Content Creator',
        role: 'creator',
        preferences: {
            defaultLanguage: 'en',
            preferredLanguages: ['en', 'es']
        }
    },
    {
        email: 'viewer@example.com',
        password: 'viewer123',
        name: 'Content Viewer',
        role: 'viewer',
        preferences: {
            defaultLanguage: 'en',
            preferredLanguages: ['en']
        }
    }
];

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        // For demo purposes, check against sample users first
        const sampleUser = sampleUsers.find(user => user.email === email);

        if (sampleUser) {
            // Simple password check for demo (in real app, use bcrypt.compare)
            if (sampleUser.password === password) {
                // Generate JWT token (optional for demo)
                const token = jwt.sign(
                    {
                        userId: sampleUser.email,
                        email: sampleUser.email,
                        role: sampleUser.role
                    },
                    process.env.JWT_SECRET || 'demo-secret',
                    { expiresIn: '24h' }
                );

                // Return user data (excluding password)
                const { password: _, ...userWithoutPassword } = sampleUser;

                return NextResponse.json({
                    success: true,
                    user: {
                        ...userWithoutPassword,
                        id: sampleUser.email, // Using email as ID for demo
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    },
                    token
                });
            }
        }

        // If not a sample user, try database lookup (optional)
        try {
            await connectToDatabase();

            const user = await User.findOne({ email });
            if (!user) {
                return NextResponse.json(
                    { message: 'Invalid email or password' },
                    { status: 401 }
                );
            }

            // Check password (assuming it's hashed in database)
            const isPasswordValid = user.password
                ? await bcrypt.compare(password, user.password)
                : false;

            if (!isPasswordValid) {
                return NextResponse.json(
                    { message: 'Invalid email or password' },
                    { status: 401 }
                );
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET || 'demo-secret',
                { expiresIn: '24h' }
            );

            // Return user data (excluding password)
            const { password: userPassword, ...userWithoutPassword } = user.toObject();

            return NextResponse.json({
                success: true,
                user: userWithoutPassword,
                token
            });

        } catch (dbError) {
            console.log('Database connection failed, using sample users only');
        }

        // If no match found
        return NextResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
        );

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
