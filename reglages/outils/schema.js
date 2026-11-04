// Contrôle de la base de connaissances (donnees/*.json) : champs obligatoires, valeurs permises,
// sources. Utilisé par les tests (tests/schema.test.js) et par outils/verifier.js.
// Chaque fonction renvoie une liste de messages d'erreur (vide si tout va bien).

export const SIMULATEURS = ['2020', '2024', 'les-deux'];
export const STATUTS = ['verifie', 'a-verifier', 'obsolete'];
export const CATEGORIES = ['rendu', 'anticrenelage', 'generation-images', 'detail', 'nuages', 'textures', 'ombres', 'trafic', 'cockpit', 'cadence', 'api-graphique'];
export const GOULOTS = ['cpu', 'gpu', 'vram', 'streaming', 'indetermine'];
export const TYPES_REGLE = ['diagnostic', 'cadence', 'generation', 'challenge'];
export const GRAVITES = ['info', 'attention', 'important'];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Texte bilingue : { fr: "…", en: "…" }, les deux non vides
function texteBilingue(valeur, chemin, erreurs) {
    if (!valeur || typeof valeur !== 'object') {
        erreurs.push(`${chemin} : texte bilingue { fr, en } attendu`);
        return;
    }
    for (const langue of ['fr', 'en']) {
        if (typeof valeur[langue] !== 'string' || valeur[langue].trim() === '') {
            erreurs.push(`${chemin}.${langue} : texte manquant`);
        }
    }
}

// Champs de suivi communs aux paramètres et aux règles
function suivi(entree, chemin, erreurs) {
    if (typeof entree.id !== 'string' || !ID.test(entree.id)) erreurs.push(`${chemin}.id : identifiant en minuscules-avec-tirets attendu`);
    if (!SIMULATEURS.includes(entree.simulateur)) erreurs.push(`${chemin}.simulateur : ${SIMULATEURS.join(', ')}`);
    // Les numéros de Sim Update de 2020 et 2024 se recouvrent : une entrée « les-deux » les donne séparément
    if (entree.simulateur === 'les-deux') {
        const m = entree.miseAJourMin;
        if (!m || typeof m['2020'] !== 'string' || typeof m['2024'] !== 'string') erreurs.push(`${chemin}.miseAJourMin : { "2020": "SU…", "2024": "SU…" } attendu pour « les-deux »`);
    } else if (typeof entree.miseAJourMin !== 'string' || entree.miseAJourMin === '') {
        erreurs.push(`${chemin}.miseAJourMin : Sim Update minimale testée attendue`);
    }
    if (!STATUTS.includes(entree.statut)) erreurs.push(`${chemin}.statut : ${STATUTS.join(', ')}`);
    if (entree.remplacePar !== null && typeof entree.remplacePar !== 'string') erreurs.push(`${chemin}.remplacePar : null ou identifiant`);
    if (typeof entree.dateVerification !== 'string' || !DATE.test(entree.dateVerification)) erreurs.push(`${chemin}.dateVerification : date AAAA-MM-JJ attendue`);

    if (!Array.isArray(entree.sources)) {
        erreurs.push(`${chemin}.sources : liste attendue`);
        return;
    }
    entree.sources.forEach((source, i) => {
        const c = `${chemin}.sources[${i}]`;
        if (typeof source.titre !== 'string' || source.titre === '') erreurs.push(`${c}.titre manquant`);
        if (typeof source.url !== 'string' || !source.url.startsWith('https://')) erreurs.push(`${c}.url : adresse https:// attendue`);
        if (typeof source.consulte !== 'string' || !DATE.test(source.consulte)) erreurs.push(`${c}.consulte : date AAAA-MM-JJ attendue`);
        if (![1, 2, 3, 4].includes(source.rang)) erreurs.push(`${c}.rang : 1 (Asobo/Microsoft), 2 (constructeur : NVIDIA, Intel…), 3 (mesure publiée), 4 (forums, guides)`);
    });
    // « Vérifié » exige au moins une source de rang 1 à 3 (voir la hiérarchie dans CONTRIBUTING.md)
    if (entree.statut === 'verifie' && !entree.sources.some(s => s.rang <= 3)) {
        erreurs.push(`${chemin} : statut « verifie » sans source de rang 1 à 3`);
    }
}

export function verifierParametre(p, chemin) {
    const erreurs = [];
    suivi(p, chemin, erreurs);
    for (const champ of ['libelle', 'explication', 'coutVisuel', 'testValidation']) texteBilingue(p[champ], `${chemin}.${champ}`, erreurs);
    if (!CATEGORIES.includes(p.categorie)) erreurs.push(`${chemin}.categorie : ${CATEGORIES.join(', ')}`);
    if (!Array.isArray(p.valeurs) || p.valeurs.length === 0) erreurs.push(`${chemin}.valeurs : liste non vide attendue`);
    for (const axe of ['cpu', 'gpu', 'vram']) {
        if (![0, 1, 2, 3].includes(p.impact?.[axe])) erreurs.push(`${chemin}.impact.${axe} : entier de 0 à 3`);
    }
    for (const goulot of GOULOTS) texteBilingue(p.departSelonGoulot?.[goulot], `${chemin}.departSelonGoulot.${goulot}`, erreurs);
    return erreurs;
}

