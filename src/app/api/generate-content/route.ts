import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Program, { IAsset } from '@/models/Program';
import { aiGenerator } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
    try {
        await dbConnect();

        const { programId, assetId, contentType, language, sourceContent } = await request.json();

        console.log('🔌 Generate Content API called:', {
            programId,
            assetId,
            contentType,
            language,
            sourceContentLength: sourceContent?.length || 0,
            sourceContentPreview: sourceContent?.substring(0, 100) + '...',
            isYouTubeURL: sourceContent?.includes('youtube.com') || sourceContent?.includes('youtu.be')
        });

        if (!programId || !assetId || !contentType || !sourceContent) {
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

        // Generate content using AI
        console.log('🤖 Calling AI generator...');
        const generatedContent = await aiGenerator.generateContent({
            type: contentType,
            sourceContent,
            language: language || 'en'
        });
        console.log('✅ AI generation completed:', {
            contentType,
            language,
            generatedLength: JSON.stringify(generatedContent).length
        });

        // Find the specific asset
        const asset = program.assets.find((a: IAsset) => a._id?.toString() === assetId);
        if (!asset) {
            return NextResponse.json(
                { error: 'Asset not found' },
                { status: 404 }
            );
        }

        // Create the new generated content object
        const newContent = {
            type: contentType,
            title: `${contentType.charAt(0).toUpperCase() + contentType.slice(1)} - ${language || 'en'}`,
            content: generatedContent,
            language: language || 'en',
            generatedAt: new Date(),
            isPublished: false
        };

        // Initialize generatedContent array if it doesn't exist
        if (!asset.generatedContent) {
            asset.generatedContent = [];
        }

        // Add to asset's generated content
        asset.generatedContent.push(newContent);
        await program.save();

        // Return the newly created content
        const savedContent = asset.generatedContent[asset.generatedContent.length - 1];

        return NextResponse.json(savedContent);
    } catch (error) {
        console.error('Error generating content:', error);
        return NextResponse.json(
            { error: 'Failed to generate content' },
            { status: 500 }
        );
    }
}
