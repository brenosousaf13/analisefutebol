import { supabase } from '../lib/supabase';
import { teamPt } from '../utils/teamNames';

export interface HighlightData {
  videoId: string;
  title: string;
  thumbnail: string | null;
}

// ── YouTube fetch via backend proxy ────────────────────────────

export async function fetchYoutubeHighlight(
  homeTeam: string,
  awayTeam: string,
): Promise<HighlightData | null> {
  try {
    // Use Portuguese names for better CazéTV search results
    const home = encodeURIComponent(teamPt(homeTeam));
    const away = encodeURIComponent(teamPt(awayTeam));
    const res  = await fetch(`/api/highlights?home=${home}&away=${away}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}

// ── Supabase cache ─────────────────────────────────────────────

export async function saveHighlight(eventId: string, data: HighlightData): Promise<void> {
  await supabase.from('copa_highlights').upsert(
    {
      event_id:      eventId,
      video_id:      data.videoId,
      title:         data.title,
      thumbnail_url: data.thumbnail,
    },
    { onConflict: 'event_id' },
  );
}

export async function getHighlightsBatch(eventIds: string[]): Promise<Map<string, HighlightData>> {
  const map = new Map<string, HighlightData>();
  if (eventIds.length === 0) return map;

  const { data } = await supabase
    .from('copa_highlights')
    .select('event_id, video_id, title, thumbnail_url')
    .in('event_id', eventIds);

  (data ?? []).forEach(row => {
    map.set(row.event_id, {
      videoId:   row.video_id,
      title:     row.title,
      thumbnail: row.thumbnail_url,
    });
  });
  return map;
}

// ── Auto-fetch pipeline ────────────────────────────────────────
// Fetches highlights for a list of finished fixtures not yet in the cache.
// Staggered at 2s per request to avoid YouTube quota abuse.

export async function autoFetchHighlights(
  fixtures: { idEvent: string; strHomeTeam: string; strAwayTeam: string }[],
  onResult: (eventId: string, data: HighlightData) => void,
  signal?: AbortSignal,
): Promise<void> {
  for (let i = 0; i < fixtures.length; i++) {
    if (signal?.aborted) break;

    const f = fixtures[i];
    const data = await fetchYoutubeHighlight(f.strHomeTeam, f.strAwayTeam);
    if (data) {
      await saveHighlight(f.idEvent, data);
      onResult(f.idEvent, data);
    }

    // Throttle: wait 2 s between requests (except after last one)
    if (i < fixtures.length - 1 && !signal?.aborted) {
      await new Promise<void>(resolve => {
        const t = setTimeout(resolve, 2000);
        signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
      });
    }
  }
}
