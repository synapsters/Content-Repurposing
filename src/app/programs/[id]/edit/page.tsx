'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Save,
    ArrowLeft,
    Video,
    FileText,
    File,
    Globe,
    Youtube,
    Trash2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supportedLanguages, formatFileSize, getLanguageFlag } from '@/lib/utils';
import { IProgram, IAsset } from '@/models/Program';

interface ExtendedAsset extends IAsset {
    isNew?: boolean;
    toDelete?: boolean;
}

function EditProgramPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [program, setProgram] = useState<IProgram | null>(null);
    const [assets, setAssets] = useState<ExtendedAsset[]>([]);
    const [videoInput, setVideoInput] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        tags: [] as string[],
        supportedLanguages: ['en'] as string[]
    });

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
            setAssets(data.assets || []);

            setFormData({
                title: data.title || '',
                description: data.description || '',
                tags: data.tags || [],
                supportedLanguages: data.supportedLanguages || ['en']
            });
        } catch (error) {
            console.error('Error fetching program:', error);
            router.push('/programs');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string | string[]) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const onDrop = async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('Upload failed');
                }

                const { url } = await response.json();

                const newAsset: ExtendedAsset = {
                    type: 'document',
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    url,
                    fileSize: file.size,
                    mimeType: file.type,
                    uploadedAt: new Date().toISOString(),
                    isNew: true
                };

                setAssets(prev => [...prev, newAsset]);
            } catch (error) {
                console.error('Error uploading file:', error);
                alert(`Failed to upload ${file.name}`);
            }
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

    const addVideoFromInput = () => {
        if (!videoInput.trim()) return;

        let url = videoInput.trim();
        const title = 'YouTube Video';
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

        const newAsset: ExtendedAsset = {
            type: 'video',
            title,
            url: cleanUrl,
            uploadedAt: new Date().toISOString(),
            isNew: true
        };

        setAssets(prev => [...prev, newAsset]);
        setVideoInput('');
    };

    const updateAsset = (index: number, updates: Partial<ExtendedAsset>) => {
        setAssets(prev => prev.map((asset, i) =>
            i === index ? { ...asset, ...updates } : asset
        ));
    };

    const removeAsset = (index: number) => {
        setAssets(prev => {
            const asset = prev[index];
            if (asset.isNew) {
                // Remove new assets completely
                return prev.filter((_, i) => i !== index);
            } else {
                // Mark existing assets for deletion
                return prev.map((a, i) =>
                    i === index ? { ...a, toDelete: true } : a
                );
            }
        });
    };

    const addTextAsset = () => {
        const newAsset: ExtendedAsset = {
            type: 'text',
            title: 'New Text Asset',
            content: '',
            uploadedAt: new Date().toISOString(),
            isNew: true
        };
        setAssets(prev => [...prev, newAsset]);
    };

    const toggleLanguage = (langCode: string) => {
        setFormData(prev => ({
            ...prev,
            supportedLanguages: prev.supportedLanguages.includes(langCode)
                ? prev.supportedLanguages.filter(l => l !== langCode)
                : [...prev.supportedLanguages, langCode]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.description) {
            alert('Please fill in all required fields');
            return;
        }

        setSaving(true);

        try {
            // Filter out deleted assets and prepare assets for saving
            const assetsToSave = assets
                .filter(asset => !asset.toDelete)
                .map(asset => {
                    const { isNew: _isNew, toDelete: _toDelete, ...cleanAsset } = asset;
                    return cleanAsset;
                });

            const updateData = {
                ...formData,
                assets: assetsToSave
            };

            const response = await fetch(`/api/programs/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                throw new Error('Failed to update program');
            }

            router.push(`/programs/${params.id}`);
        } catch (error) {
            console.error('Error updating program:', error);
            alert('Failed to update program. Please try again.');
        } finally {
            setSaving(false);
        }
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
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/programs/${params.id}`)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Program</h1>
                        <p className="text-gray-600">
                            Update your content program and manage assets
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Basic Information</CardTitle>
                            <CardDescription>
                                Update basic details about your content program
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
                                <Input
                                    value={formData.tags.join(', ')}
                                    onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                                    placeholder="Enter tags separated by commas"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Supported Languages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Globe className="h-5 w-5 mr-2" />
                                Supported Languages
                            </CardTitle>
                            <CardDescription>
                                Select languages for content generation and localization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {supportedLanguages.map((lang) => (
                                    <label key={lang.code} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.supportedLanguages.includes(lang.code)}
                                            onChange={() => toggleLanguage(lang.code)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-lg">{getLanguageFlag(lang.code)}</span>
                                        <span className="text-sm text-gray-700">{lang.name}</span>
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assets Management */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Assets Management</CardTitle>
                            <CardDescription>
                                Add and manage video, text, and document assets for your program
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Add Video Asset */}
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
                                    <Button
                                        type="button"
                                        onClick={addVideoFromInput}
                                        disabled={!videoInput.trim()}
                                        variant="outline"
                                    >
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

                            {/* Add Text Asset */}
                            <div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addTextAsset}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Add Text Asset
                                </Button>
                            </div>

                            {/* Assets List */}
                            {assets.filter(asset => !asset.toDelete).length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-gray-900">Current Assets</h4>
                                    {assets.filter(asset => !asset.toDelete).map((asset, index) => (
                                        <Card key={index} className="relative">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        {asset.type === 'video' && <Video className="h-5 w-5 text-blue-500" />}
                                                        {asset.type === 'text' && <FileText className="h-5 w-5 text-green-500" />}
                                                        {asset.type === 'document' && <File className="h-5 w-5 text-red-500" />}

                                                        <div className="flex-1 space-y-2">
                                                            <Input
                                                                value={asset.title}
                                                                onChange={(e) => updateAsset(index, { title: e.target.value })}
                                                                placeholder="Asset title"
                                                                className="font-medium"
                                                            />

                                                            {asset.type === 'text' && (
                                                                <Textarea
                                                                    value={asset.content || ''}
                                                                    onChange={(e) => updateAsset(index, { content: e.target.value })}
                                                                    placeholder="Enter text content..."
                                                                    rows={3}
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

                                                            {asset.fileSize && (
                                                                <p className="text-xs text-gray-500">
                                                                    Size: {formatFileSize(asset.fileSize)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeAsset(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/programs/${params.id}`)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}

export default EditProgramPage;