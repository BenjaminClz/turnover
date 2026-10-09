'use client';

export function Skeleton({ height = 20, width = '100%', radius = 8, style = {} }) {
  return (
    <div
      className="tv-skeleton"
      style={{ height, width, borderRadius: radius, background: 'var(--surface)', ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
      <Skeleton height={48} width={48} radius={10} style={{ flexShrink: 0, background: 'var(--line-soft)' }} />
      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
        <Skeleton height={16} width="40%" style={{ background: 'var(--line-soft)' }} />
        <Skeleton height={13} width="65%" style={{ background: 'var(--line-soft)' }} />
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
