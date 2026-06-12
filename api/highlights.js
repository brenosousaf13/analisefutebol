const CAZE_CHANNEL = 'UCZiYbVptd3PVPf4f6eR6UaQ';
const YT_ENDPOINT  = 'https://www.googleapis.com/youtube/v3/search';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { home, away } = req.query;
  if (!home || !away) {
    return res.status(400).json({ error: 'Missing home/away params' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured' });
  }

  const query = `melhores momentos ${home} ${away} Copa do Mundo`;

  try {
    const params = new URLSearchParams({
      part:       'snippet',
      channelId:  CAZE_CHANNEL,
      q:          query,
      type:       'video',
      order:      'relevance',
      maxResults: '5',
      key:        apiKey,
    });

    const response = await fetch(`${YT_ENDPOINT}?${params}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[highlights] YouTube error:', err);
      return res.json(null);
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) return res.json(null);

    // Return the first valid video item
    for (const item of data.items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;
      return res.json({
        videoId,
        title:     item.snippet.title,
        thumbnail: item.snippet.thumbnails?.medium?.url
                ?? item.snippet.thumbnails?.default?.url
                ?? null,
      });
    }

    return res.json(null);
  } catch (err) {
    console.error('[highlights] Unexpected error:', err);
    return res.json(null);
  }
}
