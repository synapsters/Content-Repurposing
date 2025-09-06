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
    contentType?: string; // Optional: filter to specific content type
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
    existingContent = [],
    contentType
}: ContentGeneratorProps) {
    const [generating, setGenerating] = useState<string | null>(null);
    const [generationProgress, setGenerationProgress] = useState<{ current: number, total: number, language: string } | null>(null);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
        console.log('🚀 ContentGenerator: Initial state', {
            programLanguages,
            contentType,
            programLanguagesLength: programLanguages?.length || 0
        });
        return programLanguages || [];
    });
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);

    // Update selected languages when program languages change
    useEffect(() => {
        console.log('🔄 ContentGenerator: Program languages changed', {
            programLanguages,
            previousSelectedLanguages: selectedLanguages,
            programLanguagesLength: programLanguages?.length || 0
        });
        if (programLanguages && programLanguages.length > 0) {
            setSelectedLanguages(programLanguages);
        }
    }, [programLanguages]);

    const handleGenerate = async (contentType: string) => {
        setGenerating(contentType);

        const languagesToGenerate = selectedLanguages.length > 0 ? selectedLanguages : programLanguages;

        console.log('🔍 Generation Debug Info:');
        console.log('Selected Languages:', selectedLanguages);
        console.log('Program Languages:', programLanguages);
        console.log('Languages to Generate:', languagesToGenerate);
        console.log('Content Type:', contentType);

        if (languagesToGenerate.length === 0) {
            alert('Please select at least one language for content generation');
            setGenerating(null);
            return;
        }

        try {
            setGenerationProgress({ current: 0, total: languagesToGenerate.length, language: '' });

            const results = [];
            const errors = [];

            for (let i = 0; i < languagesToGenerate.length; i++) {
                const language = languagesToGenerate[i];
                setGenerationProgress({ current: i + 1, total: languagesToGenerate.length, language });

                try {
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
                        const errorData = await response.json();
                        throw new Error(errorData.error || `Failed to generate content for ${language}`);
                    }

                    const generatedContent = await response.json();
                    onContentGenerated(generatedContent);
                    results.push({ language, success: true });
                } catch (error) {
                    console.error(`Error generating content for ${language}:`, error);
                    errors.push({ language, error: error.message });
                    results.push({ language, success: false, error: error.message });
                }
            }

            // Show summary of results
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.filter(r => !r.success).length;

            if (successCount > 0 && failureCount === 0) {
                console.log(`✅ Successfully generated content for all ${successCount} languages`);
            } else if (successCount > 0 && failureCount > 0) {
                console.warn(`⚠️ Generated content for ${successCount} languages, failed for ${failureCount} languages`);
                const failedLanguages = errors.map(e => e.language).join(', ');
                alert(`Generated content for ${successCount} languages. Failed for: ${failedLanguages}`);
            } else {
                console.error(`❌ Failed to generate content for all languages`);
                alert(`Failed to generate content for all languages. Please try again.`);
            }
        } catch (error) {
            console.error('Unexpected error during content generation:', error);
            alert(`Unexpected error: ${error.message}`);
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
        setSelectedLanguages(prev => {
            const newSelection = prev.includes(languageCode)
                ? prev.filter(lang => lang !== languageCode)
                : [...prev, languageCode];

            console.log('🔄 Language Toggle:', {
                language: languageCode,
                previousSelection: prev,
                newSelection: newSelection
            });

            return newSelection;
        });
    };

    const getExistingContentForType = (type: string) => {
        return existingContent.filter(content => content.type === type);
    };

    const isGenerating = (type: string) => {
        return generating === type || generating?.startsWith(`${type}-`);
    };

    return (
        <div className="space-y-4">
            {/* Language Selection - Compact */}
            <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-3">
                    {supportedLanguages.filter(lang => programLanguages.includes(lang.code)).map((language) => (
                        <button
                            key={language.code}
                            onClick={() => toggleLanguage(language.code)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedLanguages.includes(language.code)
                                ? 'bg-white text-gray-700 shadow-sm'
                                : 'bg-white/50 text-gray-300 hover:bg-white/70'
                                }`}
                        >
                            <span className="mr-1">{language.flag}</span>
                            {language.name}
                        </button>
                    ))}
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-white/70">
                        {selectedLanguages.length} language{selectedLanguages.length !== 1 ? 's' : ''} selected
                        {selectedLanguages.length > 0 && (
                            <span className="ml-2 text-white/50">
                                ({selectedLanguages.join(', ')})
                            </span>
                        )}
                    </span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => {
                                console.log('Setting all languages:', programLanguages);
                                setSelectedLanguages(programLanguages);
                            }}
                            className="text-white/70 hover:text-white underline"
                        >
                            All
                        </button>
                        <button
                            onClick={() => {
                                console.log('Clearing language selection');
                                setSelectedLanguages([]);
                            }}
                            className="text-white/70 hover:text-white underline"
                        >
                            None
                        </button>
                    </div>
                </div>
            </div>

            {/* Single Generate Button */}
            {contentTypes
                .filter(ct => !contentType || ct.type === contentType)
                .map((contentTypeItem) => {
                    const Icon = contentTypeItem.icon;
                    const existingForType = getExistingContentForType(contentTypeItem.type);
                    const isCurrentlyGenerating = isGenerating(contentTypeItem.type);

                    return (
                        <div key={`content-generator-${contentTypeItem.type}`} className="space-y-3">
                            {/* Main Generate Button */}
                            <button
                                onClick={() => {
                                    console.log('🔘 Generate button clicked!', {
                                        contentType: contentTypeItem.type,
                                        selectedLanguages,
                                        programLanguages,
                                        isDisabled: isCurrentlyGenerating || selectedLanguages.length === 0
                                    });
                                    handleGenerate(contentTypeItem.type);
                                }}
                                disabled={isCurrentlyGenerating || selectedLanguages.length === 0}
                                className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                            >
                                {isCurrentlyGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>
                                            {generationProgress ? (
                                                `Generating (${generationProgress.current}/${generationProgress.total})${generationProgress.language ? ` - ${getLanguageFlag(generationProgress.language)}` : ''}`
                                            ) : (
                                                'Generating...'
                                            )}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Icon className="h-4 w-4" />
                                        <span>
                                            {selectedLanguages.length === 0
                                                ? 'Select Languages First'
                                                : `${existingForType.length > 0 ? 'Regenerate All' : 'Generate'} (${selectedLanguages.length})`
                                            }
                                        </span>
                                    </>
                                )}
                            </button>

                            {/* Individual Language Regen Buttons */}
                            {existingForType.length > 0 && (
                                <div className="space-y-2">
                                    {existingForType.map((content, index) => (
                                        <div
                                            key={content._id || `existing-content-${content.type}-${content.language}-${index}`}
                                            className="flex items-center justify-between bg-white/10 rounded-lg p-2"
                                        >
                                            <div className="flex items-center space-x-2 text-white text-sm">
                                                <span>{getLanguageFlag(content.language)}</span>
                                                <span>{getLanguageName(content.language)}</span>
                                                {content.isPublished && (
                                                    <CheckCircle className="h-3 w-3 text-green-400" />
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRegenerate(
                                                    content._id!,
                                                    content.type,
                                                    content.language
                                                )}
                                                disabled={generating === `${content.type}-${content.language}`}
                                                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                            >
                                                {generating === `${content.type}-${content.language}` ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <>
                                                        <RefreshCw className="h-3 w-3" />
                                                        <span>Regen</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
}
