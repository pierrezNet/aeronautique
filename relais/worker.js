// Relais « J'ai un retour » d'aeronautique.xyz (Cloudflare Worker, JS sans build).
// Le site est statique (GitHub Pages derrière le proxy Cloudflare) : ce Worker prend la seule
// route aeronautique.xyz/api/retour et transmet le retour au forum AvroBB par liaison de service
// (FORUM_HORLOGE → HorlogeUtcFeedback, FORUM_SELCAL → SelcalFeedback, FORUM_REGLAGES →
// ReglagesFeedback). Aucune adresse publique
// côté forum ni secret partagé. Sur le modèle du relais de Phraséo (worker/src/index.ts) :
// origine vérifiée, 5 envois par minute et par IP, validation avant transmission.

// Clé envoyée par le formulaire → libellé attendu par le forum (services/appFeedback.ts d'AvroBB)
export const TYPES = {
    bug: 'Bug',
    suggestion: 'Suggestion / idée',
    question: 'Question',
    autre: 'Autre'
};

// Application → nom de la liaison de service vers le forum
export const APPLICATIONS = {
    horlogeUtc: 'FORUM_HORLOGE',
    selcal: 'FORUM_SELCAL',
    reglages: 'FORUM_REGLAGES'
};

// Atelier réglages : étapes du parcours (reglages/js/app.js), même liste qu'AvroBB
const ETAPES_REGLAGES = ['configuration', 'mesures', 'constats', 'diagnostic', 'reglages', 'challenge', 'journal', 'ia', ''];

const MAX_CORPS = 8192;
const MAX_MESSAGE = 1800;
const MAX_PSEUDO = 40;
const MAX_CONTACT = 120;

const texte = v => (typeof v === 'string' ? v.trim() : '');

// Valide le corps reçu ; renvoie { application, retour } ou null s'il est invalide.
// « retour » a exactement la forme attendue par le forum (même limites, revalidées là-bas).
export function lireRetour(corps) {
    if (!corps || typeof corps !== 'object') return null;
    const application = texte(corps.app);
    const type = TYPES[texte(corps.type)];
    const message = texte(corps.message);
    const pseudo = texte(corps.pseudo).replace(/\s+/g, ' ');
    const contact = texte(corps.contact);
    const lang = texte(corps.lang);

    if (!Object.hasOwn(APPLICATIONS, application) || !type) return null;
    if (!message || message.length > MAX_MESSAGE) return null;
    if (pseudo.length > MAX_PSEUDO || contact.length > MAX_CONTACT) return null;
    if (!['fr', 'en', ''].includes(lang)) return null;

    const retour = { type, message, pseudo, contact, lang };
    if (application === 'selcal') {
        // Code affiché au moment de l'envoi (« AB-CD »), vide s'il était incomplet
        const code = texte(corps.code).toUpperCase();
        if (code !== '' && !/^[A-S]{2}-[A-S]{2}$/.test(code)) return null;
        retour.code = code;
    }
    if (application === 'reglages') {
        // Simulateur choisi et étape d'où le retour est envoyé : aident au tri, facultatifs
        const simulateur = texte(corps.simulateur);
        const etape = texte(corps.etape);
        if (!['2020', '2024', ''].includes(simulateur) || !ETAPES_REGLAGES.includes(etape)) return null;
        retour.simulateur = simulateur;
        retour.etape = etape;
    }
    return { application, retour };
}

function reponse(statut, corps) {
    return new Response(corps === undefined ? null : JSON.stringify(corps), {
        status: statut,
        headers: corps === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }
    });
}

async function traiterRetour(requete, env) {
    // Même origine que le site uniquement (le navigateur envoie toujours Origin sur un POST fetch)
    const origines = (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
    if (!origines.includes(requete.headers.get('Origin'))) return reponse(403, { erreur: 'origine' });

    const ip = requete.headers.get('CF-Connecting-IP') || 'inconnue';
    const { success } = await env.RETOUR_LIMITER.limit({ key: ip });
    if (!success) return reponse(429, { erreur: 'debit' });

    const brut = await requete.text();
    if (brut.length > MAX_CORPS) return reponse(413, { erreur: 'taille' });

    let corps;
    try {
        corps = JSON.parse(brut);
    } catch (e) {
        return reponse(400, { erreur: 'json' });
    }

    const lu = lireRetour(corps);
    if (!lu) return reponse(400, { erreur: 'champs' });

    // Sujet du forum privé « à trier » ; le contact part seulement par e-mail aux administrateurs
    try {
        const resultat = await env[APPLICATIONS[lu.application]].submit(lu.retour);
        if (!resultat.ok) {
            console.error('Le forum a refusé le retour', resultat.reason);
            return reponse(502, { erreur: 'forum' });
        }
    } catch (err) {
        console.error("Le forum n'a pas reçu le retour", err);
        return reponse(502, { erreur: 'forum' });
    }
    return reponse(204);
}

export default {
    async fetch(requete, env) {
        const { pathname } = new URL(requete.url);
        if (pathname === '/api/retour' && requete.method === 'POST') return traiterRetour(requete, env);
        return reponse(404, { erreur: 'introuvable' });
    }
};
