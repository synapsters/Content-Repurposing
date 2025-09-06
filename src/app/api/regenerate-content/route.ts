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

        // Find the specific asset
        const asset = program.assets.find(a => a._id?.toString() === assetId);
        if (!asset || !asset.generatedContent) {
            return NextResponse.json(
                { error: 'Asset or generated content not found' },
                { status: 404 }
            );
        }

        // Find the existing content within the asset
        const existingContentIndex = asset.generatedContent.findIndex(
            (content) => content._id?.toString() === contentId
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

        // Update the existing content in place (keep same record, update content)
        const existingContent = asset.generatedContent[existingContentIndex];
        asset.generatedContent[existingContentIndex] = {
            ...existingContent, // Keep all existing fields including _id
            content: regeneratedContent, // Update only the content
            generatedAt: new Date(), // Update timestamp
            isPublished: false // Reset publish status
        };

        await program.save();

        // Return the updated content
        return NextResponse.json(asset.generatedContent[existingContentIndex]);
    } catch (error) {
        console.error('Error regenerating content:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate content' },
            { status: 500 }
        );
    }
}
