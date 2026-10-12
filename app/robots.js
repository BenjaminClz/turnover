export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Espace connecté, API et pages techniques : rien à indexer
      disallow: ['/app', '/api/', '/reset-password'],
    },
    sitemap: 'https://turnover-sport.fr/sitemap.xml',
    host: 'https://turnover-sport.fr',
  };
}
