import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Program from '@/models/Program';

// GET /api/programs - Get all programs
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $in: [new RegExp(search, 'i')] } }
                ]
            };
        }

        const programs = await Program.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Program.countDocuments(query);

        return NextResponse.json({
            programs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching programs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch programs' },
            { status: 500 }
        );
    }
}

// POST /api/programs - Create a new program
export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { title, description, tags, supportedLanguages } = await request.json();

        if (!title || !description) {
            return NextResponse.json(
                { error: 'Title and description are required' },
                { status: 400 }
            );
        }

        const program = new Program({
            title,
            description,
            tags: tags || [],
            supportedLanguages: supportedLanguages || ['en'],
            createdBy: 'user-id', // This would come from authentication
            assets: [],
            generatedContent: [],
            isPublished: false
        });

        await program.save();

        return NextResponse.json(program, { status: 201 });
    } catch (error) {
        console.error('Error creating program:', error);
        return NextResponse.json(
            { error: 'Failed to create program' },
            { status: 500 }
        );
    }
}
