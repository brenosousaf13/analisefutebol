// CazéTV channel ID (provided by user) — used as primary filter
const CAZE_CHANNEL_ID = 'UCZiYbVptd3PVPf4f6eR6UaQ';
// Fallback: match by channel name in results (handles ID changes/errors)
const CAZE_NAME_PATTERNS = ['cazétv', 'cazetv', 'cazé tv', 'caze tv'];

const YT_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

function isCazeTV(item) {
  const title = (item.snippet?.channelTitle ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const id    = item.snippet?.channelId ?? '';
  if (id === CAZE_CHANNEL_ID) return true;
  // Normalize accents and check name patterns
  return CAZE_NAME_PATTERNS.some(p =>
    title.replace(/[̀-ͯ]/g, '').includes(p.normalize('NFD').replace(/[̀-ͯ]/g, ''))
  );
}

async function searchYT(params, apiKey) {
  const url = `${YT_ENDPOINT}?${new URLSearchParams({ ...params, key: apiKey })}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[highlights] YouTube API error:', res.status, err?.error?.message);
    return null;
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: 'Missing home/away params' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured' });

  const query = `melhores momentos ${home} ${away} Copa do Mundo FIFA 2026`;

  try {
    // ── Pass 1: search restricted to CazéTV channel ──────────────
    const pass1 = await searchYT({
      part:          'snippet',
      channelId:     CAZE_CHANNEL_ID,
      q:             query,
      type:          'video',
      videoDuration: 'medium',   // 4–20 min — excludes Shorts and full matches
      order:         'relevance',
      maxResults:    '5',
    }, apiKey);

    if (pass1?.items?.length > 0) {
      for (const item of pass1.items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;
        console.log('[highlights] Pass 1 hit:', item.snippet.title, 'channel:', item.snippet.channelTitle);
        return res.json({
          videoId,
          title:     item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url
                  ?? item.snippet.thumbnails?.medium?.url
                  ?? item.snippet.thumbnails?.default?.url
                  ?? null,
        });
      }
    }

    // ── Pass 2: broader search, filter by channel name ───────────
    // (Handles cases where the channelId filter returns 0 results)
    console.log('[highlights] Pass 1 empty — trying broad search for:', query);
    const pass2 = await searchYT({
      part:          'snippet',
      q:             query,
      type:          'video',
      videoDuration: 'medium',
      order:         'relevance',
      maxResults:    '15',
    }, apiKey);

    if (pass2?.items?.length > 0) {
      for (const item of pass2.items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;
        if (!isCazeTV(item)) continue;
        console.log('[highlights] Pass 2 hit:', item.snippet.title, 'channel:', item.snippet.channelTitle);
        return res.json({
          videoId,
          title:     item.snippet.title,
          thumbnail: item.snippet.thumbnails?.high?.url
                  ?? item.snippet.thumbnails?.medium?.url
                  ?? item.snippet.thumbnails?.default?.url
                  ?? null,
        });
      }
    }

    console.log('[highlights] No CazéTV video found for:', home, 'vs', away);
    return res.json(null);

  } catch (err) {
    console.error('[highlights] Unexpected error:', err);
    return res.json(null);
  }
}
