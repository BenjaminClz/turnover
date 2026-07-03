export const metadata = { title: 'Conditions Générales d\'Utilisation — Turnover' };

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 18, marginBottom: 10, color: '#D4FF3F' }}>{title}</h2>
    <div style={{ fontSize: 14.5, color: '#C7CFC8', lineHeight: 1.7 }}>{children}</div>
  </section>
);

export default function CGU() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1F1A', color: '#F5F0E6', fontFamily: 'sans-serif', padding: '48px 5vw' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ color: '#D4FF3F', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>← Turnover</a>
        <h1 style={{ fontSize: 30, margin: '24px 0 32px' }}>Conditions Générales d'Utilisation</h1>

        <Section title="1. Objet">
          <p>
            Turnover est une plateforme de mise en relation entre joueurs de sports amateurs et clubs à la recherche
            de joueurs, staff médical, encadrement technique ou bénévoles. Les présentes CGU régissent l'accès et
            l'utilisation du site par tout utilisateur.
          </p>
        </Section>

        <Section title="2. Inscription et compte">
          <p>
            L'inscription est gratuite pour les joueurs. Les clubs disposent d'une offre gratuite limitée et d'une
            offre payante (Turnover Pro) décrite sur la page Abonnement. Chaque utilisateur est responsable de
            l'exactitude des informations qu'il publie et de la confidentialité de ses identifiants de connexion.
          </p>
        </Section>

        <Section title="3. Contenu publié par les utilisateurs">
          <p>
            Chaque utilisateur reste seul responsable des informations, photos et messages qu'il publie sur la
            plateforme. Turnover se réserve le droit de supprimer tout contenu manifestement illicite, trompeur ou
            contraire aux présentes CGU, notamment via le système de signalement disponible sur le site.
          </p>
        </Section>

        <Section title="4. Relation entre utilisateurs">
          <p>
            Turnover est un espace de mise en relation. Le site n'intervient pas dans les échanges, négociations ou
            engagements pris entre un joueur et un club (essais, recrutement, indemnités, contrats). Toute relation
            contractuelle qui découle d'une mise en relation via Turnover relève de la seule responsabilité des
            parties concernées.
          </p>
        </Section>

        <Section title="5. Abonnement Turnover Pro">
          <p>
            L'abonnement payant destiné aux clubs est facturé via notre prestataire de paiement Stripe. Les tarifs
            en vigueur sont affichés sur la page Abonnement au moment de la souscription. L'abonnement peut être
            résilié à tout moment ; l'accès Pro reste actif jusqu'à la fin de la période déjà payée. Aucun
            remboursement au prorata n'est effectué en cas de résiliation en cours de période.
          </p>
        </Section>

        <Section title="6. Comportement attendu">
          <p>
            Les utilisateurs s'engagent à ne pas publier de contenu injurieux, discriminatoire, mensonger ou portant
            atteinte aux droits d'un tiers, et à ne pas utiliser la messagerie à des fins de démarchage non sollicité.
          </p>
        </Section>

        <Section title="7. Suppression de compte">
          <p>
            Chaque utilisateur peut demander la suppression complète de son compte et de ses données à tout moment,
            depuis son espace personnel ou en écrivant à turn-over@outlook.fr.
          </p>
        </Section>

        <Section title="8. Modification des CGU">
          <p>
            Turnover se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront
            informés de toute modification substantielle.
          </p>
        </Section>

        <Section title="9. Droit applicable">
          <p>Les présentes CGU sont soumises au droit français.</p>
        </Section>

        <p style={{ fontSize: 12.5, color: '#5C6B5E', marginTop: 40 }}>Dernière mise à jour : juillet 2026.</p>
      </div>
    </div>
  );
}
