'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    FileText,
    HelpCircle,
    BookOpen,
    Video,
    CreditCard,
    Loader2,
    RefreshCw,
    Globe,
    CheckCircle
} from 'lucide-react';
import { IAsset, IGeneratedContent } from '@/models/Program';
import { supportedLanguages, getLanguageFlag, getLanguageName } from '@/lib/utils';

interface ContentGeneratorProps {
    asset: IAsset;
    programId: string;
    programLanguages: string[]; // Languages supported by the program
    onContentGenerated: (content: IGeneratedContent) => void;
    existingContent?: IGeneratedContent[];
}

const contentTypes = [
    {
        type: 'summary' as const,
        title: 'Create Summary',
        description: 'Generate a comprehensive summary of the content',
        icon: FileText,
        color: 'bg-blue-500'
    },
    {
        type: 'quiz' as const,
        title: 'Create Quiz',
        description: 'Generate interactive quiz questions',
        icon: HelpCircle,
        color: 'bg-green-500'
    },
    {
        type: 'case_study' as const,
        title: 'Create Case Study',
        description: 'Generate practical case study scenarios',
        icon: BookOpen,
        color: 'bg-purple-500'
    },
    {
        type: 'short_lecture' as const,
        title: 'Create Short Lecture',
        description: 'Transform into engaging short-form content',
        icon: Video,
        color: 'bg-orange-500'
    },
    {
        type: 'flashcard' as const,
        title: 'Create Flashcards',
        description: 'Generate flashcards for quick review',
        icon: CreditCard,
        color: 'bg-pink-500'
    }
];

export default function ContentGenerator({
    asset,
    programId,
    programLanguages,
    onContentGenerated,
    existingContent = []
}: ContentGeneratorProps) {
    const [generating, setGenerating] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, language: string } | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(programLanguages);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);

    // Update selected languages when program languages change
    useEffect(() => {
        setSelectedLanguages(programLanguages);
    }, [programLanguages]);

    const handleGenerate = async (contentType: string) => {
        setGenerating(contentType);

        const languagesToGenerate = selectedLanguages.length > 0 ? selectedLanguages : programLanguages;

        if (languagesToGenerate.length === 0) {
            alert('Please select at least one language for content generation');
            setGenerating(null);
            return;
        }

        try {
            setGenerationProgress({ current: 0, total: languagesToGenerate.length, language: '' });

            for (let i = 0; i < languagesToGenerate.length; i++) {
                const language = languagesToGenerate[i];
                setGenerationProgress({ current: i + 1, total: languagesToGenerate.length, language });

                const response = await fetch('/api/generate-content', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        programId,
                        assetId: asset._id,
                        contentType,
                        language,
                        sourceContent: asset.content || asset.url || '',
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to generate content for ${language}`);
                }

                const generatedContent = await response.json();
                onContentGenerated(generatedContent);
            }
        } catch (error) {
            console.error('Error generating content:', error);
            alert(`Error generating content: ${error.message}`);
        } finally {
            setGenerating(null);
            setGenerationProgress(null);
        }
    };

    const handleRegenerate = async (contentId: string, contentType: string, language: string) => {
        setGenerating(`${contentType}-${language}`);

        try {
            const response = await fetch('/api/regenerate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentId,
                    programId,
                    assetId: asset._id,
                    contentType,
                    language,
                    sourceContent: asset.content || asset.url || '',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to regenerate content');
            }

            const regeneratedContent = await response.json();
            onContentGenerated(regeneratedContent);
        } catch (error) {
            console.error('Error regenerating content:', error);
        } finally {
            setGenerating(null);
        }
    };

    const toggleLanguage = (languageCode: string) => {
        setSelectedLanguages(prev =>
            prev.includes(languageCode)
                ? prev.filter(lang => lang !== languageCode)
                : [...prev, languageCode]
        );
    };

    const getExistingContentForType = (type: string) => {
        return existingContent.filter(content => content.type === type);
    };

    const isGenerating = (type: string) => {
        return generating === type || generating?.startsWith(`${type}-`);
    };

    return (
        <div className="space-y-6">
            {/* Language Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Globe className="h-5 w-5" />
                        <span>Localization Settings</span>
                    </CardTitle>
                    <CardDescription>
                        Select languages for content generation
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {supportedLanguages.map((language) => (
                            <Button
                                key={language.code}
                                variant={selectedLanguages.includes(language.code) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleLanguage(language.code)}
                                className="justify-start"
                            >
                                <span className="mr-2">{language.flag}</span>
                                {language.name}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-gray-500">
                            Selected: {selectedLanguages.length} language(s)
                        </p>
                        <div className="flex space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLanguages(programLanguages)}
                            >
                                Select All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLanguages([])}
                            >
                                Clear All
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content Generation Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentTypes.map((contentType) => {
                    const Icon = contentType.icon;
                    const existingForType = getExistingContentForType(contentType.type);
                    const isCurrentlyGenerating = isGenerating(contentType.type);

                    return (
                        <Card key={contentType.type} className="relative">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${contentType.color}`}>
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <span>{contentType.title}</span>
                                </CardTitle>
                                <CardDescription>
                                    {contentType.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <Button
                                        onClick={() => handleGenerate(contentType.type)}
                                        disabled={isCurrentlyGenerating || selectedLanguages.length === 0}
                                        className="w-full"
                                    >
                                        {isCurrentlyGenerating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                {generationProgress ? (
                                                    <span>
                                                        Generating ({generationProgress.current}/{generationProgress.total})
                                                        {generationProgress.language && ` - ${getLanguageFlag(generationProgress.language)}`}
                                                    </span>
                                                ) : (
                                                    'Generating...'
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Icon className="h-4 w-4 mr-2" />
                                                Generate ({selectedLanguages.length} lang{selectedLanguages.length !== 1 ? 's' : ''})
                                            </>
                                        )}
                                    </Button>

                                    {/* Show existing content */}
                                    {existingForType.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-700">
                                                Generated Content:
                                            </p>
                                            {existingForType.map((content) => (
                                                <div
                                                    key={content._id}
                                                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm">
                                                            {getLanguageFlag(content.language)}
                                                        </span>
                                                        <span className="text-sm font-medium">
                                                            {content.title}
                                                        </span>
                                                        {content.isPublished && (
                                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRegenerate(
                                                            content._id!,
                                                            content.type,
                                                            content.language
                                                        )}
                                                        disabled={generating === `${content.type}-${content.language}`}
                                                    >
                                                        {generating === `${content.type}-${content.language}` ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
