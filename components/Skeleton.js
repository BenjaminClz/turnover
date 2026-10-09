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

const S = { background: 'var(--line-soft)' };

// Fil d'actualité : en-tête auteur + bloc média + lignes de texte
export function SkeletonFeed({ count = 2 }) {
  return (
    <div style={{ display: 'grid', gap: 32 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <Skeleton height={40} width={40} radius={999} style={S} />
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              <Skeleton height={13} width="30%" style={S} />
              <Skeleton height={11} width="18%" style={S} />
            </div>
          </div>
          <Skeleton height={0} radius={12} style={{ ...S, paddingBottom: '75%' }} />
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <Skeleton height={13} width="85%" style={S} />
            <Skeleton height={13} width="55%" style={S} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Page profil : avatar, compteurs, nom, puis grille de photos
export function SkeletonProfile() {
  return (
    <div style={{ maxWidth: 935, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
        <Skeleton height={120} width={120} radius={999} style={{ ...S, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 12 }}>
          <Skeleton height={22} width="45%" style={S} />
          <div style={{ display: 'flex', gap: 24 }}>
            {[0, 1, 2, 3].map((k) => <Skeleton key={k} height={32} width={60} style={S} />)}
          </div>
          <Skeleton height={13} width="70%" style={S} />
        </div>
      </div>
      <SkeletonGrid />
    </div>
  );
}

// Grille de photos 3 colonnes
export function SkeletonGrid({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={0} radius={4} style={{ ...S, paddingBottom: '100%' }} />
      ))}
    </div>
  );
}
