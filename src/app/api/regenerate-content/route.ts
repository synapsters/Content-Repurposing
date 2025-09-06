import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Program from '@/models/Program';
import { aiGenerator } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { contentId, programId, assetId, contentType, language, sourceContent } = await request.json();

        if (!contentId || !programId || !assetId || !contentType || !sourceContent) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Find the program
        const program = await Program.findById(programId);
        if (!program) {
            return NextResponse.json(
                { error: 'Program not found' },
                { status: 404 }
            );
        }

        // Find the existing content
        const existingContentIndex = program.generatedContent.findIndex(
            (content: any) => content._id.toString() === contentId
        );

        if (existingContentIndex === -1) {
            return NextResponse.json(
                { error: 'Content not found' },
                { status: 404 }
            );
        }

        // Generate new content using AI
        const regeneratedContent = await aiGenerator.generateContent({
            type: contentType,
            sourceContent,
            language: language || 'en'
        });

        // Update the existing content while preserving required fields
        const existingContent = program.generatedContent[existingContentIndex];
        program.generatedContent[existingContentIndex] = {
            type: existingContent.type, // Preserve required field
            title: existingContent.title, // Preserve required field
            sourceAssetId: existingContent.sourceAssetId, // Preserve required field
            language: existingContent.language || language || 'en',
            content: regeneratedContent,
            generatedAt: new Date(),
            isPublished: false // Reset publish status when regenerating
        };

        await program.save();

        return NextResponse.json(program.generatedContent[existingContentIndex]);
    } catch (error) {
        console.error('Error regenerating content:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate content' },
            { status: 500 }
        );
    }
}