export function verifierRegle(r, chemin) {
    const erreurs = [];
    suivi(r, chemin, erreurs);
    if (!TYPES_REGLE.includes(r.type)) erreurs.push(`${chemin}.type : ${TYPES_REGLE.join(', ')}`);
    if (!GRAVITES.includes(r.gravite)) erreurs.push(`${chemin}.gravite : ${GRAVITES.join(', ')}`);
    texteBilingue(r.message, `${chemin}.message`, erreurs);
    return erreurs;
}

// Identifiants uniques et remplacePar pointant vers une entrée existante
export function verifierIdentifiants(entrees, nomFichier) {
    const erreurs = [];
    const vus = new Set();
    for (const e of entrees) {
        if (vus.has(e.id)) erreurs.push(`${nomFichier} : identifiant en double « ${e.id} »`);
        vus.add(e.id);
    }
    for (const e of entrees) {
        if (e.remplacePar && !vus.has(e.remplacePar)) erreurs.push(`${nomFichier} : « ${e.id} » remplacé par « ${e.remplacePar} », introuvable`);
        if (e.statut === 'obsolete' && e.remplacePar === e.id) erreurs.push(`${nomFichier} : « ${e.id} » se remplace lui-même`);
    }
    return erreurs;
}

// Question du mode challenge : rattachement (réglages, sens, goulots), question et choix commentés
export function verifierChallenge(c, chemin, idsParametres) {
    const erreurs = [];
    suivi(c, chemin, erreurs);
    if (!Array.isArray(c.reglages) || c.reglages.length === 0) erreurs.push(`${chemin}.reglages : liste non vide attendue`);
    for (const r of c.reglages ?? []) {
        if (![...idsParametres].some(id => id === r || id.startsWith(r + '-'))) erreurs.push(`${chemin}.reglages : « ${r} » ne vise aucun paramètre`);
    }
    if (!['baisse', 'hausse'].includes(c.sens)) erreurs.push(`${chemin}.sens : baisse ou hausse`);
    if (!Array.isArray(c.goulots) || c.goulots.some(g => !GOULOTS.includes(g))) erreurs.push(`${chemin}.goulots : liste de ${GOULOTS.join(', ')} (vide : tous)`);
    texteBilingue(c.question, `${chemin}.question`, erreurs);
    if (!Array.isArray(c.choix) || c.choix.length < 2) {
        erreurs.push(`${chemin}.choix : au moins deux choix`);
    } else {
        c.choix.forEach((choix, i) => {
            texteBilingue(choix.texte, `${chemin}.choix[${i}].texte`, erreurs);
            texteBilingue(choix.explication, `${chemin}.choix[${i}].explication`, erreurs);
            if (typeof choix.correct !== 'boolean') erreurs.push(`${chemin}.choix[${i}].correct : true ou false`);
        });
        if (!c.choix.some(choix => choix.correct === true)) erreurs.push(`${chemin}.choix : au moins une réponse correcte`);
    }
    return erreurs;
}

// Symptôme du questionnaire : texte, pistes (goulots et paramètres existants), statut et sources
export function verifierSymptome(sy, chemin, idsParametres) {
    const erreurs = [];
    if (typeof sy.id !== 'string' || !ID.test(sy.id)) erreurs.push(`${chemin}.id : identifiant en minuscules-avec-tirets attendu`);
    if (!STATUTS.includes(sy.statut)) erreurs.push(`${chemin}.statut : ${STATUTS.join(', ')}`);
    if (!Array.isArray(sy.sources)) erreurs.push(`${chemin}.sources : liste attendue`);
    if (typeof sy.dateVerification !== 'string' || !DATE.test(sy.dateVerification)) erreurs.push(`${chemin}.dateVerification : date AAAA-MM-JJ attendue`);
    texteBilingue(sy.libelle, `${chemin}.libelle`, erreurs);
    texteBilingue(sy.explication, `${chemin}.explication`, erreurs);
    for (const g of sy.pistes?.goulots ?? []) {
        if (!GOULOTS.includes(g)) erreurs.push(`${chemin}.pistes.goulots : « ${g} » inconnu`);
    }
    for (const p of sy.pistes?.parametres ?? []) {
        if (!idsParametres.has(p)) erreurs.push(`${chemin}.pistes.parametres : « ${p} » absent de parametres.json`);
    }
    return erreurs;
}
