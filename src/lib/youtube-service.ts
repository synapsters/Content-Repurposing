export interface YouTubeVideoInfo {
    title: string;
    description: string;
    channelTitle: string;
    duration: string;
    publishedAt: string;
    tags?: string[];
    categoryId?: string;
}

export class YouTubeService {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.YOUTUBE_API_KEY || '';
    }

    // Extract video ID from YouTube URL
    private extractVideoId(url: string): string | null {
        if (!url) return null;

        const patterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    // Get video information from YouTube API
    async getVideoInfo(url: string): Promise<YouTubeVideoInfo | null> {
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            console.warn('Could not extract video ID from URL:', url);
            return null;
        }

        // If no API key is provided, return basic info
        if (!this.apiKey) {
            console.warn('YouTube API key not provided. Using basic video info.');
            return {
                title: `YouTube Video (${videoId})`,
                description: 'Video content from YouTube. API key required for detailed information.',
                channelTitle: 'Unknown Channel',
                duration: 'Unknown',
                publishedAt: new Date().toISOString()
            };
        }

        try {
            const response = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.apiKey}&part=snippet,contentDetails,statistics`
            );

            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                console.warn('Video not found or not accessible:', videoId);
                return null;
            }

            const video = data.items[0];
            const snippet = video.snippet;
            const contentDetails = video.contentDetails;

            return {
                title: snippet.title,
                description: snippet.description,
                channelTitle: snippet.channelTitle,
                duration: contentDetails.duration,
                publishedAt: snippet.publishedAt,
                tags: snippet.tags,
                categoryId: snippet.categoryId
            };
        } catch (error) {
            console.error('Error fetching YouTube video info:', error);
            return null;
        }
    }

    // Format video info for AI processing
    formatVideoInfoForAI(videoInfo: YouTubeVideoInfo): string {
        return `
YouTube Video Information:
Title: ${videoInfo.title}
Channel: ${videoInfo.channelTitle}
Published: ${videoInfo.publishedAt}
Duration: ${videoInfo.duration}

Description:
${videoInfo.description}

${videoInfo.tags ? `Tags: ${videoInfo.tags.join(', ')}` : ''}
        `.trim();
    }
}

export const youtubeService = new YouTubeService();
