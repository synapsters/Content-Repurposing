'use client';

import SimpleVideoPlayer from '@/components/SimpleVideoPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestVideoPage() {
    const testUrls = [
        {
            format: "Short URL (youtu.be)",
            url: "https://youtu.be/Y2hgEGPzTZY",
            description: "This is the format you get from YouTube's share button"
        },
        {
            format: "Full URL (youtube.com)",
            url: "https://www.youtube.com/watch?v=Y2hgEGPzTZY",
            description: "This is the preferred format for ReactPlayer"
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>📹 YouTube URL Format Guide</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <h3 className="font-semibold text-blue-800 mb-2">✅ Best Ways to Get YouTube URLs:</h3>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                                <li><strong>Share Button:</strong> Click &quot;Share&quot; below YouTube video → Copy URL</li>
                                <li><strong>Address Bar:</strong> Copy URL from browser address bar while watching</li>
                                <li><strong>Right-click:</strong> Right-click video → &quot;Copy video URL&quot;</li>
                            </ol>
                        </div>

                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <h3 className="font-semibold text-green-800 mb-2">🎯 Recommended URL Formats:</h3>
                            <ul className="space-y-1 text-sm text-green-700">
                                <li><code className="bg-white px-2 py-1 rounded">https://www.youtube.com/watch?v=VIDEO_ID</code> (Best)</li>
                                <li><code className="bg-white px-2 py-1 rounded">https://youtu.be/VIDEO_ID</code> (Auto-converted)</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {testUrls.map((test, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <CardTitle>{test.format}</CardTitle>
                            <p className="text-sm text-gray-600">{test.description}</p>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-600 mb-4">
                                URL: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{test.url}</code>
                            </p>

                            <SimpleVideoPlayer
                                url={test.url}
                                title={`Test: ${test.format}`}
                            />
                        </CardContent>
                    </Card>
                ))}

                <Card>
                    <CardHeader>
                        <CardTitle>Alternative Test - Direct ReactPlayer</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-black rounded-lg overflow-hidden">
                            <iframe
                                width="100%"
                                height="400"
                                src="https://www.youtube.com/embed/Y2hgEGPzTZY"
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            ></iframe>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            This is a direct YouTube embed as a fallback test.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
