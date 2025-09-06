'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Save,
    ArrowLeft,
    Plus,
    Video,
    FileText,
    File,
    X,
    Globe,
    Youtube
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supportedLanguages, formatFileSize } from '@/lib/utils';

interface Asset {
    type: 'video' | 'text' | 'document';
    title: string;
    content?: string;
    url?: string;
    file?: File;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
}

export default function CreateProgramPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        tags: [] as string[],
        supportedLanguages: ['en'] as string[]
    });
    const [assets, setAssets] = useState<Asset[]>([]);
    const [currentTag, setCurrentTag] = useState('');
    const [activeTab, setActiveTab] = useState<'details' | 'assets'>('details');
    const [videoInput, setVideoInput] = useState('');

    const onDrop = async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            const asset: Asset = {
                type: 'document',
                title: file.name,
                file,
                fileSize: file.size,
                mimeType: file.type
            };

            // Upload file and get URL
            try {
                const formData = new FormData();
                formData.append('file', file);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    asset.url = uploadResult.url;
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                // Continue with file object for now
            }


            setAssets(prev => [...prev, asset]);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt']
        }
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddTag = () => {
        if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, currentTag.trim()]
            }));
            setCurrentTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    };

    const toggleLanguage = (languageCode: string) => {
        setFormData(prev => ({
            ...prev,
            supportedLanguages: prev.supportedLanguages.includes(languageCode)
                ? prev.supportedLanguages.filter(lang => lang !== languageCode)
                : [...prev.supportedLanguages, languageCode]
        }));
    };

    const addTextAsset = () => {
        setAssets(prev => [...prev, {
            type: 'text',
            title: 'New Text Asset',
            content: ''
        }]);
    };

    const addVideoFromInput = () => {
        if (!videoInput.trim()) return;

        let url = videoInput.trim();
        let title = 'YouTube Video';
        let videoId = '';

        // Extract video ID from various YouTube URL formats
        if (url.includes('<iframe')) {
            // Handle iframe embed code
            const srcMatch = url.match(/src="([^"]*)/);
            if (srcMatch) {
                url = srcMatch[1];
            }
        }

        // Extract video ID from different YouTube URL formats
        if (url.includes('youtube.com/embed/')) {
            videoId = url.split('youtube.com/embed/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('watch?v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com') && url.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        }

        if (!videoId) {
            alert('Please enter a valid YouTube URL or embed code');
            return;
        }

        // Store as standard YouTube watch URL
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const asset: Asset = {
            type: 'video',
            title,
            url: cleanUrl
        };

        setAssets(prev => [...prev, asset]);
        setVideoInput('');
    };

    const updateAsset = (index: number, updates: Partial<Asset>) => {
        setAssets(prev => prev.map((asset, i) =>
            i === index ? { ...asset, ...updates } : asset
        ));
    };

    const removeAsset = (index: number) => {
        setAssets(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            // Create the program first
            const programResponse = await fetch('/api/programs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!programResponse.ok) {
                throw new Error('Failed to create program');
            }

            const program = await programResponse.json();

            // If we have assets, we would upload them here
            // For now, we'll just add them to the program
            if (assets.length > 0) {
                const assetsToAdd = assets.map(asset => ({
                    type: asset.type,
                    title: asset.title,
                    content: asset.content,
                    url: asset.url,
                    duration: asset.duration,
                    fileSize: asset.fileSize,
                    mimeType: asset.mimeType,
                    uploadedAt: new Date()
                }));

                const updateResponse = await fetch(`/api/programs/${program._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        assets: assetsToAdd
                    }),
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to add assets');
                }
            }

            router.push(`/programs/${program._id}`);
        } catch (error) {
            console.error('Error creating program:', error);
            alert('Failed to create program. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getAssetIcon = (type: string) => {
        switch (type) {
            case 'video':
                return Video;
            case 'text':
                return FileText;
            default:
                return File;
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Program</h1>
                        <p className="text-gray-600">
                            Set up a new content program for AI-powered repurposing
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'details'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Program Details
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('assets')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'assets'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Content Assets ({assets.length})
                            </button>
                        </nav>
                    </div>

                    {/* Program Details Tab */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                    <CardDescription>
                                        Provide basic details about your content program
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Program Title *
                                        </label>
                                        <Input
                                            value={formData.title}
                                            onChange={(e) => handleInputChange('title', e.target.value)}
                                            placeholder="Enter program title"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description *
                                        </label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="Describe your program and its learning objectives"
                                            rows={4}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tags
                                        </label>
                                        <div className="flex space-x-2 mb-2">
                                            <Input
                                                value={currentTag}
                                                onChange={(e) => setCurrentTag(e.target.value)}
                                                placeholder="Add a tag"
                                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                            />
                                            <Button type="button" onClick={handleAddTag} variant="outline">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {formData.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {formData.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                                    >
                                                        {tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveTag(tag)}
                                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Globe className="h-5 w-5" />
                                        <span>Supported Languages</span>
                                    </CardTitle>
                                    <CardDescription>
                                        Select languages for content localization
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {supportedLanguages.map((language) => (
                                            <Button
                                                key={language.code}
                                                type="button"
                                                variant={formData.supportedLanguages.includes(language.code) ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => toggleLanguage(language.code)}
                                                className="justify-start"
                                            >
                                                <span className="mr-2">{language.flag}</span>
                                                {language.name}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Assets Tab */}
                    {activeTab === 'assets' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Upload Content Assets</CardTitle>
                                    <CardDescription>
                                        Add videos, documents, and text content to your program
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* YouTube Video Embedding */}
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 mb-4">
                                            <Youtube className="h-5 w-5 text-red-600" />
                                            <h4 className="font-medium text-gray-900">YouTube Video Embedding</h4>
                                        </div>

                                        <div className="flex space-x-2">
                                            <Input
                                                value={videoInput}
                                                onChange={(e) => setVideoInput(e.target.value)}
                                                placeholder="Enter YouTube URL or iframe embed code"
                                                className="flex-1"
                                            />
                                            <Button type="button" onClick={addVideoFromInput} variant="outline">
                                                <Youtube className="h-4 w-4 mr-2" />
                                                Add Video
                                            </Button>
                                        </div>

                                        <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
                                            <p className="font-medium text-blue-800 mb-1">Supported formats:</p>
                                            <ul className="space-y-1 text-blue-700">
                                                <li>• https://www.youtube.com/watch?v=VIDEO_ID</li>
                                                <li>• https://youtu.be/VIDEO_ID</li>
                                                <li>• https://www.youtube.com/embed/VIDEO_ID</li>
                                                <li>• &lt;iframe&gt; embed code from YouTube</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Document Upload */}
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2 mb-4">
                                            <File className="h-5 w-5 text-gray-600" />
                                            <h4 className="font-medium text-gray-900">Document Upload</h4>
                                        </div>

                                        <div
                                            {...getRootProps()}
                                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                        >
                                            <input {...getInputProps()} />
                                            <File className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                            {isDragActive ? (
                                                <p className="text-blue-600 font-medium">Drop documents here...</p>
                                            ) : (
                                                <div>
                                                    <p className="text-gray-600 mb-1 font-medium">
                                                        Drag & drop documents here, or click to select
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        Supports: PDF, DOC, DOCX, TXT
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <Button type="button" onClick={addTextAsset} variant="outline">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Add Text Content
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assets List */}
                            {assets.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Added Assets</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {assets.map((asset, index) => {
                                                const Icon = getAssetIcon(asset.type);
                                                return (
                                                    <div key={index} className="border rounded-lg p-4">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center space-x-3">
                                                                <Icon className="h-5 w-5 text-gray-500" />
                                                                <div>
                                                                    <Input
                                                                        value={asset.title}
                                                                        onChange={(e) => updateAsset(index, { title: e.target.value })}
                                                                        className="font-medium"
                                                                    />
                                                                    {asset.fileSize && (
                                                                        <p className="text-sm text-gray-500 mt-1">
                                                                            {formatFileSize(asset.fileSize)}
                                                                            {asset.mimeType && ` • ${asset.mimeType}`}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeAsset(index)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>

                                                        {asset.type === 'text' && (
                                                            <Textarea
                                                                value={asset.content || ''}
                                                                onChange={(e) => updateAsset(index, { content: e.target.value })}
                                                                placeholder="Enter your text content here..."
                                                                rows={4}
                                                            />
                                                        )}

                                                        {asset.type === 'video' && asset.url && (
                                                            <div className="mt-3 p-3 bg-gray-50 rounded">
                                                                <p className="text-sm text-gray-600 mb-2">Video URL:</p>
                                                                <Input
                                                                    value={asset.url}
                                                                    onChange={(e) => updateAsset(index, { url: e.target.value })}
                                                                    placeholder="Video URL"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Create Program
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
