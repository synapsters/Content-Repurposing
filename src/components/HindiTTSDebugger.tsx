'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Bug, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function HindiTTSDebugger() {
    const [isTestRunning, setIsTestRunning] = useState(false);
    const [testResults, setTestResults] = useState<any>(null);

    const runComprehensiveTest = async () => {
        setIsTestRunning(true);
        setTestResults(null);

        const results = {
            browserSupport: false,
            voicesLoaded: false,
            hindiVoicesFound: [],
            allVoices: [],
            testPassed: false,
            errors: []
        };

        try {
            // Test 1: Browser support
            results.browserSupport = 'speechSynthesis' in window;
            if (!results.browserSupport) {
                results.errors.push('speechSynthesis not supported in this browser');
                setTestResults(results);
                setIsTestRunning(false);
                return;
            }

            // Test 2: Load voices
            const voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
                const currentVoices = speechSynthesis.getVoices();
                if (currentVoices.length > 0) {
                    resolve(currentVoices);
                } else {
                    speechSynthesis.addEventListener('voiceschanged', () => {
                        resolve(speechSynthesis.getVoices());
                    }, { once: true });
                }
            });

            results.voicesLoaded = voices.length > 0;
            results.allVoices = voices.map(v => ({ name: v.name, lang: v.lang, localService: v.localService }));

            // Test 3: Find Hindi voices
            results.hindiVoicesFound = voices.filter(voice =>
                voice.lang.includes('hi') ||
                voice.name.toLowerCase().includes('hindi') ||
                voice.name.toLowerCase().includes('devanagari')
            ).map(v => ({ name: v.name, lang: v.lang, localService: v.localService }));

            // Test 4: Try Hindi TTS
            const testText = 'नमस्ते, यह एक परीक्षण है।';
            const testPassed = await new Promise<boolean>((resolve) => {
                const utterance = new SpeechSynthesisUtterance(testText);
                utterance.lang = 'hi-IN';

                if (results.hindiVoicesFound.length > 0) {
                    const hindiVoice = voices.find(v => v.name === results.hindiVoicesFound[0].name);
                    if (hindiVoice) utterance.voice = hindiVoice;
                }

                let resolved = false;

                utterance.onstart = () => {
                    if (!resolved) {
                        resolved = true;
                        speechSynthesis.cancel();
                        resolve(true);
                    }
                };

                utterance.onerror = (event) => {
                    if (!resolved) {
                        resolved = true;
                        let errorMessage = `TTS Error: ${event.error}`;

                        // Provide specific guidance for common errors
                        if (event.error === 'interrupted') {
                            errorMessage += ' - Voice loading was interrupted. Try: 1) Wait a moment and retry, 2) Refresh the page, 3) Check if Hindi language pack is installed';
                        } else if (event.error === 'not-allowed') {
                            errorMessage += ' - Browser blocked TTS. Check permissions and try user interaction first';
                        } else if (event.error === 'network') {
                            errorMessage += ' - Network error. Voice may not be available offline';
                        }

                        results.errors.push(errorMessage);
                        resolve(false);
                    }
                };

                utterance.onend = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve(true);
                    }
                };

                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        speechSynthesis.cancel();
                        results.errors.push('TTS test timed out');
                        resolve(false);
                    }
                }, 5000);

                speechSynthesis.speak(utterance);
            });

            results.testPassed = testPassed;

        } catch (error) {
            results.errors.push(`Test error: ${error}`);
        }

        setTestResults(results);
        setIsTestRunning(false);
    };

    const testSimpleHindi = () => {
        const testText = 'नमस्ते दुनिया';
        const utterance = new SpeechSynthesisUtterance(testText);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.8;

        utterance.onstart = () => console.log('✅ Simple Hindi test started');
        utterance.onerror = (e) => console.error('❌ Simple Hindi test error:', e.error);
        utterance.onend = () => console.log('✅ Simple Hindi test completed');

        speechSynthesis.speak(utterance);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Bug className="h-5 w-5" />
                    <span>Hindi TTS Debugger</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex space-x-2">
                    <Button
                        onClick={runComprehensiveTest}
                        disabled={isTestRunning}
                        className="flex items-center space-x-2"
                    >
                        <Bug className="h-4 w-4" />
                        <span>{isTestRunning ? 'Testing...' : 'Run Diagnostic'}</span>
                    </Button>

                    <Button
                        onClick={testSimpleHindi}
                        variant="outline"
                        className="flex items-center space-x-2"
                    >
                        <Play className="h-4 w-4" />
                        <span>Test Simple Hindi</span>
                    </Button>
                </div>

                {testResults && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                {testResults.browserSupport ?
                                    <CheckCircle className="h-4 w-4 text-green-500" /> :
                                    <XCircle className="h-4 w-4 text-red-500" />
                                }
                                <span>Browser Support</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                {testResults.voicesLoaded ?
                                    <CheckCircle className="h-4 w-4 text-green-500" /> :
                                    <XCircle className="h-4 w-4 text-red-500" />
                                }
                                <span>Voices Loaded ({testResults.allVoices.length})</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                {testResults.hindiVoicesFound.length > 0 ?
                                    <CheckCircle className="h-4 w-4 text-green-500" /> :
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                }
                                <span>Hindi Voices ({testResults.hindiVoicesFound.length})</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                {testResults.testPassed ?
                                    <CheckCircle className="h-4 w-4 text-green-500" /> :
                                    <XCircle className="h-4 w-4 text-red-500" />
                                }
                                <span>TTS Test</span>
                            </div>
                        </div>

                        {testResults.hindiVoicesFound.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2">Hindi Voices Found:</h4>
                                <ul className="text-sm space-y-1">
                                    {testResults.hindiVoicesFound.map((voice: any, index: number) => (
                                        <li key={index} className="bg-green-50 p-2 rounded">
                                            <strong>{voice.name}</strong> ({voice.lang})
                                            {voice.localService ? ' - Local' : ' - Remote'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {testResults.errors.length > 0 && (
                            <div>
                                <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                                <ul className="text-sm space-y-1">
                                    {testResults.errors.map((error: string, index: number) => (
                                        <li key={index} className="bg-red-50 p-2 rounded text-red-700">
                                            {error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <details className="mt-4">
                            <summary className="cursor-pointer font-medium">All Available Voices ({testResults.allVoices.length})</summary>
                            <div className="mt-2 max-h-40 overflow-y-auto">
                                <ul className="text-xs space-y-1">
                                    {testResults.allVoices.map((voice: any, index: number) => (
                                        <li key={index} className="bg-gray-50 p-1 rounded">
                                            {voice.name} ({voice.lang}) {voice.localService ? '🏠' : '☁️'}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </details>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
