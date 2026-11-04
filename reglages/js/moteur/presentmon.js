// Lecture d'une capture PresentMon (outil libre d'Intel, CSV : une ligne par image).
// On en tire les FPS moyens, le 1 % bas et une estimation du goulot : si la carte graphique
// travaille presque toute la durée de l'image, c'est elle qui limite ; si elle attend souvent,
// c'est le processeur (voir la règle diag-capture-presentmon et ses sources).
//
// Les noms de colonnes changent selon la version (PresentMon 2 : MsBetweenPresents, MsGPUBusy ;
// PresentMon 1 : msGPUActive…) : on accepte plusieurs noms, sans tenir compte de la casse.

const COLONNES = {
    application: ['application'],
    dureeImage: ['msbetweenpresents', 'frametime'],
    gpuOccupe: ['msgpubusy', 'gpubusy', 'msgpuactive'],
    cpuOccupe: ['mscpubusy', 'cpubusy'],
    typeImage: ['frametype'],
    synchro: ['syncinterval']
};

// Programmes de Windows souvent présents dans une capture sans filtre (--process_name) :
// le compositeur dwm.exe produit beaucoup d'images, calées sur l'écran, sans rapport avec le jeu
const PROGRAMMES_SYSTEME = ['dwm.exe'];

// Part de la durée d'image pendant laquelle la carte graphique travaille.
// Au-dessus de SEUIL_GPU : elle limite ; en dessous de SEUIL_CPU : elle attend le processeur.
// Seuils retenus ici, pas publiés par Intel : à vérifier.
export const SEUIL_GPU = 0.9;
export const SEUIL_CPU = 0.75;

// Découpe une ligne CSV (champs éventuellement entre guillemets)
function cellules(ligne) {
    const resultat = [];
    let courant = '';
    let entreGuillemets = false;
    for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (entreGuillemets) {
            if (c === '"' && ligne[i + 1] === '"') { courant += '"'; i++; }
            else if (c === '"') entreGuillemets = false;
            else courant += c;
        } else if (c === '"') entreGuillemets = true;
        else if (c === ',') { resultat.push(courant); courant = ''; }
        else courant += c;
    }
    resultat.push(courant);
    return resultat.map(s => s.trim());
}

const mediane = valeurs => {
    const triees = [...valeurs].sort((a, b) => a - b);
    const milieu = Math.floor(triees.length / 2);
    return triees.length % 2 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
};

const arrondi = v => Math.round(v * 10) / 10;

/**
 * @param {string} contenu  texte du fichier CSV
 * @returns {object} { erreur } en cas d'échec ('vide' | 'colonnes'), sinon
 *   { application, images, imagesGenerees, dureeSecondes, fpsMoyen, unPourcentBas, partGpu, synchro, goulotEstime }
 *   goulotEstime : 'cpu' | 'gpu' | 'plafonne' (synchronisation verticale : la carte attend l'écran)
 *                  | 'indetermine' (sans colonne GPU, ou entre les deux seuils)
 */
export function lireCapture(contenu) {
    const lignes = String(contenu ?? '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
    if (lignes.length < 2) return { erreur: 'vide' };

    const entetes = cellules(lignes[0]).map(e => e.toLowerCase());
    const index = Object.fromEntries(Object.entries(COLONNES).map(([cle, noms]) =>
        [cle, entetes.findIndex(e => noms.includes(e))]));
    if (index.dureeImage === -1) return { erreur: 'colonnes' };

    let images = lignes.slice(1).map(cellules);

    // Plusieurs programmes capturés : le simulateur s'il est là, sinon le programme (hors Windows)
    // qui a produit le plus d'images
    let application = null;
    if (index.application !== -1) {
        const compte = {};
        for (const l of images) compte[l[index.application]] = (compte[l[index.application]] ?? 0) + 1;
        const classement = Object.entries(compte).sort((a, b) => b[1] - a[1]).map(([nom]) => nom);
        application = classement.find(nom => /flightsimulator/i.test(nom))
            ?? classement.find(nom => !PROGRAMMES_SYSTEME.includes(nom.toLowerCase()))
            ?? classement[0];
        images = images.filter(l => l[index.application] === application);
    }

    // Images générées (génération d'images) : exclues, on veut les images réellement calculées.
    // Valeurs exactes de FrameType à confirmer sur une vraie capture (« Application » attendu pour les autres).
    let imagesGenerees = 0;
    if (index.typeImage !== -1) {
        const avant = images.length;
        images = images.filter(l => ['', 'application', 'notset', 'na'].includes(l[index.typeImage].toLowerCase()));
        imagesGenerees = avant - images.length;
    }

    const nombre = (l, i) => (i === -1 ? NaN : parseFloat(l[i]));
    const durees = images.map(l => nombre(l, index.dureeImage)).filter(v => v > 0);
    if (durees.length === 0) return { erreur: 'vide' };

    const total = durees.reduce((a, b) => a + b, 0);
    // 1 % bas : FPS correspondant au 99e centile des durées d'image (les 1 % d'images les plus lentes)
    const triees = [...durees].sort((a, b) => a - b);
    const centile99 = triees[Math.min(triees.length - 1, Math.ceil(triees.length * 0.99) - 1)];

    // Part de la durée d'image où la carte graphique travaille (médiane, peu sensible aux pics)
    const parts = images
        .map(l => nombre(l, index.gpuOccupe) / nombre(l, index.dureeImage))
        .filter(v => Number.isFinite(v) && v >= 0);
    const partGpu = parts.length ? Math.min(1, mediane(parts)) : null;

    // Synchronisation verticale (SyncInterval ≥ 1 sur la plupart des images) : la carte graphique
    // attend l'écran, pas le processeur. Une faible occupation ne désigne alors pas le processeur.
    const synchro = index.synchro !== -1
        && images.filter(l => parseInt(l[index.synchro], 10) >= 1).length > images.length / 2;

    let goulotEstime = 'indetermine';
    if (partGpu !== null && partGpu >= SEUIL_GPU) goulotEstime = 'gpu';
    else if (synchro) goulotEstime = 'plafonne';
    else if (partGpu !== null && partGpu <= SEUIL_CPU) goulotEstime = 'cpu';

    return {
        erreur: null,
        application,
        images: durees.length,
        imagesGenerees,
        dureeSecondes: arrondi(total / 1000),
        fpsMoyen: arrondi((durees.length * 1000) / total),
        unPourcentBas: arrondi(1000 / centile99),
        partGpu: partGpu === null ? null : Math.round(partGpu * 100) / 100,
        synchro,
        goulotEstime
    };
}
