export const metadata = { title: 'Mentions légales — Turnover' };

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 18, marginBottom: 10, color: '#D4FF3F' }}>{title}</h2>
    <div style={{ fontSize: 14.5, color: '#C7CFC8', lineHeight: 1.7 }}>{children}</div>
  </section>
);

export default function MentionsLegales() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1F1A', color: '#F5F0E6', fontFamily: 'sans-serif', padding: '48px 5vw' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ color: '#D4FF3F', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>← Turnover</a>
        <h1 style={{ fontSize: 30, margin: '24px 0 32px' }}>Mentions légales</h1>

        <Section title="Éditeur du site">
          <p>
            Le site Turnover est édité par : <strong>[Nom et prénom du responsable de publication — à compléter]</strong>.
          </p>
          <p style={{ marginTop: 8 }}>
            En l'absence de structure juridique enregistrée à ce jour, le site est publié à titre individuel.
            Cette mention doit être complétée avec l'identité réelle de la personne responsable de la publication,
            conformément à l'article 6-III de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique (LCEN).
          </p>
          <p style={{ marginTop: 8 }}>Contact : turn-over@outlook.fr</p>
        </Section>

        <Section title="Hébergement">
          <p>Le site est hébergé par :</p>
          <p style={{ marginTop: 4 }}>
            Vercel Inc.<br />
            340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br />
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: '#D4FF3F' }}>vercel.com</a>
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L'ensemble des contenus présents sur le site Turnover (textes, logo, structure, code) est protégé par le droit d'auteur.
            Toute reproduction, représentation ou exploitation, totale ou partielle, sans autorisation préalable, est interdite.
          </p>
        </Section>

        <Section title="Données personnelles">
          <p>
            Le traitement des données personnelles collectées sur le site est détaillé dans notre{' '}
            <a href="/confidentialite" style={{ color: '#D4FF3F' }}>politique de confidentialité</a>.
          </p>
        </Section>

        <Section title="Responsabilité">
          <p>
            Turnover met en relation des joueurs et des clubs amateurs mais n'intervient pas dans la relation contractuelle
            (recrutement, transfert, rémunération) qui peut en découler entre les utilisateurs. Turnover ne saurait être tenu
            responsable des informations publiées par les utilisateurs ni des échanges entre eux.
          </p>
        </Section>

        <Section title="Contact">
          <p>Pour toute question relative au site : turn-over@outlook.fr</p>
        </Section>

        <p style={{ fontSize: 12.5, color: '#5C6B5E', marginTop: 40 }}>Dernière mise à jour : juillet 2026.</p>
      </div>
    </div>
  );
}
