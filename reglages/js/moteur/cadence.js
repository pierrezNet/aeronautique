// Cible d'images par seconde selon la fréquence de l'écran.
// Sans fréquence variable (VRR : G-Sync, FreeSync), chaque image doit rester affichée un nombre
// entier de rafraîchissements : la cible doit diviser exactement la fréquence (165 → 82,5 ; 55 ; 41,25…).
// Avec VRR, l'écran suit le jeu : la cible doit seulement rester dans sa plage.

// En dessous, l'image n'est plus jugée fluide : on ne propose pas de cible plus basse.
export const FPS_MIN = 24;
// Tolérance de comparaison (un verrou à 82,5 saisi « 82.5 » ou calculé 165/2)
const TOLERANCE = 0.01;
// Écart en FPS sous lequel une mesure est considérée comme bloquée par le verrou
const MARGE_VERROU = 1;

const arrondi = v => Math.round(v * 100) / 100;

/** Sous-multiples de la fréquence, du plus haut au plus bas, jusqu'à FPS_MIN : 165 → [165, 82.5, 55, 41.25, 33, 27.5] */
export function sousMultiples(frequenceHz, minimum = FPS_MIN) {
    const cibles = [];
    for (let diviseur = 1; frequenceHz / diviseur >= minimum; diviseur++) {
        cibles.push({ diviseur, fps: arrondi(frequenceHz / diviseur) });
    }
    return cibles;
}

/**
 * Analyse la cadence : le verrou choisi tombe-t-il juste, et quelle cible proposer ?
 * @param {object} p
 * @param {number} p.frequenceHz   fréquence de l'écran
 * @param {boolean} p.vrr          fréquence variable active
 * @param {number|null} p.verrouFps  limite d'images réglée (panneau Nvidia ou simulateur), si elle existe
 * @param {number|null} p.fpsReels   FPS réellement tenus (sans génération d'images ni verrou), si mesurés
 */
export function analyserCadence({ frequenceHz, vrr = false, verrouFps = null, fpsReels = null }) {
    if (!(frequenceHz > 0)) return { valide: false };
    const cibles = sousMultiples(frequenceHz);

    // Le verrou divise-t-il exactement la fréquence ?
    const verrouExact = verrouFps === null
        ? null
        : cibles.some(c => Math.abs(c.fps - verrouFps) < TOLERANCE);

    // FPS mesurés collés au verrou (à MARGE_VERROU près) : c'est le verrou qui les bloque, pas la machine.
    // On ne sait pas ce qu'elle tient vraiment : il faut mesurer sans verrou.
    // Nettement en dessous (36 pour un verrou à 41), la mesure reflète bien la capacité.
    const mesureBloqueeParVerrou = verrouFps !== null && fpsReels > 0 && Math.abs(fpsReels - verrouFps) <= MARGE_VERROU;

    // Cible conseillée sans VRR : le plus haut sous-multiple que l'on tient réellement
    let cibleConseillee = null;
    if (!vrr && fpsReels > 0 && !mesureBloqueeParVerrou) {
        cibleConseillee = cibles.find(c => c.fps <= fpsReels + TOLERANCE) ?? null;
    }

    // Sous-multiples encadrant le verrou (ex. 41 → 41,25 juste au-dessus, 33 en dessous)
    let voisins = [];
    if (verrouFps !== null && verrouExact === false) {
        const audessus = [...cibles].reverse().find(c => c.fps > verrouFps);
        const endessous = cibles.find(c => c.fps < verrouFps);
        voisins = [audessus, endessous].filter(Boolean);
    }

    return {
        valide: true,
        frequenceHz,
        vrr,
        cibles,
        verrouFps,
        verrouExact,
        // Un verrou inexact ne pose problème que sans VRR
        verrouProblematique: !vrr && verrouExact === false,
        voisins,
        mesureBloqueeParVerrou,
        cibleConseillee
    };
}
