import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Program, { IAsset, IGeneratedContent } from '@/models/Program';
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
        const asset = program.assets.find((a: IAsset) => a._id?.toString() === assetId);
        if (!asset || !asset.generatedContent) {
            return NextResponse.json(
                { error: 'Asset or generated content not found' },
                { status: 404 }
            );
        }

        // Find the existing content within the asset
        const existingContent = asset.generatedContent.find(
            (content: IGeneratedContent) => content._id?.toString() === contentId
        );

        if (!existingContent) {
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

        // Mark existing content as deprecated
        const existingContentIndex = asset.generatedContent.findIndex(
            (content: IGeneratedContent) => content._id?.toString() === contentId
        );
        asset.generatedContent[existingContentIndex].status = 'deprecated';

        // Get the highest version number for this type and language
        const sameTypeAndLanguageContent = asset.generatedContent.filter(
            (content: IGeneratedContent) =>
                content.type === contentType &&
                content.language === (language || 'en')
        );
        const maxVersion = Math.max(...sameTypeAndLanguageContent.map(c => c.version || 1));

        // Create new version of the content
        const newContent: IGeneratedContent = {
            type: contentType as 'summary' | 'quiz' | 'case_study' | 'short_lecture' | 'flashcard' | 'audio_track' | 'video_script',
            title: existingContent.title,
            content: regeneratedContent,
            language: language || 'en',
            generatedAt: new Date(),
            isPublished: true,
            version: maxVersion + 1,
            status: 'published'
        };

        // Add the new content to the asset
        asset.generatedContent.push(newContent);

        await program.save();

        // Return the new content (which will be the last item in the array)
        const newContentWithId = asset.generatedContent[asset.generatedContent.length - 1];
        return NextResponse.json(newContentWithId);
    } catch (error) {
        console.error('Error regenerating content:', error);
        return NextResponse.json(
            { error: 'Failed to regenerate content' },
            { status: 500 }
        );
    }
}
