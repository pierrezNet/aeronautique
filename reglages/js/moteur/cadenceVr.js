// Cadence en réalité virtuelle. Dans un casque, ce n'est pas l'utilisateur qui choisit un
// sous-multiple : quand le PC ne tient pas la fréquence du casque, le runtime (ASW chez Meta,
// Motion Smoothing dans SteamVR, SSW dans Virtual Desktop) fixe lui-même le rendu à la moitié
// et synthétise une image sur deux (reprojection). Deux cibles seulement : la pleine fréquence,
// ou sa moitié avec reprojection (voir donnees/regles.json, règle vr-reprojection-moitie).

// Fréquences courantes des casques, pour conseiller une fréquence plus basse
export const FREQUENCES_CASQUES = [72, 80, 90, 120];
// Écart en FPS toléré pour dire qu'une cible est tenue (mesure à 89,4 pour 90 Hz)
const MARGE = 1;

const arrondi = v => Math.round(v * 100) / 100;

/**
 * @param {object} p
 * @param {number} p.frequenceHz     fréquence du casque
 * @param {string|null} p.reprojection 'auto' | 'forcee' | 'desactivee' | 'nsp' | null
 * @param {number|null} p.fpsReels   FPS mesurés dans le casque (sans génération d'images)
 * @returns {object} { valide, vr: true, frequenceHz, cibles, pleineTenue, demiTenue, mesurePlafonnee,
 *   entreLesDeux, cibleConseillee, frequencePlusBasse }
 */
export function analyserCadenceVr({ frequenceHz, reprojection = null, fpsReels = null }) {
    if (!(frequenceHz > 0)) return { valide: false, vr: true };
    const pleine = { diviseur: 1, fps: arrondi(frequenceHz), reprojection: false };
    const moitie = { diviseur: 2, fps: arrondi(frequenceHz / 2), reprojection: true };
    const mesure = fpsReels > 0;

    // Reprojection forcée : le rendu est bloqué à la moitié, la mesure ne dit pas si la pleine
    // fréquence serait tenue. Il faut la mesurer reprojection désactivée.
    const mesurePlafonnee = mesure && reprojection === 'forcee' && Math.abs(fpsReels - moitie.fps) <= MARGE;

    const pleineTenue = mesure && !mesurePlafonnee ? fpsReels >= pleine.fps - MARGE : null;
    const demiTenue = mesure ? fpsReels >= moitie.fps - MARGE : null;
    // Entre les deux (60 pour 90 Hz) : la reprojection automatique ramènera à la moitié
    const entreLesDeux = pleineTenue === false && demiTenue === true && fpsReels > moitie.fps + MARGE;

    let cibleConseillee = null;
    if (pleineTenue) cibleConseillee = pleine;
    else if (demiTenue) cibleConseillee = moitie;

    // Moitié non tenue : la plus haute fréquence courante dont la moitié l'est (36 FPS → 72 Hz)
    let frequencePlusBasse = null;
    if (demiTenue === false) {
        frequencePlusBasse = [...FREQUENCES_CASQUES].reverse()
            .find(f => f < frequenceHz && fpsReels >= f / 2 - MARGE) ?? null;
    }

    return {
        valide: true,
        vr: true,
        frequenceHz,
        reprojection,
        cibles: [pleine, moitie],
        pleineTenue,
        demiTenue,
        mesurePlafonnee,
        entreLesDeux,
        cibleConseillee,
        frequencePlusBasse
    };
}
