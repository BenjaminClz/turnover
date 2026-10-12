// Partage d'une page publique : menu natif sur mobile, copie du lien sur ordinateur
export async function sharePublicLink(path, title, showToast) {
  const url = `${window.location.origin}${path}`;
  try {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast?.('Lien copié : colle-le dans WhatsApp, Instagram ou un mail.');
  } catch (e) {
    if (e?.name !== 'AbortError') showToast?.('Impossible de partager le lien.');
  }
}

export const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v13" />
  </svg>
);
