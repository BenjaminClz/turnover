import './globals.css';
import CookieBanner from '@/components/CookieBanner';

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
        <script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`} async></script>
      </head>
      <body>
        {children}
        <footer style={{ textAlign: 'center', padding: '24px 5vw', fontSize: 12.5, color: '#5C6B5E' }}>
          <a href="/mentions-legales" style={{ color: '#5C6B5E', marginRight: 16 }}>Mentions légales</a>
          <a href="/cgu" style={{ color: '#5C6B5E', marginRight: 16 }}>CGU</a>
          <a href="/confidentialite" style={{ color: '#5C6B5E' }}>Confidentialité</a>
        </footer>
        <CookieBanner />
      </body>
    </html>
  );
}
