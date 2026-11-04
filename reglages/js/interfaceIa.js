// « Aller plus loin avec une IA » : prompt à copier, ou envoyé à l'IA de l'utilisateur avec SA clé
// (Claude, ChatGPT ou Gemini). La clé va directement du navigateur au fournisseur ; elle n'est
// gardée qu'en mémoire, sauf si l'utilisateur coche « mémoriser sur cet appareil ».
// La réponse est affichée comme du texte brut (aucune interprétation HTML).

import { el } from './dom.js';
import { FOURNISSEURS, lireErreur, lireModeles, lireReponse, requeteMessage, requeteModeles } from './ia.js';
import { construirePrompt } from './moteur/prompt.js';
import * as stockage from './stockage.js';
import { T, langue } from './textes.js';

const CLE_PREFERENCES = 'atelier-reglages-ia';

// Clé et question en mémoire : elles survivent au recalcul de l'étape, pas à la fermeture de la page
let cleEnMemoire = '';
let questionEnCours = '';

function lirePreferences() {
    try {
        return JSON.parse(localStorage.getItem(CLE_PREFERENCES)) ?? {};
    } catch (e) {
        return {};
    }
}

function ecrirePreferences(preferences) {
    try {
        localStorage.setItem(CLE_PREFERENCES, JSON.stringify(preferences));
    } catch (e) {}
}

async function appeler({ url, options }) {
    const reponse = await fetch(url, options);
    let json = null;
    try {
        json = await reponse.json();
    } catch (e) {}
    return { ok: reponse.ok, statut: reponse.status, json };
}

