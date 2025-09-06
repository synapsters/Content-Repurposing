'use client';

import HindiTTSDebugger from '@/components/HindiTTSDebugger';
import AudioPlayer from '@/components/AudioPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestHindiTTSPage() {
    const hindiSampleTexts = [
        {
            title: 'Simple Greeting',
            text: 'नमस्ते, आप कैसे हैं?',
            translation: 'Hello, how are you?'
        },
        {
            title: 'Educational Content',
            text: 'शिक्षा बहुत महत्वपूर्ण है। यह हमारे जीवन को बेहतर बनाती है।',
            translation: 'Education is very important. It makes our lives better.'
        },
        {
            title: 'Technical Terms',
            text: 'कंप्यूटर विज्ञान में प्रोग्रामिंग एक मुख्य विषय है।',
            translation: 'Programming is a main subject in computer science.'
        },
        {
            title: 'Mixed Content',
            text: 'आज हम AI और machine learning के बारे में सीखेंगे।',
            translation: 'Today we will learn about AI and machine learning.'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Hindi TTS Testing Page
                    </h1>
                    <p className="text-gray-600">
                        Test Hindi text-to-speech functionality and diagnose issues
                    </p>
                </div>

                {/* Debugger Component */}
                <HindiTTSDebugger />

                {/* Sample Hindi Texts */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hindi Audio Samples</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {hindiSampleTexts.map((sample, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-lg">{sample.title}</h3>
                                    <AudioPlayer
                                        text={sample.text}
                                        language="hi"
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Hindi:</span>
                                        <p className="text-lg font-hindi mt-1">{sample.text}</p>
                                    </div>

                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Translation:</span>
                                        <p className="text-gray-700 italic">{sample.translation}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Testing Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">1. Run Diagnostic</h4>
                            <p className="text-gray-600">
                                Click &quot;Run Diagnostic&quot; to check your system&apos;s Hindi TTS capabilities.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">2. Test Audio Samples</h4>
                            <p className="text-gray-600">
                                Try playing the Hindi audio samples above. Check browser console (F12) for detailed logs.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">3. Check Console Output</h4>
                            <p className="text-gray-600">
                                Open browser developer tools (F12) and check the console for detailed TTS information.
                            </p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-semibold text-yellow-800 mb-2">Common Issues:</h4>
                            <ul className="text-yellow-700 text-sm space-y-1">
                                <li>• <strong>&quot;interrupted&quot; error:</strong> Voice loading was cancelled - wait and retry</li>
                                <li>• No Hindi voices installed on your system</li>
                                <li>• Browser doesn&apos;t support Hindi TTS</li>
                                <li>• Text encoding issues with Devanagari script</li>
                                <li>• System TTS service not running</li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-800 mb-2">Solutions for &quot;interrupted&quot; Error:</h4>
                            <ul className="text-blue-700 text-sm space-y-1">
                                <li>• <strong>Wait 2-3 seconds</strong> and try again (voices may still be loading)</li>
                                <li>• <strong>Refresh the page</strong> and retry the test</li>
                                <li>• <strong>Install Hindi language pack:</strong> Windows Settings → Language → Add Hindi</li>
                                <li>• <strong>Try Chrome browser</strong> (usually has better TTS support)</li>
                                <li>• <strong>Check system TTS:</strong> Test Hindi in system settings first</li>
                                <li>• <strong>Use shorter text:</strong> Try single words like &quot;नमस्ते&quot;</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
