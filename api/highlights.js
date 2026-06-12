// CazéTV uploads playlist = "UU" + channel ID without "UC" prefix
// Using playlistItems (1 quota unit) instead of search (100 units) — more reliable
const CAZE_UPLOADS_PLAYLIST = 'UUZiYbVptd3PVPf4f6eR6UaQ';
const YT_PLAYLIST_ITEMS     = 'https://www.googleapis.com/youtube/v3/playlistItems';

// Remove accents and lowercase for reliable comparison
function norm(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function titleMatches(title, home, away) {
  const t = norm(title);
  const h = norm(home);
  const a = norm(away);
  const hasMM   = t.startsWith('melhores momentos');
  const hasTeam = t.includes(h) || t.includes(a);
  return hasMM && hasTeam;
}

async function getPlaylistPage(apiKey, pageToken) {
  const params = new URLSearchParams({
    part:       'snippet',
    playlistId: CAZE_UPLOADS_PLAYLIST,
    maxResults: '50',
    key:        apiKey,
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(`${YT_PLAYLIST_ITEMS}?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[highlights] playlistItems error:', res.status, err?.error?.message);
    return null;
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: 'Missing home/away' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  console.log(`[highlights] Procurando: "${home}" vs "${away}"`);

  try {
    // Scan up to 3 pages of recent uploads (50 each = 150 videos max)
    let pageToken;
    for (let page = 0; page < 3; page++) {
      const data = await getPlaylistPage(apiKey, pageToken);
      if (!data?.items?.length) break;

      for (const item of data.items) {
        const snippet = item.snippet;
        const videoId = snippet?.resourceId?.videoId;
        if (!videoId) continue;

        const title = snippet.title ?? '';
        if (!titleMatches(title, home, away)) continue;

        const thumbs = snippet.thumbnails ?? {};
        const thumbnail =
          thumbs.maxres?.url ?? thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url ?? null;

        console.log(`[highlights] ✓ Encontrado p${page + 1}: "${title}"`);
        return res.json({
          videoId,
          title,
          thumbnail,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }

      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }

    console.log(`[highlights] Não encontrado: "${home}" vs "${away}"`);
    return res.json(null);

  } catch (err) {
    console.error('[highlights] Erro:', err);
    return res.json(null);
  }
}
