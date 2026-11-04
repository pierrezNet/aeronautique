// Journal avant/après : une entrée par essai (un seul réglage modifié), comparaison avec
// l'essai précédent, exports JSON et CSV, import JSON. Fonctions pures : le stockage et
// les téléchargements sont gérés par l'interface.

export const FORMAT = 'atelier-reglages-journal';
export const VERSION = 1;

// Champs du scénario : identiques d'un essai à l'autre pour que la comparaison ait un sens
export const CHAMPS_SCENARIO = ['aeroport', 'avion', 'meteo', 'heure', 'duree'];

const texte = v => String(v ?? '').trim();
const nombre = v => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

/**
 * Entrée normalisée à partir des champs saisis.
 * @param {object} champs  { simulateur, aeroport, avion, meteo, heure, duree, reglage, avant, apres,
 *                           generationActive, fpsMoyen, unPourcentBas, ressenti, notes }
 * @param {Date} maintenant  date de l'essai (injectée pour les tests)
 */
export function creerEntree(champs, maintenant = new Date()) {
    return {
        id: `${maintenant.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        date: maintenant.toISOString(),
        simulateur: texte(champs.simulateur),
        scenario: Object.fromEntries(CHAMPS_SCENARIO.map(c => [c, texte(champs[c])])),
        // reglage vide : mesure de référence, sans changement
        reglage: { id: texte(champs.reglage), avant: texte(champs.avant), apres: texte(champs.apres) },
        generationActive: champs.generationActive === true,
        fpsMoyen: nombre(champs.fpsMoyen),
        unPourcentBas: nombre(champs.unPourcentBas),
        ressenti: nombre(champs.ressenti),
        notes: texte(champs.notes)
    };
}

/** Champs manquants ou invalides : liste de noms de champs (vide si l'entrée est complète) */
export function champsInvalides(entree) {
    const erreurs = [];
    if (!['2020', '2024'].includes(entree.simulateur)) erreurs.push('simulateur');
    if (!(entree.fpsMoyen > 0)) erreurs.push('fpsMoyen');
    if (entree.unPourcentBas !== null && !(entree.unPourcentBas > 0)) erreurs.push('unPourcentBas');
    if (entree.ressenti !== null && ![1, 2, 3, 4, 5].includes(entree.ressenti)) erreurs.push('ressenti');
    if (entree.reglage.id !== '' && (entree.reglage.avant === '' || entree.reglage.apres === '')) erreurs.push('avantApres');
    return erreurs;
}

/**
 * Compare un essai au précédent du même simulateur.
 * avertissements : 'premier' (rien à comparer), 'scenario-different' (le test n'est pas le même),
 * 'generation-differente' (FPS avec et sans génération d'images : incomparables),
 * 'sans-changement' (mesure de référence, aucun réglage modifié)
 */
export function comparer(entree, precedente) {
    const avertissements = [];
    if (entree.reglage.id === '') avertissements.push('sans-changement');
    if (!precedente) return { ecartFps: null, ecartPourcent: null, ecartUnPourcent: null, avertissements: ['premier', ...avertissements] };

    const champsDifferents = CHAMPS_SCENARIO.filter(c => entree.scenario[c].toLowerCase() !== precedente.scenario[c].toLowerCase());
    if (champsDifferents.length > 0) avertissements.push('scenario-different');
    if (entree.generationActive !== precedente.generationActive) avertissements.push('generation-differente');

    const ecartFps = Math.round((entree.fpsMoyen - precedente.fpsMoyen) * 10) / 10;
    return {
        ecartFps,
        ecartPourcent: Math.round((ecartFps / precedente.fpsMoyen) * 1000) / 10,
        ecartUnPourcent: entree.unPourcentBas !== null && precedente.unPourcentBas !== null
            ? Math.round((entree.unPourcentBas - precedente.unPourcentBas) * 10) / 10
            : null,
        champsDifferents,
        avertissements
    };
}

/** Entrées triées de la plus ancienne à la plus récente, chacune avec sa comparaison au précédent essai du même simulateur */
export function avecComparaisons(entrees) {
    const triees = [...entrees].sort((a, b) => a.date.localeCompare(b.date));
    const dernier = {};
    return triees.map(entree => {
        const comparaison = comparer(entree, dernier[entree.simulateur]);
        dernier[entree.simulateur] = entree;
        return { entree, comparaison };
    });
}

/** Export JSON complet, réimportable */
export function versJson(entrees, maintenant = new Date()) {
    return JSON.stringify({ format: FORMAT, version: VERSION, exporte: maintenant.toISOString(), entrees }, null, 2);
}

/**
 * Import d'un export JSON. Les entrées mal formées sont ignorées et comptées.
 * @returns {{ entrees: object[], ignorees: number, erreur: string|null }}
 */
export function lireJson(contenu) {
    let donnees;
    try {
        donnees = JSON.parse(contenu);
    } catch (e) {
        return { entrees: [], ignorees: 0, erreur: 'json' };
    }
    if (donnees?.format !== FORMAT || !Array.isArray(donnees.entrees)) return { entrees: [], ignorees: 0, erreur: 'format' };
    const valides = donnees.entrees.filter(e =>
        typeof e?.id === 'string' && typeof e.date === 'string' && e.scenario && e.reglage && champsInvalides(e).length === 0);
    return { entrees: valides, ignorees: donnees.entrees.length - valides.length, erreur: null };
}

/** Ajoute les entrées importées, sans doublon (même id) */
export function fusionner(existantes, importees) {
    const ids = new Set(existantes.map(e => e.id));
    return [...existantes, ...importees.filter(e => !ids.has(e.id))];
}

/**
 * Export CSV (une ligne par essai, comparaison comprise), ouvrable dans un tableur.
 * @param {object[]} entrees
 * @param {object} p  { separateur: ';' (tableurs français) ou ',', entetes: noms de colonnes,
 *                     libelle: id → nom du réglage, remarque: code d'avertissement → texte }
 */
export function versCsv(entrees, { separateur = ';', entetes, libelle = id => id, remarque = code => code }) {
    const cellule = v => {
        const s = v === null || v === undefined ? '' : String(v);
        // Guillemets si la cellule contient le séparateur, un guillemet ou un saut de ligne
        return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lignes = avecComparaisons(entrees).map(({ entree: e, comparaison: c }) => [
        e.date, e.simulateur, ...CHAMPS_SCENARIO.map(ch => e.scenario[ch]),
        e.reglage.id ? libelle(e.reglage.id) : '', e.reglage.avant, e.reglage.apres,
        e.generationActive ? 1 : 0, e.fpsMoyen, e.unPourcentBas, e.ressenti,
        c.ecartFps, c.ecartPourcent, c.avertissements.map(remarque).join(' '), e.notes
    ]);
    return [entetes, ...lignes].map(l => l.map(cellule).join(separateur)).join('\r\n');
}
