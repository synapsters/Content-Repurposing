'use client';

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
            <div className="bg-gray-100 p-8 text-center rounded-lg">
                <p className="text-gray-600 mb-2">Unable to embed this video</p>
                <p className="text-sm text-gray-500">URL: {url}</p>
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
