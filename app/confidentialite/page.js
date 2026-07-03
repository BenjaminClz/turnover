export const metadata = { title: 'Politique de confidentialité — Turnover' };

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 18, marginBottom: 10, color: '#D4FF3F' }}>{title}</h2>
    <div style={{ fontSize: 14.5, color: '#C7CFC8', lineHeight: 1.7 }}>{children}</div>
  </section>
);

export default function Confidentialite() {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1F1A', color: '#F5F0E6', fontFamily: 'sans-serif', padding: '48px 5vw' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href="/" style={{ color: '#D4FF3F', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>← Turnover</a>
        <h1 style={{ fontSize: 30, margin: '24px 0 32px' }}>Politique de confidentialité</h1>

        <Section title="1. Données collectées">
          <p>Selon votre profil, Turnover collecte :</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Identité : nom, adresse email</li>
            <li>Profil joueur : date de naissance, taille, poids, ville, nationalité, historique de clubs, statistiques sportives déclaratives</li>
            <li>Contenu publié : photos de profil, galerie, messages échangés avec d'autres utilisateurs</li>
            <li>Données de connexion : date de dernière activité</li>
            <li>Données de paiement (clubs abonnés) : traitées exclusivement par notre prestataire Stripe, jamais stockées sur nos serveurs</li>
          </ul>
        </Section>

        <Section title="2. Finalité du traitement">
          <p>Ces données sont utilisées pour :</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Permettre la mise en relation entre joueurs et clubs</li>
            <li>Afficher les profils publics et faciliter la recherche</li>
            <li>Envoyer des notifications pertinentes (offres correspondant à un profil)</li>
            <li>Gérer les abonnements payants des clubs</li>
            <li>Assurer la modération et la sécurité de la plateforme</li>
          </ul>
        </Section>

        <Section title="3. Base légale">
          <p>
            Le traitement repose sur l'exécution du contrat (fourniture du service), le consentement (notifications,
            profil public) et l'intérêt légitime (sécurité, prévention de la fraude).
          </p>
        </Section>

        <Section title="4. Profils publics">
          <p>
            Un joueur peut choisir de rendre son profil accessible publiquement (sans connexion) à des fins de
            visibilité auprès des clubs, via un lien dédié qu'il peut activer ou partager. Seules des informations
            non sensibles sont visibles sur cette page publique (poste, niveau, ville, statistiques déclaratives).
            Aucune coordonnée de contact n'y est affichée.
          </p>
        </Section>

        <Section title="5. Destinataires des données">
          <p>
            Les données sont hébergées par Supabase (base de données) et Vercel (hébergement du site), et traitées
            par Stripe pour les paiements et Resend pour l'envoi d'emails. Aucune donnée n'est vendue à des tiers.
          </p>
        </Section>

        <Section title="6. Durée de conservation">
          <p>
            Les données sont conservées tant que le compte est actif. En cas de suppression de compte, les données
            sont effacées sous 30 jours, sous réserve des obligations légales de conservation (ex. facturation).
          </p>
        </Section>

        <Section title="7. Vos droits">
          <p>
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et
            de portabilité de vos données. Vous pouvez exercer ces droits en écrivant à turn-over@outlook.fr, ou
            directement depuis votre espace personnel pour la suppression de compte.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Le site utilise des cookies strictement nécessaires à son fonctionnement (connexion, préférences).
            Aucun cookie publicitaire ou de traçage tiers n'est utilisé à ce jour.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>Pour toute question relative à vos données : turn-over@outlook.fr</p>
        </Section>

        <p style={{ fontSize: 12.5, color: '#5C6B5E', marginTop: 40 }}>Dernière mise à jour : juillet 2026.</p>
      </div>
    </div>
  );
}
