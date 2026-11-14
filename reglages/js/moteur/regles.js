// Conditions des règles de donnees/regles.json : une fonction par règle, sous le même id.
// Le JSON porte les textes, les sources et le statut ; ici, seulement « quand la règle s'applique ».
// Un test (tests/regles.test.js) vérifie que chaque règle du JSON a sa fonction, et inversement.
//
// Chaque fonction reçoit le contexte calculé par analyser() :
//   { profil, mesures, symptomes, changements, famille, diagnostic, cadence, generation }
// Les questions sur les réglages changés (mode challenge) sont dans challenge.js.

import { capturePlafonnee } from './diagnostic.js';

const enVr = ctx => ctx.profil.affichage === 'vr';

export const CONDITIONS = {
    // Diagnostic
    'diag-sans-mesure': ctx => !['mesure', 'capture'].includes(ctx.diagnostic.confiance),
    'diag-capture-presentmon': ctx => ctx.diagnostic.confiance === 'capture',
    'diag-capture-plafonnee': ctx => capturePlafonnee(ctx.mesures),
    'diag-limite-main-thread': ctx => ctx.diagnostic.goulot === 'cpu' && ctx.diagnostic.fil === 'principal',
    'diag-limite-gpu': ctx => ctx.diagnostic.goulot === 'gpu',
    'diag-limite-rendu': ctx => ctx.diagnostic.fil === 'rendu',
    'diag-vram-saturee': ctx => ctx.diagnostic.goulot === 'vram',
    'dlss-inutile-goulot-cpu': ctx => ctx.diagnostic.goulot === 'cpu',
    'dlss-ecrans-cockpit-flous': ctx => ctx.profil.simulateur === '2024' && ctx.symptomes.includes('ecrans-cockpit-flous'),

    // Cadence (écran ; en VR, voir plus bas)
    'cadence-sous-multiple': ctx => ctx.cadence.valide && ctx.cadence.verrouProblematique === true,
    'cadence-vrr': ctx => ctx.cadence.valide && ctx.cadence.vrr === true,
    'cadence-vsync-affichee': ctx => !enVr(ctx) && ctx.mesures.synchroAffichee === 'vsync',

    // Génération d'images
    'generation-pas-la-simulation': ctx => ctx.generation.disponible === true,
    'generation-seuil-base': ctx => ['deconseillee', 'mesure-requise'].includes(ctx.generation.avis),
    'generation-juste-sous-seuil': ctx => ctx.generation.avis === 'juste-sous-seuil',
    // Information utile à qui a la génération d'images sans la multi-génération (RTX 40)
    'generation-mfg-rtx50': ctx => ctx.profil.simulateur === '2024' && ctx.generation.disponible === true && !ctx.generation.multiDisponible,

    // Réalité virtuelle
    'vr-profil-separe': ctx => enVr(ctx),
    'vr-wmr-fin-de-vie': ctx => enVr(ctx) && ctx.profil.runtime === 'wmr',
    'vr-reprojection-moitie': ctx => enVr(ctx) && ctx.cadence.valide && ctx.cadence.pleineTenue !== true,
    'vr-entre-les-deux': ctx => enVr(ctx) && ctx.cadence.entreLesDeux === true,
    'vr-reprojection-desactivee': ctx => enVr(ctx) && ctx.profil.reprojection === 'desactivee' && ctx.cadence.pleineTenue !== true,
    'vr-mesure-plafonnee': ctx => enVr(ctx) && ctx.cadence.mesurePlafonnee === true,
    'vr-foveal-pas-le-processeur': ctx => enVr(ctx) && ctx.profil.simulateur === '2024' && ctx.diagnostic.goulot === 'cpu',
    'vr-generation-a-verifier': ctx => ctx.generation.avis === 'vr-a-verifier'
};

/**
 * Règles qui s'appliquent au contexte, dans l'ordre de regles.json, sans les règles obsolètes
 * ni celles d'un autre simulateur.
 */
export function reglesApplicables(regles, ctx) {
    return regles.filter(r =>
        r.statut !== 'obsolete'
        && (r.simulateur === 'les-deux' || r.simulateur === ctx.profil.simulateur)
        && CONDITIONS[r.id]?.(ctx) === true
    );
}
