// Génération d'images (DLSS Frame Generation, Multi Frame Generation) : disponible ? utile ?
// Rappels (voir donnees/regles.json) :
// - elle multiplie les images AFFICHÉES, pas les images simulées ni la réactivité ;
// - elle se justifie surtout quand les FPS réels (sans elle) sont déjà stables vers 40 ;
// - la Multi Frame Generation (3X, 4X, dynamique) est réservée aux RTX 50, dans MSFS 2024 ;
// - en réalité virtuelle, l'option existe (FrameGenerationVR) mais rien d'officiel ne dit ce qu'elle
//   donne dans un casque ni avec la reprojection : pas de seuil, avis « à vérifier ».

// Seuil de FPS réels à partir duquel la génération d'images se justifie (à vérifier : 35-40 ou 50-60 selon les sources)
export const SEUIL_BASE = 40;
// En dessous de SEUIL_BASE mais au-dessus de ce plancher : « juste sous le seuil »
export const PLANCHER_PROCHE = 35;

/**
 * @param {object} p
 * @param {object} p.profil       { simulateur: '2020'|'2024', directx: 'dx11'|'dx12'|null, affichage: 'ecran'|'vr' }
 * @param {object|null} p.famille famille de GPU (materiel.js), null si inconnue
 * @param {number|null} p.fpsReels FPS réels sans génération d'images
 * @param {string} p.goulot       résultat du diagnostic
 * @returns {{ disponible: boolean|null, multiDisponible: boolean, avis: string }}
 *   avis : 'gpu-inconnu' | 'indisponible' | 'dx11' | 'mesure-requise' | 'deconseillee-vram'
 *          | 'deconseillee' | 'juste-sous-seuil' | 'possible' | 'vr-a-verifier'
 */
export function evaluerGeneration({ profil = {}, famille = null, fpsReels = null, goulot = 'indetermine' }) {
    if (famille === null) return { disponible: null, multiDisponible: false, avis: 'gpu-inconnu' };
    if (!famille.generationImages) return { disponible: false, multiDisponible: false, avis: 'indisponible' };

    const multiDisponible = famille.multiGeneration && profil.simulateur === '2024';

    // MSFS 2020 : DirectX 12 rapporté comme prérequis (à vérifier)
    if (profil.simulateur === '2020' && profil.directx === 'dx11') {
        return { disponible: false, multiDisponible: false, avis: 'dx11' };
    }
    // Elle consomme de la mémoire vidéo : à éviter si celle-ci est déjà saturée
    if (goulot === 'vram') return { disponible: true, multiDisponible, avis: 'deconseillee-vram' };
    // Le seuil d'environ 40 FPS concerne un écran : rien de comparable n'est publié pour un casque
    if (profil.affichage === 'vr') return { disponible: true, multiDisponible, avis: 'vr-a-verifier' };
    if (!(fpsReels > 0)) return { disponible: true, multiDisponible, avis: 'mesure-requise' };

    let avis = 'possible';
    if (fpsReels < PLANCHER_PROCHE) avis = 'deconseillee';
    else if (fpsReels < SEUIL_BASE) avis = 'juste-sous-seuil';
    return { disponible: true, multiDisponible, avis };
}
