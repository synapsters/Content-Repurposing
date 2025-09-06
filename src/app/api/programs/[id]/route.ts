import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Program from '@/models/Program';

// GET /api/programs/[id] - Get a specific program
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const program = await Program.findById(id);
        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(program);
    } catch (error) {
        console.error('Error fetching program:', error);
        return NextResponse.json(
            { error: 'Failed to fetch program' },
            { status: 500 }
        );
    }
}

// PUT /api/programs/[id] - Update a program
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const updates = await request.json();

        const program = await Program.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(program);
    } catch (error) {
        console.error('Error updating program:', error);
        return NextResponse.json(
            { error: 'Failed to update program' },
            { status: 500 }
        );
    }
}

// DELETE /api/programs/[id] - Delete a program
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const program = await Program.findByIdAndDelete(id);
        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Program deleted successfully' });
    } catch (error) {
        console.error('Error deleting program:', error);
        return NextResponse.json(
            { error: 'Failed to delete program' },
            { status: 500 }
        );
    }
}
