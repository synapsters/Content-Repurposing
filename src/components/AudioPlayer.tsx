'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
    text: string;
    language?: string;
    className?: string;
}

export default function AudioPlayer({ text, language = 'en', className = '' }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSupported, setIsSupported] = useState(false);

    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isStoppingRef = useRef(false);

    // Check if speech synthesis is supported
    useEffect(() => {
        setIsSupported('speechSynthesis' in window);
    }, []);

    // Clean up audio script for better TTS
    const cleanTextForTTS = (rawText: string): string => {
        return rawText
            // Remove markdown headers (##, ###, etc.)
            .replace(/^#{1,6}\s+.*$/gm, '')
            // Remove markdown formatting
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text**
            .replace(/\*(.*?)\*/g, '$1') // Italic *text*
            .replace(/`(.*?)`/g, '$1') // Code `text`
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links [text](url)
            // Remove timestamp markers like (0:00-0:15)
            .replace(/\(\d+:\d+[-–]\d+:\d+\)/g, '')
            // Remove timing markers and tone instructions
            .replace(/\[PAUSE\]/g, '. ')
            .replace(/\[EMPHASIS\]/g, '')
            .replace(/\[\/EMPHASIS\]/g, '')
            .replace(/\[FRIENDLY TONE\]/g, '')
            .replace(/\[SERIOUS TONE\]/g, '')
            .replace(/\[ENERGIC TONE\]/g, '')
            .replace(/\[ENTHUSIASTIC TONE\]/g, '')
            .replace(/\[EXPLANATORY TONE\]/g, '')
            .replace(/\[.*?\]/g, '') // Remove any other markers in brackets
            // Remove section markers like **(0:00-0:15) Introduction - [FRIENDLY TONE]**
            .replace(/\*\*\([^)]+\)[^*]*\*\*/g, '')
            // Remove asterisk-based formatting
            .replace(/\*\([^)]*\)\*/g, '')
            // Remove extra dashes and formatting
            .replace(/[-–—]{2,}/g, ' ')
            // Clean up multiple spaces and line breaks
            .replace(/\n\s*\n/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();
    };

    // Estimate duration (rough calculation: ~150 words per minute)
    const estimateDuration = (text: string): number => {
        const words = text.split(' ').length;
        return Math.ceil((words / 150) * 60); // seconds
    };

    // Initialize speech synthesis
    const initializeSpeech = () => {
        if (!isSupported) return null;

        const cleanedText = cleanTextForTTS(text);
        const utterance = new SpeechSynthesisUtterance(cleanedText);

        // Set language
        utterance.lang = language === 'es' ? 'es-ES' :
            language === 'fr' ? 'fr-FR' :
                language === 'de' ? 'de-DE' :
                    language === 'it' ? 'it-IT' :
                        language === 'pt' ? 'pt-BR' : 'en-US';

        // Set speech parameters
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = isMuted ? 0 : 1;

        // Event handlers
        utterance.onstart = () => {
            setIsPlaying(true);
            setIsPaused(false);
            setDuration(estimateDuration(cleanedText));

            // Start progress tracking
            intervalRef.current = setInterval(() => {
                setCurrentPosition(prev => prev + 1);
            }, 1000);
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentPosition(0);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        utterance.onerror = (event: any) => {
            // Check if this is a real error or just a cancellation
            const errorType = event?.error || 'unknown';
            
            // Don't log anything if we're intentionally stopping
            if (isStoppingRef.current) {
                // Reset the stopping flag
                isStoppingRef.current = false;
            } else if (errorType === 'canceled' || errorType === 'interrupted' || Object.keys(event).length === 0) {
                // This is likely a normal cancellation, just log it quietly
                console.log('Speech synthesis cancelled');
            } else {
                // This is a real error
                console.error('Speech synthesis error:', errorType, event);
            }
            
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentPosition(0);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        return utterance;
    };

    const handlePlay = () => {
        if (!isSupported) {
            alert('Text-to-speech is not supported in your browser.');
            return;
        }

        try {
            if (isPaused) {
                // Resume
                speechSynthesis.resume();
                setIsPaused(false);
                setIsPlaying(true);
            } else {
                // Start new
                const utterance = initializeSpeech();
                if (utterance) {
                    utteranceRef.current = utterance;
                    speechSynthesis.speak(utterance);
                }
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            setIsPlaying(false);
            setIsPaused(false);
        }
    };

    const handlePause = () => {
        if (isPlaying) {
            try {
                speechSynthesis.pause();
                setIsPaused(true);
                setIsPlaying(false);
            } catch (error) {
                console.warn('Error pausing speech synthesis:', error);
                setIsPlaying(false);
                setIsPaused(false);
            }
        }
    };

    const handleStop = () => {
        try {
            speechSynthesis.cancel();
        } catch (error) {
            console.warn('Error stopping speech synthesis:', error);
        }

        setIsPlaying(false);
        setIsPaused(false);
        setCurrentPosition(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const handleMute = () => {
        setIsMuted(!isMuted);
        if (utteranceRef.current) {
            utteranceRef.current.volume = isMuted ? 1 : 0;
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            try {
                speechSynthesis.cancel();
            } catch (error) {
                console.warn('Error during cleanup:', error);
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    if (!isSupported) {
        return (
            <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
                <VolumeX className="h-4 w-4" />
                <span className="text-xs">TTS not supported</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center space-x-3 ${className}`}>
            {/* Play/Pause Button */}
            <Button
                onClick={isPlaying ? handlePause : handlePlay}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1 bg-white hover:bg-indigo-50 border-indigo-200"
            >
                {isPlaying ? (
                    <Pause className="h-4 w-4 text-indigo-600" />
                ) : (
                    <Play className="h-4 w-4 text-indigo-600" />
                )}
                <span className="text-xs text-indigo-600">
                    {isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
                </span>
            </Button>

            {/* Stop Button */}
            {(isPlaying || isPaused) && (
                <Button
                    onClick={handleStop}
                    size="sm"
                    variant="outline"
                    className="flex items-center space-x-1 bg-white hover:bg-red-50 border-red-200"
                >
                    <Square className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">Stop</span>
                </Button>
            )}

            {/* Mute Button */}
            <Button
                onClick={handleMute}
                size="sm"
                variant="ghost"
                className="p-1"
            >
                {isMuted ? (
                    <VolumeX className="h-4 w-4 text-gray-500" />
                ) : (
                    <Volume2 className="h-4 w-4 text-indigo-600" />
                )}
            </Button>

            {/* Progress Display */}
            {(isPlaying || isPaused) && (
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                    <span>{formatTime(currentPosition)}</span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-1000"
                            style={{
                                width: duration > 0 ? `${(currentPosition / duration) * 100}%` : '0%'
                            }}
                        />
                    </div>
                    <span>{formatTime(duration)}</span>
                </div>
            )}
        </div>
    );
}
