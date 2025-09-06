'use client';

import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    SkipBack,
    SkipForward,
    Settings
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface VideoPlayerProps {
    url: string;
    title?: string;
    onProgress?: (progress: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
    onDuration?: (duration: number) => void;
    onEnded?: () => void;
}

export default function VideoPlayer({
    url,
    title,
    onProgress,
    onDuration,
    onEnded
}: VideoPlayerProps) {
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(0.8);
    const [played, setPlayed] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [seeking, setSeeking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const playerRef = useRef<ReactPlayer>(null);

    // Normalize YouTube URLs
    const normalizeUrl = (inputUrl: string): string => {
        if (!inputUrl) return inputUrl;

        // Convert youtu.be links to youtube.com/watch format
        if (inputUrl.includes('youtu.be/')) {
            const videoId = inputUrl.split('youtu.be/')[1].split('?')[0];
            return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // Ensure youtube.com links are in the correct format
        if (inputUrl.includes('youtube.com/watch')) {
            return inputUrl;
        }

        return inputUrl;
    };

    const normalizedUrl = normalizeUrl(url);

    // Check if ReactPlayer can handle this URL
    const canPlay = ReactPlayer.canPlay(normalizedUrl);

    const handlePlayPause = () => {
        setPlaying(!playing);
    };

    const handleProgress = (progress: any) => {
        if (!seeking) {
            setPlayed(progress.played);
            setPlayedSeconds(progress.playedSeconds);
        }
        onProgress?.(progress);
    };

    const handleSeekMouseDown = () => {
        setSeeking(true);
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayed(parseFloat(e.target.value));
    };

    const handleSeekMouseUp = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSeeking(false);
        if (playerRef.current) {
            playerRef.current.seekTo(parseFloat(e.target.value));
        }
    };

    const handleDuration = (duration: number) => {
        setDuration(duration);
        onDuration?.(duration);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const handleSkip = (seconds: number) => {
        if (playerRef.current) {
            const currentTime = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(currentTime + seconds);
        }
    };

    const toggleFullscreen = () => {
        if (playerRef.current) {
            const playerElement = playerRef.current.getInternalPlayer();
            if (playerElement && playerElement.requestFullscreen) {
                playerElement.requestFullscreen();
            }
        }
    };

    return (
        <Card className="w-full">
            <CardContent className="p-0">
                <div className="relative bg-black rounded-t-lg overflow-hidden">
                    {error ? (
                        <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
                            <div className="text-center">
                                <div className="text-red-400 mb-2">⚠️ Video Error</div>
                                <div className="text-sm">{error}</div>
                                <div className="text-xs text-gray-400 mt-2">URL: {normalizedUrl}</div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => {
                                        setError(null);
                                        setLoading(true);
                                    }}
                                >
                                    Retry
                                </Button>
                            </div>
                        </div>
                    ) : !canPlay ? (
                        <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
                            <div className="text-center">
                                <div className="text-yellow-400 mb-2">📺 External Video</div>
                                <div className="text-sm mb-4">This video format requires an external player</div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(normalizedUrl, '_blank')}
                                >
                                    Open in New Tab
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ReactPlayer
                                ref={playerRef}
                                url={normalizedUrl}
                                playing={playing}
                                muted={muted}
                                volume={volume}
                                onProgress={handleProgress}
                                onReady={() => {
                                    setLoading(false);
                                    setError(null);
                                    if (playerRef.current) {
                                        const duration = playerRef.current.getDuration();
                                        if (duration) {
                                            handleDuration(duration);
                                        }
                                    }
                                }}
                                onError={(error) => {
                                    console.error('Video player error:', error);
                                    setError('Failed to load video. Please check the URL or try again.');
                                    setLoading(false);
                                }}
                                onEnded={onEnded}
                                width="100%"
                                height="400px"
                                config={{
                                    youtube: {
                                        playerVars: {
                                            autoplay: 0,
                                            controls: 0,
                                            showinfo: 0,
                                            modestbranding: 1,
                                            rel: 0,
                                            fs: 1,
                                            playsinline: 1
                                        }
                                    },
                                    file: {
                                        attributes: {
                                            controlsList: 'nodownload',
                                            crossOrigin: 'anonymous'
                                        }
                                    }
                                }}
                            />

                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Custom Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        {/* Progress Bar */}
                        <div className="mb-4">
                            <input
                                type="range"
                                min={0}
                                max={0.999999}
                                step="any"
                                value={played}
                                onMouseDown={handleSeekMouseDown}
                                onChange={handleSeekChange}
                                onMouseUp={handleSeekMouseUp}
                                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-white mt-1">
                                <span>{formatDuration(playedSeconds)}</span>
                                <span>{formatDuration(duration)}</span>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSkip(-10)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <SkipBack className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePlayPause}
                                    className="text-white hover:bg-white/20"
                                >
                                    {playing ? (
                                        <Pause className="h-5 w-5" />
                                    ) : (
                                        <Play className="h-5 w-5" />
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSkip(10)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <SkipForward className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setMuted(!muted)}
                                        className="text-white hover:bg-white/20"
                                    >
                                        {muted ? (
                                            <VolumeX className="h-4 w-4" />
                                        ) : (
                                            <Volume2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step="any"
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:bg-white/20"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={toggleFullscreen}
                                    className="text-white hover:bg-white/20"
                                >
                                    <Maximize className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {title && (
                    <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
