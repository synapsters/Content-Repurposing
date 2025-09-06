'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import ContentGenerator from '@/components/ContentGenerator';
import AudioPlayer from '@/components/AudioPlayer';
import { QuizQuestion, FlashCard, CaseStudy, VideoScript, VideoScene } from '@/lib/ai-service';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Edit,
    FileText,
    Video,
    Volume2,
    Film,
    BookOpen,
    Globe,
    Calendar,
    Tag,
    Eye,
    EyeOff,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Copy,
    RefreshCw
} from 'lucide-react';
import { IProgram, IAsset, IGeneratedContent } from '@/models/Program';
import { getLanguageFlag, getLanguageName, formatFileSize } from '@/lib/utils';

export default function ProgramDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [program, setProgram] = useState<IProgram | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<IAsset | null>(null);
    const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [regeneratingContent, setRegeneratingContent] = useState<Set<string>>(new Set());
    const [generatingContent, setGeneratingContent] = useState<boolean>(false);

    const fetchProgram = useCallback(async () => {
        try {
            const response = await fetch(`/api/programs/${params.id}`);
            if (!response.ok) {
                throw new Error('Program not found');
            }
            const data = await response.json();
            setProgram(data);

            // Preserve currently selected asset if it exists, otherwise select first
            setSelectedAsset(prevSelected => {
                if (prevSelected && data.assets) {
                    // Find the updated version of the currently selected asset
                    const updatedAsset = data.assets.find((asset: any) => asset._id === prevSelected._id);
                    if (updatedAsset) {
                        console.log('🔄 Preserving selected asset with updated data');
                        return updatedAsset;
                    }
                }

                // Fallback to first asset if no previous selection or asset not found
                if (data.assets && data.assets.length > 0) {
                    console.log('🔄 Selecting first asset as default');
                    return data.assets[0];
                }

                return null;
            });

            // Set first supported language as default only if no language is selected
            if (!selectedLanguage && data.supportedLanguages && data.supportedLanguages.length > 0) {
                setSelectedLanguage(data.supportedLanguages[0]);
            }
        } catch (error) {
            console.error('Error fetching program:', error);
            router.push('/programs');
        } finally {
            setLoading(false);
        }
    }, [params.id, router, selectedLanguage]);

    useEffect(() => {
        if (params.id) {
            fetchProgram();
        }
    }, [params.id, fetchProgram]);

    const handleGenerationStart = () => {
        console.log('🚀 Generation started');
        setGeneratingContent(true);
    };

    const handleGenerationEnd = () => {
        console.log('🏁 Generation ended');
        setGeneratingContent(false);
    };

    const handleContentGenerated = async (newContent: IGeneratedContent) => {
        console.log('🔄 Content Generated:', newContent);
        setGeneratingContent(false); // End generation state

        // Fetch the updated program data to get the latest state
        console.log('🔄 Fetching updated program data after generation...');
        await fetchProgram();

        console.log('✅ Program data refreshed after generation');
    };

    const toggleContentExpansion = (contentId: string) => {
        setExpandedContent(prev => {
            const newSet = new Set(prev);
            if (newSet.has(contentId)) {
                newSet.delete(contentId);
            } else {
                newSet.add(contentId);
            }
            return newSet;
        });
    };

    const handleRegenerateContent = async (contentId: string, content: IGeneratedContent) => {
        if (!selectedAsset) return;

        // Add to regenerating set
        setRegeneratingContent(prev => new Set([...prev, contentId]));

        try {
            const sourceContent = selectedAsset.type === 'video'
                ? selectedAsset.url
                : selectedAsset.content;

            const response = await fetch('/api/regenerate-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentId,
                    programId: program?._id,
                    assetId: selectedAsset._id,
                    contentType: content.type,
                    language: content.language,
                    sourceContent
                }),
            });

            if (response.ok) {
                const updatedContent = await response.json();
                console.log('🔄 Content Regenerated:', updatedContent);
                console.log('🔍 Current selectedAsset before update:', selectedAsset._id);
                console.log('🔍 Content ID being updated:', contentId);

                // Fetch the updated program data to get the latest state
                console.log('🔄 Fetching updated program data after regeneration...');
                await fetchProgram();

                console.log('✅ Program data refreshed after regeneration');
            } else {
                console.error('❌ Regeneration failed:', response.status, response.statusText);
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error details:', errorData);
                alert('Failed to regenerate content. Please try again.');
            }
        } catch (error) {
            console.error('Error regenerating content:', error);
            alert('Error regenerating content. Please try again.');
        } finally {
            // Remove from regenerating set
            setRegeneratingContent(prev => {
                const newSet = new Set(prev);
                newSet.delete(contentId);
                return newSet;
            });
        }
    };

    const handlePublishToggle = async () => {
        if (!program) return;

        try {
            const response = await fetch(`/api/programs/${program._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isPublished: !program.isPublished
                }),
            });

            if (response.ok) {
                const updatedProgram = await response.json();
                setProgram(updatedProgram);
            }
        } catch (error) {
            console.error('Error updating program:', error);
        }
    };

    const getAssetIcon = (type: string) => {
        switch (type) {
            case 'video':
                return Video;
            case 'text':
                return FileText;
            default:
                return BookOpen;
        }
    };


    // Helper function to get only the latest version for each content type and language
    const getLatestVersions = (contents: IGeneratedContent[], language?: string, contentType?: string) => {
        let filteredContent = contents.filter(content => content.status === 'published');

        if (language) {
            filteredContent = filteredContent.filter(content => content.language === language);
        }

        if (contentType) {
            filteredContent = filteredContent.filter(content => content.type === contentType);
        }

        // Group by content type and language combination
        const groupedByTypeAndLang = filteredContent.reduce((acc, content) => {
            const key = `${content.type}-${content.language}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(content);
            return acc;
        }, {} as Record<string, IGeneratedContent[]>);

        // Get the latest version for each type-language combination
        const latestVersions: IGeneratedContent[] = [];
        Object.keys(groupedByTypeAndLang).forEach(key => {
            const contentForKey = groupedByTypeAndLang[key];
            const latest = contentForKey.reduce((latest, current) => {
                return (current.version || 1) > (latest.version || 1) ? current : latest;
            });
            latestVersions.push(latest);
        });

        return latestVersions;
    };

    const renderGeneratedContent = (content: IGeneratedContent) => {
        const isExpanded = expandedContent.has(content._id || '');
        const contentId = content._id || '';

        const renderContentPreview = () => {
            if (content.type === 'quiz' && Array.isArray(content.content)) {
                const quizContent = content.content as QuizQuestion[];
                const questionsToShow = isExpanded ? quizContent : quizContent.slice(0, 2);
                return (
                    <div className="space-y-3">
                        {questionsToShow.map((question: QuizQuestion, index: number) => (
                            <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                                <p className="font-medium text-sm mb-3 text-gray-900">{question.question}</p>
                                <div className="space-y-2">
                                    {question.options?.map((option: string, optIndex: number) => (
                                        <div key={optIndex} className="text-sm text-gray-600 flex items-center">
                                            <span className={`w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0 ${optIndex === question.correctAnswer
                                                ? 'border-green-500 bg-green-100'
                                                : 'border-gray-300'
                                                }`}></span>
                                            {option}
                                        </div>
                                    ))}
                                </div>
                                {question.explanation && isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs text-gray-600">
                                            <strong>Explanation:</strong> {question.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {!isExpanded && quizContent.length > 2 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                                +{quizContent.length - 2} more questions...
                            </p>
                        )}
                    </div>
                );
            } else if (content.type === 'flashcard' && Array.isArray(content.content)) {
                const flashcardContent = content.content as FlashCard[];
                const cardsToShow = isExpanded ? flashcardContent : flashcardContent.slice(0, 3);
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cardsToShow.map((card: FlashCard, index: number) => (
                            <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border">
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Front</p>
                                        <p className="font-medium text-sm text-blue-900">{card.front}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">Back</p>
                                        <p className="text-sm text-gray-700">
                                            {isExpanded ? card.back : `${card.back?.substring(0, 100)}${card.back?.length > 100 ? '...' : ''}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!isExpanded && flashcardContent.length > 3 && (
                            <div className="col-span-full">
                                <p className="text-sm text-gray-500 text-center py-2">
                                    +{flashcardContent.length - 3} more cards...
                                </p>
                            </div>
                        )}
                    </div>
                );
            } else if (content.type === 'case_study' && typeof content.content === 'object') {
                const caseStudyContent = content.content as CaseStudy;
                return (
                    <div className="space-y-4">
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                            <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                                <span className="mr-2">📋</span> Scenario
                            </h4>
                            <p className="text-sm text-gray-700">
                                {isExpanded ? caseStudyContent.scenario : `${caseStudyContent.scenario?.substring(0, 200)}${caseStudyContent.scenario?.length > 200 ? '...' : ''}`}
                            </p>
                        </div>
                        {caseStudyContent.challenges && (
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                                    <span className="mr-2">⚠️</span> Key Challenges
                                </h4>
                                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                    {(isExpanded ? caseStudyContent.challenges : caseStudyContent.challenges.slice(0, 3)).map((challenge: string, index: number) => (
                                        <li key={index}>{challenge}</li>
                                    ))}
                                </ul>
                                {!isExpanded && caseStudyContent.challenges.length > 3 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        +{caseStudyContent.challenges.length - 3} more challenges...
                                    </p>
                                )}
                            </div>
                        )}
                        {caseStudyContent.questions && isExpanded && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                                    <span className="mr-2">❓</span> Questions
                                </h4>
                                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                    {caseStudyContent.questions.map((question: string, index: number) => (
                                        <li key={index}>{question}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {caseStudyContent.learningObjectives && isExpanded && (
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                                    <span className="mr-2">🎯</span> Learning Objectives
                                </h4>
                                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                    {caseStudyContent.learningObjectives.map((objective: string, index: number) => (
                                        <li key={index}>{objective}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            } else if (content.type === 'audio_track' && typeof content.content === 'string') {
                const audioScript = content.content;
                return (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                    <Volume2 className="h-5 w-5 text-indigo-600 mr-2" />
                                    <h4 className="font-semibold text-indigo-800">Audio Narration Script</h4>
                                </div>
                                <AudioPlayer
                                    text={audioScript}
                                    language={content.language}
                                    className="flex-shrink-0"
                                />
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-indigo-100">
                                <pre className="whitespace-pre-wrap text-gray-700 text-sm font-mono leading-relaxed">
                                    {isExpanded ? audioScript : `${audioScript.substring(0, 500)}${audioScript.length > 500 ? '...' : ''}`}
                                </pre>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center text-xs text-indigo-600">
                                    <span className="mr-2">🎵</span>
                                    <span>Click play button to listen to narration</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Text-to-Speech Ready
                                </div>
                            </div>
                        </div>
                    </div>
                );
            } else if (content.type === 'video_script' && typeof content.content === 'object') {
                const videoScript = content.content as VideoScript;
                return (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
                            <div className="flex items-center mb-3">
                                <Film className="h-5 w-5 text-red-600 mr-2" />
                                <h4 className="font-semibold text-red-800">Video Script & Storyboard</h4>
                            </div>

                            {/* Video Overview */}
                            <div className="bg-white rounded-lg p-4 border border-red-100 mb-4">
                                <h5 className="font-semibold text-gray-900 mb-2">{videoScript.title}</h5>
                                <p className="text-sm text-gray-700 mb-2">{videoScript.description}</p>
                                <div className="flex items-center text-xs text-red-600">
                                    <span className="mr-2">⏱️</span>
                                    <span>Duration: {videoScript.duration}</span>
                                </div>
                            </div>

                            {/* Scenes */}
                            <div className="space-y-3">
                                <h5 className="font-semibold text-red-800 flex items-center">
                                    <span className="mr-2">🎬</span>
                                    Scenes & Storyboard
                                </h5>
                                {videoScript.scenes && (isExpanded ? videoScript.scenes : videoScript.scenes.slice(0, 3)).map((scene: VideoScene, index: number) => (
                                    <div key={index} className="bg-white rounded-lg p-4 border border-red-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-semibold text-sm text-red-700">Scene {scene.sceneNumber}</span>
                                            <span className="text-xs text-gray-500">{scene.duration}</span>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-xs font-medium text-gray-600 mb-1">Visual Description:</p>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{scene.visualDescription}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-600 mb-1">Voiceover:</p>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{scene.voiceoverText}</p>
                                            </div>
                                        </div>

                                        {scene.onScreenText && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-gray-600 mb-1">On-Screen Text:</p>
                                                <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded font-medium">{scene.onScreenText}</p>
                                            </div>
                                        )}

                                        {scene.transitions && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-gray-600 mb-1">Transition:</p>
                                                <p className="text-xs text-gray-600 italic">{scene.transitions}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {!isExpanded && videoScript.scenes && videoScript.scenes.length > 3 && (
                                    <p className="text-sm text-gray-500 text-center py-2">
                                        +{videoScript.scenes.length - 3} more scenes...
                                    </p>
                                )}
                            </div>

                            {/* Call to Action */}
                            {videoScript.callToAction && isExpanded && (
                                <div className="mt-4 bg-gradient-to-r from-red-100 to-pink-100 rounded-lg p-3 border border-red-200">
                                    <h5 className="font-semibold text-red-800 mb-2 flex items-center">
                                        <span className="mr-2">📢</span>
                                        Call to Action
                                    </h5>
                                    <p className="text-sm text-red-700">{videoScript.callToAction}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            } else {
                // Handle summary, short_lecture, and other text content
                const textContent = typeof content.content === 'string'
                    ? content.content
                    : JSON.stringify(content.content, null, 2);

                const displayContent = isExpanded ? textContent : `${textContent.substring(0, 400)}${textContent.length > 400 ? '...' : ''}`;

                // Use markdown rendering for summary and short_lecture content
                if (content.type === 'summary' || content.type === 'short_lecture') {
                    return (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="prose prose-sm max-w-none text-gray-700">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-gray-900 mb-3" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-gray-800 mb-2" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-base font-medium text-gray-800 mb-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                                        em: ({ node, ...props }) => <em className="italic text-gray-800" {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />,
                                        pre: ({ node, ...props }) => <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto text-sm" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-200 pl-4 italic text-gray-600 mb-3" {...props} />,
                                        table: ({ node, ...props }) => <table className="min-w-full border border-gray-200 mb-3" {...props} />,
                                        th: ({ node, ...props }) => <th className="border border-gray-200 px-3 py-2 bg-gray-50 font-semibold text-left" {...props} />,
                                        td: ({ node, ...props }) => <td className="border border-gray-200 px-3 py-2" {...props} />,
                                    }}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            </div>
                        </div>
                    );
                } else {
                    // For other content types, use the original pre formatting
                    return (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <pre className="whitespace-pre-wrap text-gray-700 text-sm font-sans leading-relaxed">
                                {displayContent}
                            </pre>
                        </div>
                    );
                }
            }
        };

        const getContentTypeColor = (type: string) => {
            switch (type) {
                case 'quiz': return 'from-green-400 to-blue-500';
                case 'flashcard': return 'from-purple-400 to-pink-500';
                case 'case_study': return 'from-orange-400 to-red-500';
                case 'summary': return 'from-blue-400 to-indigo-500';
                case 'short_lecture': return 'from-teal-400 to-cyan-500';
                default: return 'from-gray-400 to-gray-500';
            }
        };

        const getContentTypeEmoji = (type: string) => {
            switch (type) {
                case 'quiz': return '🧠';
                case 'flashcard': return '📚';
                case 'case_study': return '📋';
                case 'summary': return '📝';
                case 'short_lecture': return '🎓';
                default: return '📄';
            }
        };

        return (
            <Card key={contentId} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <div className={`h-2 bg-gradient-to-r ${getContentTypeColor(content.type)}`}></div>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${getContentTypeColor(content.type)} text-white shadow-sm`}>
                                <span className="text-lg">{getContentTypeEmoji(content.type)}</span>
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                                    {content.type.replace('_', ' ').toUpperCase()}
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                    {content.isPublished && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 block"></span>
                                            Published
                                        </span>
                                    )}
                                    {content.version && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                                            v{content.version}
                                        </span>
                                    )}
                                    <span>{new Date(content.generatedAt).toLocaleDateString()}</span>
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="bg-white rounded-lg border border-gray-100 p-3 mb-3">
                        {renderContentPreview()}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRegenerateContent(contentId, content)}
                                disabled={regeneratingContent.has(contentId)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 h-7 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3 w-3 mr-1 ${regeneratingContent.has(contentId) ? 'animate-spin' : ''}`} />
                                <span className="text-xs">
                                    {regeneratingContent.has(contentId) ? 'Regenerating...' : 'Regenerate'}
                                </span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(
                                    typeof content.content === 'string'
                                        ? content.content
                                        : JSON.stringify(content.content, null, 2)
                                )}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 h-7"
                            >
                                <Copy className="h-3 w-3 mr-1" />
                                <span className="text-xs">Copy</span>
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleContentExpansion(contentId)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 h-7"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    <span className="text-xs">Less</span>
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    <span className="text-xs">More</span>
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    if (!program) {
        return (
            <Layout>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Program not found</h2>
                    <Button onClick={() => router.push('/programs')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Programs
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/programs')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{program.title}</h1>
                            <p className="text-gray-600 mt-1">{program.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                        {/* <Button variant="outline" size="sm">
                            <Share className="h-4 w-4 mr-2" />
                            Share
                        </Button> */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/programs/${params.id}/edit`)}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                        <Button
                            variant={program.isPublished ? "outline" : "default"}
                            size="sm"
                            onClick={handlePublishToggle}
                        >
                            {program.isPublished ? (
                                <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Unpublish
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Publish
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Program Info */}
                <Card>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Created</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(program.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <BookOpen className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Assets</p>
                                    <p className="text-sm text-gray-600">
                                        {program.assets?.length || 0} items
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Sparkles className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Generated</p>
                                    <p className="text-sm text-gray-600">
                                        {program.assets.reduce((total, asset) => total + (asset.generatedContent?.length || 0), 0)} items
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Globe className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Languages</p>
                                    <div className="flex items-center space-x-1">
                                        {program.supportedLanguages?.slice(0, 3).map((lang) => (
                                            <span key={`lang-flag-${lang}`} className="text-sm">
                                                {getLanguageFlag(lang)}
                                            </span>
                                        ))}
                                        {(program.supportedLanguages?.length || 0) > 3 && (
                                            <span className="text-xs text-gray-500">
                                                +{(program.supportedLanguages?.length || 0) - 3}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {program.tags && program.tags.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    <Tag className="h-4 w-4 text-gray-400" />
                                    <div className="flex flex-wrap gap-2">
                                        {program.tags.map((tag) => (
                                            <span
                                                key={`tag-${tag}`}
                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Content - Clean Design */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column - Assets & Generation (2/5 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Assets Section */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                                    Content Assets
                                </h2>
                            </div>
                            <div className="p-6">
                                {program.assets && program.assets.length > 0 ? (
                                    <div className="space-y-3">
                                        {program.assets.map((asset, index) => {
                                            const Icon = getAssetIcon(asset.type);
                                            const isSelected = selectedAsset?._id === asset._id;

                                            return (
                                                <div
                                                    key={asset._id || `asset-${index}`}
                                                    onClick={() => setSelectedAsset(asset)}
                                                    className={`group p-4 rounded-xl cursor-pointer transition-all duration-300 ${isSelected
                                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md'
                                                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div className="flex items-center space-x-4">
                                                        <div className={`p-3 rounded-lg transition-colors ${isSelected
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'bg-white text-gray-500 group-hover:bg-gray-200'
                                                            }`}>
                                                            <Icon className="h-6 w-6" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                                                {asset.title}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                                                                {asset.fileSize && ` • ${formatFileSize(asset.fileSize)}`}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">No assets added yet</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Generation Section */}
                        {selectedAsset && (
                            <div key={`generation-${selectedAsset._id}-${refreshTrigger}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
                                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                        <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                                        AI Generation
                                    </h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    {[
                                        { type: 'summary', icon: '📝', label: 'Summary', gradient: 'from-blue-500 to-blue-600' },
                                        { type: 'quiz', icon: '🧠', label: 'Quiz', gradient: 'from-green-500 to-green-600' },
                                        { type: 'flashcard', icon: '📚', label: 'Flashcards', gradient: 'from-purple-500 to-purple-600' },
                                        { type: 'case_study', icon: '📋', label: 'Case Study', gradient: 'from-orange-500 to-orange-600' },
                                        { type: 'short_lecture', icon: '🎓', label: 'Short Lecture', gradient: 'from-teal-500 to-teal-600' },
                                        { type: 'audio_track', icon: '🎵', label: 'Audio Track', gradient: 'from-indigo-500 to-indigo-600' },
                                        // { type: 'video_script', icon: '🎬', label: 'Video Script', gradient: 'from-red-500 to-red-600' }
                                    ].map(({ type, icon, label, gradient }) => {
                                        const existingContent = getLatestVersions(selectedAsset.generatedContent || [], undefined, type);

                                        return (
                                            <div key={`generation-type-${type}`} className="group">
                                                <div className={`bg-gradient-to-r ${gradient} rounded-lg p-4 text-white shadow-sm`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center space-x-3">
                                                            <span className="text-2xl">{icon}</span>
                                                            <span className="font-semibold text-lg">{label}</span>
                                                        </div>
                                                        {existingContent.length > 0 && (
                                                            <div className="bg-white/20 px-3 py-1 rounded-full">
                                                                <span className="text-xs font-medium">{existingContent.length} generated</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <ContentGenerator
                                                        asset={selectedAsset}
                                                        programId={program._id as string}
                                                        programLanguages={(() => {
                                                            const langs = program.supportedLanguages || ['en'];
                                                            console.log('📤 Passing to ContentGenerator:', {
                                                                type,
                                                                programLanguages: langs,
                                                                existingContentLength: selectedAsset.generatedContent?.length || 0
                                                            });
                                                            return langs;
                                                        })()}
                                                        onContentGenerated={handleContentGenerated}
                                                        onGenerationStart={handleGenerationStart}
                                                        onGenerationEnd={handleGenerationEnd}
                                                        existingContent={selectedAsset.generatedContent || []}
                                                        contentType={type}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Asset Display & Generated Content (3/5 width) */}
                    <div className="lg:col-span-3 space-y-6">
                        {selectedAsset ? (
                            <>
                                {/* Selected Asset Display */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                            {selectedAsset.type === 'video' ? (
                                                <Video className="h-5 w-5 mr-2 text-blue-600" />
                                            ) : (
                                                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                                            )}
                                            {selectedAsset.title}
                                        </h2>
                                    </div>
                                    <div className="p-0">
                                        {selectedAsset.type === 'video' && selectedAsset.url ? (
                                            <div className="aspect-video">
                                                <YouTubeEmbed
                                                    url={selectedAsset.url}
                                                    title={selectedAsset.title}
                                                />
                                            </div>
                                        ) : selectedAsset.type === 'text' && selectedAsset.content ? (
                                            <div className="p-6">
                                                <div className="bg-gray-50 rounded-lg p-6">
                                                    <pre className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
                                                        {selectedAsset.content}
                                                    </pre>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 text-gray-500">
                                                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                                <p className="font-medium">Content preview not available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Language Settings */}
                                {/* <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                            <Globe className="h-5 w-5 mr-2 text-green-600" />
                                            Supported Languages
                                        </h2>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {(program.supportedLanguages || ['en']).map(language => (
                                                <div key={`language-setting-${language}`} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xl">{getLanguageFlag(language)}</span>
                                                        <span className="text-sm font-medium text-gray-700">{getLanguageName(language)}</span>
                                                    </div>
                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-medium">
                                                        {getLatestVersions(selectedAsset.generatedContent || [], language).length}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div> */}

                                {/* Loading Indicators */}
                                {(regeneratingContent.size > 0 || generatingContent) && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <div>
                                                {regeneratingContent.size > 0 && (
                                                    <>
                                                        <p className="text-blue-800 font-medium">Regenerating Content...</p>
                                                        <p className="text-blue-600 text-sm">
                                                            {regeneratingContent.size} item{regeneratingContent.size > 1 ? 's' : ''} being updated
                                                        </p>
                                                    </>
                                                )}
                                                {generatingContent && (
                                                    <>
                                                        <p className="text-blue-800 font-medium">Generating New Content...</p>
                                                        <p className="text-blue-600 text-sm">
                                                            Creating content with AI, please wait...
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Language Tabs & Generated Content */}
                                {selectedAsset.generatedContent && selectedAsset.generatedContent.length > 0 && (
                                    <div key={`content-${refreshTrigger}`} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
                                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                                <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                                                Generated Content
                                            </h2>
                                        </div>
                                        <div className="p-6">
                                            {/* Language Tabs */}
                                            <div className="border-b border-gray-200 mb-6">
                                                <nav className="-mb-px flex flex-wrap gap-2">
                                                    {(program.supportedLanguages || ['en']).map(language => {
                                                        const languageContent = getLatestVersions(selectedAsset.generatedContent || [], language);

                                                        if (languageContent.length === 0) return null;

                                                        return (
                                                            <button
                                                                key={`language-tab-${language}`}
                                                                onClick={() => setSelectedLanguage(language)}
                                                                className={`py-3 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${selectedLanguage === language
                                                                    ? 'border-purple-500 text-purple-600 bg-purple-50'
                                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                                    } rounded-t-lg`}
                                                            >
                                                                <span className="text-lg">{getLanguageFlag(language)}</span>
                                                                <span className="font-semibold">{getLanguageName(language)}</span>
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                                                                    {languageContent.length}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </nav>
                                            </div>

                                            {/* Generated Content for Selected Language */}
                                            <div className="space-y-6">
                                                {getLatestVersions(selectedAsset.generatedContent || [], selectedLanguage)
                                                    .map((content) => (
                                                        <div key={`${content._id}-${content.generatedAt}-${refreshTrigger}`} className="w-full">
                                                            {renderGeneratedContent(content)}
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="text-center py-24">
                                    <div className="max-w-md mx-auto">
                                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <BookOpen className="h-10 w-10 text-blue-600" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">Select an Asset</h3>
                                        <p className="text-gray-500 leading-relaxed">
                                            Choose an asset from the left panel to view its content and generate AI-powered materials.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