/** Section IA sous les résultats */
export function blocIa(saisie, resultat, base) {
    const preferences = lirePreferences();
    if (!cleEnMemoire && preferences.cle) cleEnMemoire = preferences.cle;

    // ── Le texte qui sera copié ou envoyé : toujours visible avant l'envoi
    const question = el('textarea', { id: 'ia-question', rows: 2, placeholder: T.iaQuestionAide });
    question.value = questionEnCours;
    const apercu = el('textarea', { id: 'ia-prompt', rows: 12, readonly: true });
    const majApercu = () => {
        apercu.value = construirePrompt({ langue, saisie, resultat, base, journal: stockage.lireJournal(), question: question.value });
    };
    question.addEventListener('input', () => {
        questionEnCours = question.value;
        majApercu();
    });
    majApercu();

    const statutCopie = el('p', { class: 'statut', role: 'status' });
    const copier = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.iaCopier);
    copier.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(apercu.value);
            statutCopie.textContent = T.iaCopie;
        } catch (e) {
            // Presse-papiers indisponible : le texte est sélectionné, à copier soi-même
            apercu.focus();
            apercu.select();
            statutCopie.textContent = T.iaCopieManuelle;
        }
    });

    // ── Envoi avec la clé de l'utilisateur
    const fournisseur = el('select', { id: 'ia-fournisseur' },
        Object.entries(FOURNISSEURS).map(([id, f]) => el('option', { value: id }, f.nom)));
    fournisseur.value = preferences.fournisseur in FOURNISSEURS ? preferences.fournisseur : 'anthropic';

    const cle = el('input', { id: 'ia-cle', type: 'password', autocomplete: 'off', spellcheck: 'false' });
    cle.value = cleEnMemoire;
    const memoriser = el('input', { id: 'ia-memoriser', type: 'checkbox' });
    memoriser.checked = Boolean(preferences.cle);

    const modele = el('input', { id: 'ia-modele', type: 'text', list: 'ia-modeles', autocomplete: 'off', spellcheck: 'false' });
    const listeModeles = el('datalist', { id: 'ia-modeles' });
    modele.value = preferences.modeles?.[fournisseur.value] ?? FOURNISSEURS[fournisseur.value].modeleParDefaut;

    const etat = el('p', { class: 'aide', role: 'status' });
    const reponse = el('div', { class: 'ia-reponse', 'aria-live': 'polite' });
    const envoyer = el('button', { type: 'button', class: 'btn' });
    const lister = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.iaLister);

    const enregistrer = () => {
        cleEnMemoire = cle.value.trim();
        const modeles = { ...(preferences.modeles ?? {}), [fournisseur.value]: modele.value.trim() };
        preferences.modeles = modeles;
        ecrirePreferences({
            fournisseur: fournisseur.value,
            modeles,
            // La clé n'est écrite sur l'appareil que si l'utilisateur l'a demandé
            ...(memoriser.checked && cleEnMemoire ? { cle: cleEnMemoire } : {})
        });
    };
    const majBouton = () => {
        envoyer.textContent = T.iaEnvoyer(FOURNISSEURS[fournisseur.value].nom);
    };

    fournisseur.addEventListener('change', () => {
        modele.value = preferences.modeles?.[fournisseur.value] ?? FOURNISSEURS[fournisseur.value].modeleParDefaut;
        listeModeles.replaceChildren();
        etat.textContent = '';
        majBouton();
        enregistrer();
    });
    for (const champ of [cle, modele, memoriser]) champ.addEventListener('change', enregistrer);

    const erreurTexte = e => (e.type === 'cle' ? T.iaErreurCle : e.type === 'quota' ? T.iaErreurQuota : T.iaErreurAutre(e.detail));

    lister.addEventListener('click', async () => {
        enregistrer();
        if (!cleEnMemoire) {
            etat.textContent = T.iaCleManquante;
            return;
        }
        etat.textContent = T.iaChargement;
        try {
            const r = await appeler(requeteModeles(fournisseur.value, cleEnMemoire));
            if (!r.ok) {
                etat.textContent = erreurTexte(lireErreur(r.statut, r.json));
                return;
            }
            const ids = lireModeles(fournisseur.value, r.json);
            listeModeles.replaceChildren(...ids.map(id => el('option', { value: id })));
            if (!modele.value && ids.length) modele.value = ids[ids.length - 1];
            etat.textContent = T.iaModelesTrouves(ids.length);
        } catch (e) {
            etat.textContent = T.iaErreurReseau;
        }
    });

    envoyer.addEventListener('click', async () => {
        enregistrer();
        if (!cleEnMemoire) {
            etat.textContent = T.iaCleManquante;
            return;
        }
        if (!modele.value.trim()) {
            etat.textContent = T.iaModeleManquant;
            return;
        }
        let requete;
        try {
            requete = requeteMessage(fournisseur.value, cleEnMemoire, modele.value.trim(), apercu.value);
        } catch (e) {
            etat.textContent = T.iaModeleInvalide;
            return;
        }
        envoyer.disabled = true;
        etat.textContent = T.iaEnvoi;
        reponse.replaceChildren();
        try {
            const r = await appeler(requete);
            if (!r.ok) {
                etat.textContent = erreurTexte(lireErreur(r.statut, r.json));
                return;
            }
            const { texte, refus } = lireReponse(fournisseur.value, r.json);
            if (refus) {
                etat.textContent = T.iaRefus;
                return;
            }
            etat.textContent = T.iaRecu(FOURNISSEURS[fournisseur.value].nom, modele.value.trim());
            reponse.append(el('p', { class: 'ia-texte' }, texte));
        } catch (e) {
            etat.textContent = T.iaErreurReseau;
        } finally {
            envoyer.disabled = false;
        }
    });
    majBouton();

    return el('div', { class: 'ia' },
        el('p', {}, T.iaIntro),
        el('div', { class: 'champ' }, el('label', { for: 'ia-question' }, T.iaQuestion), question),
        el('details', {},
            el('summary', {}, T.iaApercu),
            el('label', { for: 'ia-prompt', class: 'sr-only' }, T.iaApercu),
            apercu),
        el('div', { class: 'actions' }, copier),
        statutCopie,
        el('h4', {}, T.iaEnvoiTitre),
        el('p', { class: 'aide' }, T.iaConfidentialite),
        el('div', { class: 'grille' },
            el('div', { class: 'champ' }, el('label', { for: 'ia-fournisseur' }, T.iaFournisseur), fournisseur),
            el('div', { class: 'champ' }, el('label', { for: 'ia-cle' }, T.iaCle), cle),
            el('div', { class: 'champ' }, el('label', { for: 'ia-modele' }, T.iaModele), modele, listeModeles)
        ),
        el('label', { class: 'option' }, memoriser, ' ', T.iaMemoriser),
        el('div', { class: 'actions' }, lister, envoyer),
        etat,
        reponse
    );
}
