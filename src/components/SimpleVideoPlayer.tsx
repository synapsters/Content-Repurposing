'use client';

import { useState } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, ExternalLink } from 'lucide-react';

interface SimpleVideoPlayerProps {
    url: string;
    title?: string;
}

export default function SimpleVideoPlayer({ url, title }: SimpleVideoPlayerProps) {
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [useEmbedFallback, setUseEmbedFallback] = useState(false);

    // Clean the URL - remove playlist and other parameters
    const cleanUrl = (inputUrl: string): string => {
        if (!inputUrl) return inputUrl;

        try {
            const urlObj = new URL(inputUrl);

            // For YouTube URLs, keep only the video ID and remove extra parameters
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
                let videoId = '';

                if (urlObj.hostname.includes('youtu.be')) {
                    // Handle youtu.be/VIDEO_ID format
                    videoId = urlObj.pathname.slice(1).split('?')[0];
                } else if (urlObj.searchParams.has('v')) {
                    // Handle youtube.com/watch?v=VIDEO_ID format
                    videoId = urlObj.searchParams.get('v') || '';
                } else if (urlObj.pathname.includes('/embed/')) {
                    // Handle youtube.com/embed/VIDEO_ID format
                    videoId = urlObj.pathname.split('/embed/')[1].split('?')[0];
                }

                if (videoId) {
                    // Return clean YouTube URL without extra parameters
                    return `https://www.youtube.com/watch?v=${videoId}`;
                }
            }

            return inputUrl;
        } catch (e) {
            console.error('URL parsing error:', e);
            return inputUrl;
        }
    };

    const cleanedUrl = cleanUrl(url);
    const canPlay = ReactPlayer?.canPlay ? ReactPlayer.canPlay(cleanedUrl) : true;

    console.log('Original URL:', url);
    console.log('Cleaned URL:', cleanedUrl);
    console.log('Can Play:', canPlay);

    const handlePlayPause = () => {
        setPlaying(!playing);
    };

    const handleReady = () => {
        console.log('Video ready');
        setReady(true);
        setError(null);
    };

    const handleError = (error: Error | string) => {
        console.error('Video error:', error);
        setError('Failed to load video. Trying YouTube embed fallback...');
        setReady(false);

        // For YouTube videos, try the embed fallback
        if (cleanedUrl.includes('youtube.com')) {
            setTimeout(() => {
                setUseEmbedFallback(true);
                setError(null);
            }, 1000);
        }
    };

    if (!canPlay) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {title || 'Video'}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(cleanedUrl, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Externally
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-gray-100 p-8 text-center rounded-lg">
                        <p className="text-gray-600 mb-2">This video format is not supported by the built-in player.</p>
                        <p className="text-sm text-gray-500">URL: {cleanedUrl}</p>
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
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePlayPause}
                            disabled={!ready}
                        >
                            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(cleanedUrl, '_blank')}
                        >
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                        <p className="text-red-600 font-medium">Video Error</p>
                        <p className="text-red-500 text-sm mt-1">{error}</p>
                        <p className="text-xs text-gray-500 mt-2">URL: {cleanedUrl}</p>
                        <div className="flex space-x-2 mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setError(null);
                                    setReady(false);
                                    setUseEmbedFallback(false);
                                }}
                            >
                                Retry ReactPlayer
                            </Button>
                            {cleanedUrl.includes('youtube.com') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setUseEmbedFallback(true);
                                        setError(null);
                                    }}
                                >
                                    Try YouTube Embed
                                </Button>
                            )}
                        </div>
                    </div>
                ) : useEmbedFallback && cleanedUrl.includes('youtube.com') ? (
                    <div className="bg-black rounded-lg overflow-hidden">
                        <iframe
                            width="100%"
                            height="400"
                            src={`https://www.youtube.com/embed/${cleanedUrl.split('v=')[1]?.split('&')[0]}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                        <p className="text-sm text-green-600 mt-2 px-2">✅ Using YouTube embed fallback</p>
                    </div>
                ) : (
                    <div className="relative bg-black rounded-lg overflow-hidden">
                        <ReactPlayer
                            url={cleanedUrl}
                            playing={playing}
                            controls={true}
                            width="100%"
                            height="400px"
                            onReady={handleReady}
                            onError={handleError}
                            onStart={() => {
                                console.log('Video started playing');
                                setReady(true);
                            }}
                            onPlay={() => {
                                console.log('Video play event');
                                setPlaying(true);
                            }}
                            onPause={() => {
                                console.log('Video pause event');
                                setPlaying(false);
                            }}
                            {...{}}
                        />
                        {!ready && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="text-white text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                    <p className="text-sm">Loading video...</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                    <div><strong>Original URL:</strong> {url}</div>
                    <div><strong>Cleaned URL:</strong> {cleanedUrl}</div>
                    <div><strong>Can Play:</strong> {canPlay ? 'Yes' : 'No'}</div>
                    <div><strong>Ready:</strong> {ready ? 'Yes' : 'No'}</div>
                    <div><strong>Playing:</strong> {playing ? 'Yes' : 'No'}</div>
                </div>
            </CardContent>
        </Card>
    );
}
