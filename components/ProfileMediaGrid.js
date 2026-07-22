'use client';

import { useState } from 'react';

export default function ProfileMediaGrid({ items }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!items || items.length === 0) return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
        {items.map((it, i) => (
          <button
            key={it.id}
            onClick={() => setLightboxIdx(i)}
            style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: '#0B1F1A' }}
          >
            {it.media_type === 'video' ? (
              <video src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <img src={it.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
            {it.media_type === 'video' && (
              <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 15, filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.6))' }}>▶️</span>
            )}
          </button>
        ))}
      </div>

      {lightboxIdx != null && (
        <div
          onClick={() => setLightboxIdx(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <button onClick={() => setLightboxIdx(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#F5F0E6', fontSize: 28, cursor: 'pointer' }}>✕</button>
          {lightboxIdx > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#F5F0E6', fontSize: 22, width: 42, height: 42, borderRadius: '50%', cursor: 'pointer' }}>‹</button>
          )}
          {lightboxIdx < items.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#F5F0E6', fontSize: 22, width: 42, height: 42, borderRadius: '50%', cursor: 'pointer' }}>›</button>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            {items[lightboxIdx].media_type === 'video' ? (
              <video src={items[lightboxIdx].url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 8 }} />
            ) : (
              <img src={items[lightboxIdx].url} alt="" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
