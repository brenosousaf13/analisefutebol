const CAZE_CHANNEL_ID = 'UCZiYbVptd3PVPf4f6eR6UaQ';
const YT_SEARCH      = 'https://www.googleapis.com/youtube/v3/search';

// Normaliza string para comparação: sem acento, maiúsculo
function norm(s) {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchesTitle(title, home, away) {
  const t = norm(title);
  const h = norm(home);
  const a = norm(away);
  const hasMM  = t.includes('MELHORES MOMENTOS');
  const hasTeam = t.includes(h) || t.includes(a);
  const hasCopa = t.includes('COPA DO MUNDO') || t.includes('FIFA') || t.includes('2026');
  return hasMM && hasTeam && hasCopa;
}

async function fetchRecentVideos(apiKey, pageToken) {
  const params = new URLSearchParams({
    part:       'snippet',
    channelId:  CAZE_CHANNEL_ID,
    type:       'video',
    order:      'date',
    maxResults: '20',
    key:        apiKey,
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(`${YT_SEARCH}?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[highlights] YouTube error:', res.status, err?.error?.message);
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

  console.log(`[highlights] Buscando: ${home} vs ${away}`);

  try {
    // Busca até 2 páginas de vídeos recentes do canal (20 + 20 = 40 vídeos)
    // e filtra localmente pelo título — muito mais preciso que busca por query
    let pageToken;

    for (let page = 0; page < 2; page++) {
      const data = await fetchRecentVideos(apiKey, pageToken);
      if (!data?.items?.length) break;

      for (const item of data.items) {
        const videoId = item.id?.videoId;
        if (!videoId) continue;

        const title = item.snippet?.title ?? '';
        if (!matchesTitle(title, home, away)) continue;

        const thumbnail =
          item.snippet.thumbnails?.maxres?.url ??
          item.snippet.thumbnails?.high?.url   ??
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ?? null;

        console.log(`[highlights] Encontrado: "${title}"`);
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

    console.log(`[highlights] Nenhum vídeo encontrado para ${home} vs ${away}`);
    return res.json(null);

  } catch (err) {
    console.error('[highlights] Erro inesperado:', err);
    return res.json(null);
  }
}
