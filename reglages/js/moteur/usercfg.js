// Lecture du fichier UserCfg.opt de MSFS (réglages graphiques enregistrés par le simulateur).
// Format texte : « {Section » ouvre une section, « } » la ferme, les autres lignes sont « Clé valeur ».
// Les correspondances clé → réglage de parametres.json sont dans donnees/usercfg.json.
// Seules les valeurs utiles sont gardées : le fichier contient aussi des chemins de l'ordinateur.

/** Arbre { Section: { Clé: valeur, SousSection: {…} } } à partir du texte du fichier */
export function analyserTexte(contenu) {
    const racine = {};
    const pile = [racine];
    for (const ligneBrute of String(contenu ?? '').replace(/^﻿/, '').split(/\r?\n/)) {
        const ligne = ligneBrute.trim();
        if (ligne === '') continue;
        if (ligne.startsWith('{')) {
            const section = {};
            pile[pile.length - 1][ligne.slice(1).trim()] = section;
            pile.push(section);
        } else if (ligne === '}') {
            if (pile.length > 1) pile.pop();
        } else {
            const espace = ligne.search(/\s/);
            const cle = espace === -1 ? ligne : ligne.slice(0, espace);
            const valeur = espace === -1 ? '' : ligne.slice(espace + 1).trim().replace(/^"(.*)"$/, '$1');
            pile[pile.length - 1][cle] = valeur;
        }
    }
    return racine;
}

// Valeur au bout d'un chemin « Graphics/Terrain/LoDFactor » (casse indifférente), ou undefined
function lire(arbre, chemin) {
    let noeud = arbre;
    for (const partie of chemin.split('/')) {
        if (noeud === null || typeof noeud !== 'object') return undefined;
        const cle = Object.keys(noeud).find(k => k.toLowerCase() === partie.toLowerCase());
        noeud = cle === undefined ? undefined : noeud[cle];
    }
    return typeof noeud === 'string' ? noeud : undefined;
}

// Version du simulateur d'après les clés propres à chacun (déduction, à vérifier)
function detecterSimulateur(arbre) {
    if (lire(arbre, 'Video/FrameGeneration') !== undefined) return '2024';
    if (lire(arbre, 'Video/PreferD3D12') !== undefined || lire(arbre, 'Video/DLSSG') !== undefined) return '2020';
    const version = lire(arbre, 'Graphics/Version') ?? '';
    if (version.startsWith('2.')) return '2024';
    if (version.startsWith('1.')) return '2020';
    return null;
}

const vise = (prefixe, id) => id === prefixe || id.startsWith(prefixe + '-');

/**
 * @param {string} contenu        texte du fichier UserCfg.opt
 * @param {object[]} correspondances  liste de donnees/usercfg.json
 * @param {object[]} parametres   liste de parametres.json
 * @returns {object} { erreur: 'format' } si ce n'est pas un UserCfg.opt, sinon
 *   { erreur: null, simulateur, carte, resolution, valeurs: { idParametre: { valeur, libelle, brut } } }
 *   valeur : nombre (100 pour un LoDFactor de 1.0) ou texte ; libelle : code traduit par l'interface
 *   (bas, moyen, haut, ultra, desactive…) ou null.
 */
export function lireUserCfg(contenu, correspondances, parametres) {
    const arbre = analyserTexte(contenu);
    if (lire(arbre, 'Graphics/Version') === undefined) return { erreur: 'format' };

    const simulateur = detecterSimulateur(arbre);
    const resolution = (lire(arbre, 'Video/FullScreenResolution') ?? '').trim().split(/\s+/).join('×') || null;
    const valeurs = {};

    for (const c of correspondances) {
        if (c.statut === 'obsolete') continue;
        if (c.simulateur !== 'les-deux' && c.simulateur !== simulateur) continue;
        const brut = lire(arbre, c.chemin);
        if (brut === undefined) continue;

        let valeur = brut;
        let libelle = null;
        if (c.actif && lire(arbre, c.actif) === '0') {
            libelle = 'desactive';
        } else if (c.type === 'nombre') {
            const n = parseFloat(brut);
            valeur = Number.isFinite(n) ? Math.round(n * (c.echelle ?? 1) * 100) / 100 : brut;
        } else if (c.type === 'liste') {
            libelle = c.valeurs[brut] ?? null;
        } else if (c.id === 'anticrenelage' && brut.toUpperCase() === 'DLSS') {
            // DLSS : on précise le mode (Qualité, Équilibré…) enregistré à côté
            valeur = `DLSS (${lire(arbre, 'Video/DLSSMode') ?? '?'})`;
        }

        // Réglages de parametres.json visés, pour le simulateur détecté
        for (const p of parametres) {
            const pourCeSimulateur = p.simulateur === 'les-deux' || p.simulateur === simulateur;
            if (pourCeSimulateur && vise(c.parametre, p.id)) valeurs[p.id] = { valeur, libelle, brut, statut: c.statut };
        }
    }

    return { erreur: null, simulateur, carte: lire(arbre, 'Video/Adapter') ?? null, resolution, valeurs };
}
