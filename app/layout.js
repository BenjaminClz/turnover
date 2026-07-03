import './globals.css';

export const metadata = {
  title: 'Turnover — Le marché des transferts amateurs',
  description: 'Connecte clubs et joueurs amateurs.',
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
      <body>{children}</body>
    </html>
  );
}
