'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import ContentGenerator from '@/components/ContentGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Edit,
    Share,
    Settings,
    Play,
    FileText,
    Video,
    BookOpen,
    Globe,
    Calendar,
    Tag,
    Eye,
    EyeOff,
    Sparkles,
    Download,
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
    const [activeTab, setActiveTab] = useState<'assets' | 'generated'>('assets');
    const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (params.id) {
            fetchProgram();
        }
    }, [params.id]);

    const fetchProgram = async () => {
        try {
            const response = await fetch(`/api/programs/${params.id}`);
            if (!response.ok) {
                throw new Error('Program not found');
            }
            const data = await response.json();
            setProgram(data);

            // Select first asset by default
            if (data.assets && data.assets.length > 0) {
                setSelectedAsset(data.assets[0]);
            }
        } catch (error) {
            console.error('Error fetching program:', error);
            router.push('/programs');
        } finally {
            setLoading(false);
        }
    };

    const handleContentGenerated = (newContent: IGeneratedContent) => {
        if (program) {
            const updatedProgram = {
                ...program,
                generatedContent: [...(program.generatedContent || []), newContent]
            };
            setProgram(updatedProgram);
        }
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
                if (program) {
                    const updatedProgram = {
                        ...program,
                        generatedContent: program.generatedContent?.map(c => 
                            c._id === contentId ? updatedContent : c
                        ) || []
                    };
                    setProgram(updatedProgram);
                }
            }
        } catch (error) {
            console.error('Error regenerating content:', error);
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

    const getContentTypeIcon = (type: string) => {
        switch (type) {
            case 'summary':
                return FileText;
            case 'quiz':
                return BookOpen;
            case 'case_study':
                return BookOpen;
            case 'short_lecture':
                return Video;
            case 'flashcard':
                return BookOpen;
            default:
                return FileText;
        }
    };

    const renderGeneratedContent = (content: IGeneratedContent) => {
        const Icon = getContentTypeIcon(content.type);

        return (
            <Card key={content._id} className="mb-4">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 text-blue-600" />
                            <div>
                                <CardTitle className="text-lg">{content.title}</CardTitle>
                                <CardDescription className="flex items-center space-x-2">
                                    <span>{getLanguageFlag(content.language)} {getLanguageName(content.language)}</span>
                                    <span>•</span>
                                    <span className="capitalize">{content.type.replace('_', ' ')}</span>
                                    {content.isPublished && (
                                        <>
                                            <span>•</span>
                                            <span className="text-green-600 font-medium">Published</span>
                                        </>
                                    )}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Export
                            </Button>
                            <Button variant="outline" size="sm">
                                {content.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4">
                        {content.type === 'quiz' && Array.isArray(content.content) ? (
                            <div className="space-y-4">
                                <h4 className="font-medium">Quiz Questions:</h4>
                                {content.content.slice(0, 2).map((question: any, index: number) => (
                                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                                        <p className="font-medium">{question.question}</p>
                                        <ul className="mt-2 space-y-1">
                                            {question.options?.map((option: string, optIndex: number) => (
                                                <li key={optIndex} className={`text-sm ${optIndex === question.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                                    {optIndex + 1}. {option}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                {content.content.length > 2 && (
                                    <p className="text-sm text-gray-500">
                                        +{content.content.length - 2} more questions...
                                    </p>
                                )}
                            </div>
                        ) : content.type === 'flashcard' && Array.isArray(content.content) ? (
                            <div className="space-y-3">
                                <h4 className="font-medium">Flashcards:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {content.content.slice(0, 4).map((card: any, index: number) => (
                                        <div key={index} className="bg-white rounded border p-3">
                                            <div className="text-sm font-medium text-gray-900 mb-2">
                                                {card.front}
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {card.back}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {content.content.length > 4 && (
                                    <p className="text-sm text-gray-500">
                                        +{content.content.length - 4} more cards...
                                    </p>
                                )}
                            </div>
                        ) : content.type === 'case_study' && typeof content.content === 'object' ? (
                            <div className="space-y-3">
                                <div>
                                    <h4 className="font-medium">Scenario:</h4>
                                    <p className="text-sm text-gray-600 mt-1">{content.content.scenario}</p>
                                </div>
                                {content.content.challenges && (
                                    <div>
                                        <h4 className="font-medium">Key Challenges:</h4>
                                        <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                                            {content.content.challenges.slice(0, 3).map((challenge: string, index: number) => (
                                                <li key={index}>{challenge}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 line-clamp-4">
                                    {typeof content.content === 'string'
                                        ? content.content
                                        : JSON.stringify(content.content).substring(0, 300) + '...'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                        <span>Generated on {new Date(content.generatedAt).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm">
                            View Full Content
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
                        <Button variant="outline" size="sm">
                            <Share className="h-4 w-4 mr-2" />
                            Share
                        </Button>
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
                                        {program.generatedContent?.length || 0} items
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Globe className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Languages</p>
                                    <div className="flex items-center space-x-1">
                                        {program.supportedLanguages?.slice(0, 3).map((lang) => (
                                            <span key={lang} className="text-sm">
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
                                                key={tag}
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

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Assets and Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Asset Viewer */}
                        {selectedAsset && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        {selectedAsset.type === 'video' ? (
                                            <Video className="h-5 w-5" />
                                        ) : (
                                            <FileText className="h-5 w-5" />
                                        )}
                                        <span>{selectedAsset.title}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {selectedAsset.type === 'video' && selectedAsset.url ? (
                                        <YouTubeEmbed
                                            url={selectedAsset.url}
                                            title={selectedAsset.title}
                                        />
                                    ) : selectedAsset.type === 'text' && selectedAsset.content ? (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="prose prose-sm max-w-none">
                                                <pre className="whitespace-pre-wrap text-gray-700">
                                                    {selectedAsset.content}
                                                </pre>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                            <p>Content preview not available</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Content Generation */}
                        {selectedAsset && (
                            <ContentGenerator
                                asset={selectedAsset}
                                programId={program._id}
                                programLanguages={program.supportedLanguages || ['en']}
                                onContentGenerated={handleContentGenerated}
                                existingContent={program.generatedContent?.filter(
                                    content => content.sourceAssetId === selectedAsset._id
                                )}
                            />
                        )}
                    </div>

                    {/* Right Column - Asset List and Generated Content */}
                    <div className="space-y-6">
                        {/* Navigation Tabs */}
                        <div className="border-b border-gray-200">
                            <nav className="-mb-px flex space-x-8">
                                <button
                                    onClick={() => setActiveTab('assets')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'assets'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Assets ({program.assets?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('generated')}
                                    className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'generated'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Generated ({program.generatedContent?.length || 0})
                                </button>
                            </nav>
                        </div>

                        {/* Assets Tab */}
                        {activeTab === 'assets' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Content Assets</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {program.assets && program.assets.length > 0 ? (
                                        <div className="space-y-3">
                                            {program.assets.map((asset, index) => {
                                                const Icon = getAssetIcon(asset.type);
                                                const isSelected = selectedAsset?._id === asset._id;

                                                return (
                                                    <div
                                                        key={asset._id || index}
                                                        onClick={() => setSelectedAsset(asset)}
                                                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'
                                                                    }`}>
                                                                    {asset.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}
                                                                    {asset.fileSize && ` • ${formatFileSize(asset.fileSize)}`}
                                                                </p>
                                                            </div>
                                                            {asset.type === 'video' && (
                                                                <Play className="h-4 w-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600">No assets added yet</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Generated Content Tab */}
                        {activeTab === 'generated' && (
                            <div className="space-y-4">
                                {program.generatedContent && program.generatedContent.length > 0 ? (
                                    program.generatedContent.map((content) => renderGeneratedContent(content))
                                ) : (
                                    <Card>
                                        <CardContent className="text-center py-8">
                                            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 mb-4">No generated content yet</p>
                                            <p className="text-sm text-gray-500">
                                                Select an asset and use the AI generation tools to create summaries, quizzes, and more.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
