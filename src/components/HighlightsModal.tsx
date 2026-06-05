import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  videoUrl: string;
  homeTeam: string;
  awayTeam: string;
  onClose: () => void;
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/[?&]v=([^&#]+)/) ||
            url.match(/youtu\.be\/([^?&#]+)/) ||
            url.match(/embed\/([^?&#]+)/);
  return m ? m[1] : null;
}

const MIN_W = 340;
const MIN_H = 220;
const BAR_H = 38;
const H = 8; // handle size

export default function HighlightsModal({ videoUrl, homeTeam, awayTeam, onClose }: Props) {
  const [pos,  setPos]  = useState(() => ({
    x: Math.max(8, Math.min(window.innerWidth  - 720, window.innerWidth  / 2 - 360)),
    y: Math.max(72, window.innerHeight / 2 - 240),
  }));
  const [size, setSize] = useState({ w: 720, h: 460 });

  const dragRef   = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const resizeRef = useRef<{ edge: string; ox: number; oy: number; sw: number; sh: number; px: number; py: number } | null>(null);

  const vidId = extractYoutubeId(videoUrl);

  const onDragDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
  }, [pos]);

  const onResizeDown = useCallback((e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { edge, ox: e.clientX, oy: e.clientY, sw: size.w, sh: size.h, px: pos.x, py: pos.y };
  }, [pos, size]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.ox;
        const dy = e.clientY - dragRef.current.oy;
        setPos({
          x: Math.max(0, Math.min(window.innerWidth  - 100, dragRef.current.px + dx)),
          y: Math.max(0, Math.min(window.innerHeight -  40, dragRef.current.py + dy)),
        });
      }
      if (resizeRef.current) {
        const { edge, ox, oy, sw, sh, px, py } = resizeRef.current;
        const dx = e.clientX - ox;
        const dy = e.clientY - oy;
        let nw = sw, nh = sh, nx = px, ny = py;
        if (edge.includes('e'))  nw = Math.max(MIN_W, sw + dx);
        if (edge.includes('s'))  nh = Math.max(MIN_H, sh + dy);
        if (edge.includes('w')) { nw = Math.max(MIN_W, sw - dx); nx = px + (sw - nw); }
        if (edge.includes('n')) { nh = Math.max(MIN_H, sh - dy); ny = py + (sh - nh); }
        setSize({ w: nw, h: nh });
        setPos({ x: nx, y: ny });
      }
    }
    function onUp() { dragRef.current = null; resizeRef.current = null; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y,
      width: size.w, height: size.h, zIndex: 9999,
      background: '#07090c',
      border: '1px solid rgba(255,255,255,0.13)',
      borderRadius: 8, display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 32px 96px rgba(0,0,0,0.75)',
      userSelect: 'none',
    }}>

      {/* ── Title bar (drag handle) ── */}
      <div
        onMouseDown={onDragDown}
        style={{
          height: BAR_H, flexShrink: 0, cursor: 'move',
          background: '#0c1016',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#dde5ef', letterSpacing: '.02em' }}>
            Highlights · {homeTeam} <span style={{ color: '#566b82' }}>vs</span> {awayTeam}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            border: 'none', background: 'rgba(255,255,255,0.06)',
            borderRadius: 5, padding: '4px 9px', cursor: 'pointer',
            color: '#566b82', fontSize: 11, fontWeight: 600,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#dde5ef')}
          onMouseLeave={e => (e.currentTarget.style.color = '#566b82')}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
          Fechar
        </button>
      </div>

      {/* ── Video ── */}
      <div style={{ flex: 1, background: '#000', position: 'relative' }}>
        {vidId ? (
          <iframe
            src={`https://www.youtube.com/embed/${vidId}?autoplay=1`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#566b82', fontSize: 13 }}>
            Vídeo não disponível
          </div>
        )}
      </div>

      {/* ── Resize handles ── */}
      {/* Right */}
      <div onMouseDown={e => onResizeDown(e, 'e')}
        style={{ position:'absolute', right:0, top:H, bottom:H, width:H, cursor:'ew-resize' }} />
      {/* Bottom */}
      <div onMouseDown={e => onResizeDown(e, 's')}
        style={{ position:'absolute', bottom:0, left:H, right:H, height:H, cursor:'ns-resize' }} />
      {/* Bottom-right */}
      <div onMouseDown={e => onResizeDown(e, 'se')}
        style={{ position:'absolute', right:0, bottom:0, width:H*2, height:H*2, cursor:'nwse-resize' }} />
      {/* Left */}
      <div onMouseDown={e => onResizeDown(e, 'w')}
        style={{ position:'absolute', left:0, top:H, bottom:H, width:H, cursor:'ew-resize' }} />
      {/* Bottom-left */}
      <div onMouseDown={e => onResizeDown(e, 'sw')}
        style={{ position:'absolute', left:0, bottom:0, width:H*2, height:H*2, cursor:'nesw-resize' }} />
    </div>
  );
}
