// Appel d'une IA avec la clé de l'utilisateur (Claude, ChatGPT ou Gemini), directement depuis son
// navigateur : la clé et le texte vont au fournisseur, sans passer par aeronautique.xyz.
// Ce fichier ne fait que préparer les requêtes et lire les réponses (fonctions pures, testées) ;
// l'appel réseau est fait par interfaceIa.js. Aucun SDK : le site n'a ni build ni dépendance.
//
// Les trois API acceptent les appels depuis un navigateur (CORS vérifié le 2026-11-04).
// Anthropic l'exige explicitement par l'en-tête anthropic-dangerous-direct-browser-access.

export const FOURNISSEURS = {
    anthropic: { nom: 'Claude (Anthropic)', modeleParDefaut: 'claude-opus-5' },
    openai: { nom: 'ChatGPT (OpenAI)', modeleParDefaut: '' },
    gemini: { nom: 'Gemini (Google)', modeleParDefaut: '' }
};

// Les modèles proposés viennent du compte de l'utilisateur (requeteModeles) : pas de liste figée ici
const MODELE_VALIDE = /^[A-Za-z0-9._:\-]+$/;

const enTetesAnthropic = cle => ({
    'content-type': 'application/json',
    'x-api-key': cle,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
});

// Repli côté serveur si le modèle décline la demande : recommandé pour Claude Opus 5 et Fable
const avecRepli = modele => modele === 'claude-opus-5' || modele.startsWith('claude-fable');

/** Requête d'envoi du texte : { url, options } pour fetch() */
export function requeteMessage(fournisseur, cle, modele, texte) {
    if (!MODELE_VALIDE.test(modele)) throw new Error('modele');
    if (fournisseur === 'anthropic') {
        const enTetes = enTetesAnthropic(cle);
        const corps = { model: modele, max_tokens: 16000, messages: [{ role: 'user', content: texte }] };
        if (avecRepli(modele)) {
            enTetes['anthropic-beta'] = 'server-side-fallback-2026-07-01';
            corps.fallbacks = 'default';
        }
        return { url: 'https://api.anthropic.com/v1/messages', options: { method: 'POST', headers: enTetes, body: JSON.stringify(corps) } };
    }
    if (fournisseur === 'openai') {
        return {
            url: 'https://api.openai.com/v1/chat/completions',
            options: {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
                body: JSON.stringify({ model: modele, messages: [{ role: 'user', content: texte }] })
            }
        };
    }
    if (fournisseur === 'gemini') {
        return {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`,
            options: {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-goog-api-key': cle },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: texte }] }] })
            }
        };
    }
    throw new Error('fournisseur');
}

/**
 * Texte de la réponse, ou refus.
 * @returns {{ texte: string, refus: boolean }}
 */
export function lireReponse(fournisseur, json) {
    if (fournisseur === 'anthropic') {
        // Toujours regarder stop_reason avant le contenu : un refus arrive avec un statut HTTP 200
        if (json.stop_reason === 'refusal') return { texte: '', refus: true };
        const texte = (json.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('\n\n');
        return { texte, refus: false };
    }
    if (fournisseur === 'openai') {
        const message = json.choices?.[0]?.message;
        if (message?.refusal) return { texte: '', refus: true };
        return { texte: message?.content ?? '', refus: false };
    }
    if (fournisseur === 'gemini') {
        if (json.promptFeedback?.blockReason) return { texte: '', refus: true };
        const candidat = json.candidates?.[0];
        const texte = (candidat?.content?.parts ?? []).map(p => p.text ?? '').join('');
        return { texte, refus: texte === '' && candidat?.finishReason === 'SAFETY' };
    }
    throw new Error('fournisseur');
}

/** Requête de la liste des modèles accessibles avec cette clé */
export function requeteModeles(fournisseur, cle) {
    if (fournisseur === 'anthropic') return { url: 'https://api.anthropic.com/v1/models?limit=100', options: { headers: enTetesAnthropic(cle) } };
    if (fournisseur === 'openai') return { url: 'https://api.openai.com/v1/models', options: { headers: { authorization: `Bearer ${cle}` } } };
    if (fournisseur === 'gemini') return { url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', options: { headers: { 'x-goog-api-key': cle } } };
    throw new Error('fournisseur');
}

/** Identifiants des modèles de discussion, triés */
export function lireModeles(fournisseur, json) {
    let ids = [];
    if (fournisseur === 'anthropic') ids = (json.data ?? []).map(m => m.id);
    if (fournisseur === 'openai') {
        // Modèles de discussion seulement (pas d'images, de voix ni de vecteurs)
        ids = (json.data ?? []).map(m => m.id)
            .filter(id => /^(gpt|o\d|chatgpt)/.test(id) && !/(audio|realtime|transcribe|tts|image|embedding|search)/.test(id));
    }
    if (fournisseur === 'gemini') {
        ids = (json.models ?? [])
            .filter(m => (m.supportedGenerationMethods ?? []).includes('generateContent'))
            .map(m => String(m.name).replace(/^models\//, ''));
    }
    return ids.filter(id => MODELE_VALIDE.test(id)).sort();
}

/** Message d'erreur d'une réponse HTTP non réussie : 'cle' (401/403), 'quota' (429) ou le message du fournisseur */
export function lireErreur(statut, json) {
    if (statut === 401 || statut === 403) return { type: 'cle', detail: '' };
    if (statut === 429) return { type: 'quota', detail: '' };
    const detail = json?.error?.message ?? (typeof json?.error === 'string' ? json.error : '');
    return { type: 'autre', detail: `${statut}${detail ? ` — ${detail}` : ''}` };
}
