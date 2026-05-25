export default async function handler(req, res) {
    const { url } = req.query;

    if (!url || !url.startsWith('https://media.api-sports.io/')) {
        return res.status(400).json({ error: 'URL inválida' });
    }

    const apiKey = process.env.VITE_API_FOOTBALL_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key não configurada' });
    }

    try {
        const response = await fetch(url, {
            headers: { 'x-apisports-key': apiKey },
        });

        if (!response.ok) {
            return res.status(response.status).end();
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('Content-Type') || 'image/png';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(buffer));
    } catch {
        res.status(502).end();
    }
}
