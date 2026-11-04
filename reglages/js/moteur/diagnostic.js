// Diagnostic du goulot : qu'est-ce qui limite les images par seconde ?
// Par ordre de confiance : les mesures de l'affichage FPS du mode développeur, puis une capture
// PresentMon (moteur/presentmon.js), puis les symptômes décrits, sinon « indéterminé ».
//
// Goulots possibles : 'cpu' (processeur), 'gpu' (carte graphique), 'vram' (mémoire vidéo pleine),
// 'streaming' (chargement des données), 'indetermine'.

// Part de la mémoire vidéo utilisée au-delà de laquelle on la considère saturée.
// Aucun seuil officiel : valeur prudente, statut « à vérifier » (règle diag-vram-saturee).
export const SEUIL_VRAM = 0.9;

// Libellé « Limited by … » de l'affichage FPS → goulot et fil de calcul
const LIMITES = {
    'main-thread': { goulot: 'cpu', fil: 'principal' },
    'rendu': { goulot: 'cpu', fil: 'rendu' },
    'gpu': { goulot: 'gpu', fil: 'gpu' }
};

const nombre = v => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

// Écart en FPS sous lequel une capture est considérée comme bloquée par le verrou déclaré
const MARGE_VERROU = 1;

/**
 * La capture a-t-elle été faite avec les images plafonnées (synchronisation verticale, ou FPS
 * collés au verrou déclaré) ? La carte graphique attend alors l'écran ou le verrou, et sa faible
 * occupation ne dit rien du processeur.
 */
export function capturePlafonnee(mesures = {}) {
    const c = mesures.capture;
    if (!c) return false;
    if (c.goulotEstime === 'plafonne') return true;
    const verrou = nombre(mesures.verrouFps);
    return c.goulotEstime === 'cpu' && verrou !== null && Math.abs(c.fpsMoyen - verrou) <= MARGE_VERROU;
}

/**
 * @param {object} profil   { vramGo, … }
 * @param {object} mesures  { limite: 'main-thread'|'rendu'|'gpu'|null, msPrincipal, msRendu, msGpu, vramUtiliseeGo,
 *                            capture: résumé de lireCapture() ou null }
 * @param {string[]} idsSymptomes  symptômes cochés (ids de symptomes.json)
 * @param {object[]} symptomes     liste de symptomes.json
 * @returns {{ goulot: string, fil: string|null, confiance: 'mesure'|'capture'|'symptomes'|'aucune', tauxVram: number|null }}
 */
export function diagnostiquer(profil = {}, mesures = {}, idsSymptomes = [], symptomes = []) {
    // 1. Mémoire vidéo : une mémoire pleine dégrade tout le reste, on la traite en premier
    const vramTotale = nombre(profil.vramGo);
    const vramUtilisee = nombre(mesures.vramUtiliseeGo);
    const tauxVram = vramTotale && vramUtilisee ? vramUtilisee / vramTotale : null;
    if (tauxVram !== null && tauxVram >= SEUIL_VRAM) {
        return { goulot: 'vram', fil: null, confiance: 'mesure', tauxVram };
    }

    // 2. Libellé affiché par le simulateur (« Limited by MainThread », « … GPU »…)
    if (LIMITES[mesures.limite]) {
        return { ...LIMITES[mesures.limite], confiance: 'mesure', tauxVram };
    }

    // 3. Temps par fil (en millisecondes) : le plus long fixe la cadence
    const temps = [
        ['main-thread', nombre(mesures.msPrincipal)],
        ['rendu', nombre(mesures.msRendu)],
        ['gpu', nombre(mesures.msGpu)]
    ].filter(([, ms]) => ms !== null);
    if (temps.length >= 2) {
        const [plusLent] = temps.reduce((a, b) => (b[1] > a[1] ? b : a));
        return { ...LIMITES[plusLent], confiance: 'mesure', tauxVram };
    }

    // 4. Capture PresentMon : part du temps où la carte graphique travaille
    if (['cpu', 'gpu'].includes(mesures.capture?.goulotEstime) && !capturePlafonnee(mesures)) {
        return { goulot: mesures.capture.goulotEstime, fil: null, confiance: 'capture', tauxVram };
    }

    // 5. Symptômes : le goulot cité par le plus de symptômes, s'il n'y a pas d'égalité
    const votes = {};
    for (const s of symptomes.filter(s => idsSymptomes.includes(s.id))) {
        for (const g of s.pistes.goulots) votes[g] = (votes[g] ?? 0) + 1;
    }
    const classement = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    if (classement.length > 0 && (classement.length === 1 || classement[0][1] > classement[1][1])) {
        return { goulot: classement[0][0], fil: null, confiance: 'symptomes', tauxVram };
    }

    return { goulot: 'indetermine', fil: null, confiance: 'aucune', tauxVram };
}
