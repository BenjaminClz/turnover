'use client';

export function Skeleton({ height = 20, width = '100%', radius = 8, style = {} }) {
  return (
    <div
      className="tv-skeleton"
      style={{ height, width, borderRadius: radius, background: '#152E26', ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: '#152E26', border: '1.5px solid #2C4A3D', borderRadius: 14, padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
      <Skeleton height={48} width={48} radius={10} style={{ flexShrink: 0, background: '#1c332a' }} />
      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
        <Skeleton height={16} width="40%" style={{ background: '#1c332a' }} />
        <Skeleton height={13} width="65%" style={{ background: '#1c332a' }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
