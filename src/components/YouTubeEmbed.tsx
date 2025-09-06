'use client';

interface YouTubeEmbedProps {
    url: string;
    title?: string;
}

export default function YouTubeEmbed({ url, title }: YouTubeEmbedProps) {
    console.log('🎥 YouTubeEmbed received URL:', url);

    // Extract video ID from various YouTube URL formats
    const getVideoId = (inputUrl: string): string | null => {
        if (!inputUrl) return null;

        const url = inputUrl.trim();

        // First try regex patterns for common YouTube formats
        const patterns = [
            // youtube.com/watch?v=VIDEO_ID
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            // youtu.be/VIDEO_ID
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            // youtube.com/embed/VIDEO_ID
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            // Just a video ID (11 characters)
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        // Fallback: try URL constructor for more complex URLs
        try {
            const urlObj = new URL(url);

            // Handle different YouTube URL formats
            if (urlObj.hostname.includes('youtu.be')) {
                // youtu.be/VIDEO_ID format
                const videoId = urlObj.pathname.slice(1).split('?')[0];
                if (videoId && videoId.length === 11) {
                    return videoId;
                }
            } else if (urlObj.hostname.includes('youtube.com')) {
                if (urlObj.searchParams.has('v')) {
                    // youtube.com/watch?v=VIDEO_ID format
                    const videoId = urlObj.searchParams.get('v');
                    if (videoId && videoId.length === 11) {
                        return videoId;
                    }
                } else if (urlObj.pathname.includes('/embed/')) {
                    // youtube.com/embed/VIDEO_ID format
                    const videoId = urlObj.pathname.split('/embed/')[1].split('?')[0];
                    if (videoId && videoId.length === 11) {
                        return videoId;
                    }
                }
            }

            return null;
        } catch (e) {
            // URL constructor failed, but we already tried regex patterns above
            console.warn('Could not parse YouTube URL:', url);
            return null;
        }
    };

    const videoId = getVideoId(url);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;

    console.log('🎥 YouTubeEmbed extracted videoId:', videoId);
    console.log('🎥 YouTubeEmbed embedUrl:', embedUrl);

    if (!videoId || !embedUrl) {
        return (
            <div className="bg-gray-100 p-8 text-center rounded-lg">
                <p className="text-gray-600 mb-2">Unable to embed this video</p>
                <p className="text-sm text-gray-500 mb-2">URL: {url}</p>
                <p className="text-xs text-gray-400">
                    Please use a valid YouTube URL format:
                    <br />• https://www.youtube.com/watch?v=VIDEO_ID
                    <br />• https://youtu.be/VIDEO_ID
                    <br />• https://www.youtube.com/embed/VIDEO_ID
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <iframe
                width="100%"
                height="100%"
                src={embedUrl}
                title={title || "YouTube video player"}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="rounded-lg"
                style={{ minHeight: '200px' }}
            />
        </div>
    );
}
