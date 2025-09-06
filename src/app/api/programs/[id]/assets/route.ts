import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Program from '@/models/Program';

// POST /api/programs/[id]/assets - Add asset to program
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const { type, title, content, url, fileSize, mimeType } = await request.json();

        if (!type || !title) {
            return NextResponse.json(
                { error: 'Type and title are required' },
                { status: 400 }
            );
        }

        const program = await Program.findById(id);
        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        const newAsset = {
            type,
            title,
            content,
            url,
            fileSize,
            mimeType,
            uploadedAt: new Date()
        };

        program.assets.push(newAsset);
        await program.save();

        const addedAsset = program.assets[program.assets.length - 1];

        return NextResponse.json(addedAsset, { status: 201 });
    } catch (error) {
        console.error('Error adding asset:', error);
        return NextResponse.json(
            { error: 'Failed to add asset' },
            { status: 500 }
        );
    }
}

// DELETE /api/programs/[id]/assets - Remove asset from program
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const { searchParams } = new URL(request.url);
        const assetId = searchParams.get('assetId');

        if (!assetId) {
            return NextResponse.json(
                { error: 'Asset ID is required' },
                { status: 400 }
            );
        }

        const program = await Program.findById(id);
        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        program.assets = program.assets.filter(
            (asset) => asset._id?.toString() !== assetId
        );

        await program.save();

        return NextResponse.json({ message: 'Asset removed successfully' });
    } catch (error) {
        console.error('Error removing asset:', error);
        return NextResponse.json(
            { error: 'Failed to remove asset' },
            { status: 500 }
        );
    }
}
