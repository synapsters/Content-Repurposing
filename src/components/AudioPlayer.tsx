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
        let cleaned = rawText
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

        // Special handling for Hindi text
        if (language === 'hi') {
            // Additional cleaning for Hindi TTS
            cleaned = cleaned
                .replace(/\u200C|\u200D/g, '') // Remove zero-width characters
                .replace(/[\u0964\u0965]/g, '.') // Replace Devanagari punctuation with periods
                .trim();

            console.log('🇮🇳 Hindi text cleaned for TTS:', {
                originalLength: rawText.length,
                cleanedLength: cleaned.length,
                preview: cleaned.substring(0, 100),
                hasDevanagari: /[\u0900-\u097F]/.test(cleaned)
            });

            // If no Devanagari characters found, it might be romanized Hindi
            if (!/[\u0900-\u097F]/.test(cleaned)) {
                console.warn('⚠️ No Devanagari script detected in Hindi text. This might be romanized Hindi.');
            }
        }

        return cleaned;
    };

    // Estimate duration (rough calculation: ~150 words per minute)
    const estimateDuration = (text: string): number => {
        const words = text.split(' ').length;
        return Math.ceil((words / 150) * 60); // seconds
    };

    // Ensure voices are loaded with timeout and retry
    const ensureVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 10;

            const checkVoices = () => {
                const voices = speechSynthesis.getVoices();
                attempts++;

                if (voices.length > 0) {
                    console.log(`✅ Voices loaded successfully (${voices.length} voices, attempt ${attempts})`);
                    resolve(voices);
                } else if (attempts >= maxAttempts) {
                    console.warn(`⚠️ Voice loading timed out after ${maxAttempts} attempts`);
                    resolve([]); // Return empty array instead of rejecting
                } else {
                    console.log(`🔄 Waiting for voices... (attempt ${attempts}/${maxAttempts})`);
                    setTimeout(checkVoices, 100); // Check every 100ms
                }
            };

            // Initial check
            checkVoices();

            // Also listen for voiceschanged event
            speechSynthesis.addEventListener('voiceschanged', () => {
                const voices = speechSynthesis.getVoices();
                if (voices.length > 0) {
                    console.log(`✅ Voices loaded via event (${voices.length} voices)`);
                    resolve(voices);
                }
            }, { once: true });
        });
    };

    // Debug function to log available voices for a language
    const logAvailableVoices = (targetLanguage: string) => {
        const voices = speechSynthesis.getVoices();
        const languageVoices = voices.filter(voice =>
            voice.lang.toLowerCase().includes(targetLanguage.toLowerCase()) ||
            voice.lang.startsWith(targetLanguage.split('-')[0])
        );

        console.log(`Available voices for ${targetLanguage}:`, languageVoices.map(v => ({
            name: v.name,
            lang: v.lang,
            localService: v.localService
        })));

        if (languageVoices.length === 0) {
            console.warn(`No voices found for language: ${targetLanguage}`);
            console.log('All available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
        }
    };


    // Initialize speech synthesis
    const initializeSpeech = async () => {
        if (!isSupported) return null;

        // Ensure voices are loaded first
        await ensureVoicesLoaded();

        const cleanedText = cleanTextForTTS(text);
        const utterance = new SpeechSynthesisUtterance(cleanedText);

        // Set language
        utterance.lang = language === 'es' ? 'es-ES' :
            language === 'fr' ? 'fr-FR' :
                language === 'de' ? 'de-DE' :
                    language === 'it' ? 'it-IT' :
                        language === 'pt' ? 'pt-BR' :
                            language === 'ru' ? 'ru-RU' :
                                language === 'ja' ? 'ja-JP' :
                                    language === 'ko' ? 'ko-KR' :
                                        language === 'zh' ? 'zh-CN' :
                                            language === 'hi' ? 'hi-IN' :
                                                language === 'ar' ? 'ar-SA' : 'en-US';

        // Try to find a suitable voice for the language
        const voices = speechSynthesis.getVoices();
        const targetLang = utterance.lang;

        // Debug: Log available voices for this language
        logAvailableVoices(targetLang);

        // Find the best voice for the language
        let selectedVoice = voices.find(voice =>
            voice.lang === targetLang || voice.lang.startsWith(targetLang.split('-')[0])
        );

        // Fallback to any voice that matches the language code
        if (!selectedVoice && language !== 'en') {
            selectedVoice = voices.find(voice =>
                voice.lang.toLowerCase().includes(language.toLowerCase())
            );
        }

        // For Hindi, try additional fallbacks
        if (!selectedVoice && language === 'hi') {
            // Try common Hindi voice patterns
            selectedVoice = voices.find(voice =>
                voice.name.toLowerCase().includes('hindi') ||
                voice.name.toLowerCase().includes('devanagari') ||
                voice.lang.includes('hi')
            );

            // If still no Hindi voice, try Indian English as a fallback
            if (!selectedVoice) {
                selectedVoice = voices.find(voice =>
                    voice.lang.includes('en-IN') ||
                    voice.name.toLowerCase().includes('indian') ||
                    voice.name.toLowerCase().includes('india')
                );

                if (selectedVoice) {
                    console.log('🇮🇳 Using Indian English voice as fallback for Hindi');
                }
            }
        }

        // Set the voice if found
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`✅ Selected voice for ${language}:`, selectedVoice.name, selectedVoice.lang);
        } else {
            console.warn(`⚠️ No suitable voice found for language: ${language} (${targetLang})`);
            console.log('💡 Tip: Hindi TTS may not be available on this system. The text will play in the default system voice.');
        }

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

        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
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
                // This is a real error - provide detailed info for Hindi debugging
                console.error('🚨 Speech synthesis error:', errorType, event);
                console.error('Language:', language, 'Target Lang:', utterance.lang);
                console.error('Selected Voice:', utterance.voice?.name, utterance.voice?.lang);
                console.error('Text length:', cleanedText.length);
                console.error('Text preview:', cleanedText.substring(0, 100));

                // Special handling for Hindi errors
                if (language === 'hi') {
                    console.error('🇮🇳 Hindi TTS Error - This might be due to:');
                    console.error('1. No Hindi voice installed on system');
                    console.error('2. Hindi text encoding issues');
                    console.error('3. Browser TTS limitations');
                    console.error('4. Text contains unsupported characters');
                }
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

    const handlePlay = async () => {
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
                // Clear any existing speech to prevent conflicts
                speechSynthesis.cancel();
                await new Promise(resolve => setTimeout(resolve, 100));

                console.log(`🎵 Starting TTS for language: ${language}`);

                // For Hindi, run a quick diagnostic first
                if (language === 'hi') {
                    console.log('🇮🇳 Preparing Hindi TTS...');

                    // Ensure voices are loaded before proceeding
                    const voices = await ensureVoicesLoaded();
                    const hindiVoices = voices.filter(voice =>
                        voice.lang.includes('hi') ||
                        voice.name.toLowerCase().includes('hindi')
                    );

                    if (hindiVoices.length === 0) {
                        console.warn('⚠️ No Hindi voices found. Will use fallback voice.');
                    } else {
                        console.log('✅ Hindi voices available:', hindiVoices.map(v => v.name));
                    }
                }

                const utterance = await initializeSpeech();
                if (utterance) {
                    utteranceRef.current = utterance;

                    // Add extra logging for Hindi
                    if (language === 'hi') {
                        console.log('🇮🇳 Hindi TTS Configuration:', {
                            lang: utterance.lang,
                            voice: utterance.voice?.name || 'Default',
                            voiceLang: utterance.voice?.lang || 'Unknown',
                            textLength: text.length,
                            textPreview: text.substring(0, 50),
                            rate: utterance.rate,
                            pitch: utterance.pitch,
                            volume: utterance.volume
                        });
                    }

                    // Add a small delay before speaking to ensure everything is ready
                    await new Promise(resolve => setTimeout(resolve, 200));

                    console.log('🎤 Starting speech synthesis...');
                    speechSynthesis.speak(utterance);
                } else {
                    console.error('❌ Failed to initialize speech synthesis');
                    setIsPlaying(false);
                }
            }
        } catch (error) {
            console.error('❌ Error playing audio:', error);
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
        // Set flag to indicate we're intentionally stopping
        isStoppingRef.current = true;

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
            // Set flag to indicate we're cleaning up
            isStoppingRef.current = true;

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
