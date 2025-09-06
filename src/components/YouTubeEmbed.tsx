'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface YouTubeEmbedProps {
    url: string;
    title?: string;
}

export default function YouTubeEmbed({ url, title }: YouTubeEmbedProps) {
    // Extract video ID from various YouTube URL formats
    const getVideoId = (inputUrl: string): string | null => {
        if (!inputUrl) return null;

        try {
            const urlObj = new URL(inputUrl);

            // Handle different YouTube URL formats
            if (urlObj.hostname.includes('youtu.be')) {
                // youtu.be/VIDEO_ID format
                return urlObj.pathname.slice(1).split('?')[0];
            } else if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.searchParams.has('v')) {
                    // youtube.com/watch?v=VIDEO_ID format
                    return urlObj.searchParams.get('v');
                } else if (urlObj.pathname.includes('/embed/')) {
                    // youtube.com/embed/VIDEO_ID format
                    return urlObj.pathname.split('/embed/')[1].split('?')[0];
                }
            }

            return null;
        } catch (e) {
            console.error('URL parsing error:', e);
            return null;
        }
    };

    const videoId = getVideoId(url);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

    if (!videoId || !embedUrl) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {title || 'Video'}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Externally
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-100 p-8 text-center rounded-lg">
                        <p className="text-gray-600 mb-2">Unable to embed this video</p>
                        <p className="text-sm text-gray-500">URL: {url}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    {title || 'Video'}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(url, '_blank')}
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="bg-black rounded-b-lg overflow-hidden">
                    <iframe
                        width="100%"
                        height="400"
                        src={embedUrl}
                        title={title || "YouTube video player"}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="rounded-b-lg"
                    />
                </div>

                <div className="p-4 bg-gray-50 text-xs text-gray-600 border-t">
                    <div><strong>Video ID:</strong> {videoId}</div>
                    <div><strong>Original URL:</strong> {url}</div>
                    <div><strong>Embed URL:</strong> {embedUrl}</div>
                    <div className="text-green-600 mt-1">✅ Using reliable YouTube embed</div>
                </div>
            </CardContent>
        </Card>
    );
}
