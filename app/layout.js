import './globals.css';
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';

export const metadata = {
  title: 'Turnover — Le marché des transferts amateurs',
  description: 'Connecte clubs et joueurs amateurs.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Turnover' },
};

export const viewport = {
  themeColor: '#0B1F1A',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" href="/icons/icon-192.png" />
        <script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`} async></script>
      </head>
      <body>
        {children}
        <footer style={{ textAlign: 'center', padding: '24px 5vw', fontSize: 13, color: 'var(--faint)' }}>
          <a href="/mentions-legales" style={{ color: 'var(--faint)', marginRight: 16 }}>Mentions légales</a>
          <a href="/cgu" style={{ color: 'var(--faint)', marginRight: 16 }}>CGU</a>
          <a href="/confidentialite" style={{ color: 'var(--faint)' }}>Confidentialité</a>
        </footer>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  );
}

