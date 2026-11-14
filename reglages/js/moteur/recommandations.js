// Tableau des réglages pour un simulateur et un goulot : les réglages qui pèsent le plus sur
// la ressource qui limite viennent en premier. Les textes restent bilingues ({ fr, en }) :
// l'interface choisit la langue.

// Axe d'impact à regarder pour chaque goulot (le streaming dépend surtout des données à charger)
const AXE = { cpu: 'cpu', gpu: 'gpu', vram: 'vram', streaming: 'vram' };

// Un réglage sans champ « affichage » vaut pour l'écran et le casque ; sinon 'ecran' ou 'vr' seulement
const pourAffichage = (p, affichage) => !p.affichage || p.affichage === (affichage === 'vr' ? 'vr' : 'ecran');

/** Réglages qui s'appliquent à ce simulateur et à cet affichage, sans les entrées obsolètes */
export function parametresDuSimulateur(parametres, simulateur, affichage = 'ecran') {
    return parametres.filter(p => p.statut !== 'obsolete'
        && (p.simulateur === simulateur || p.simulateur === 'les-deux')
        && pourAffichage(p, affichage));
}

/**
 * @returns {object[]} lignes : { id, categorie, libelle, impact, coutVisuel, depart, test, statut, sources }
 */
export function tableauReglages(parametres, simulateur, goulot = 'indetermine', affichage = 'ecran') {
    const axe = AXE[goulot];
    const lignes = parametresDuSimulateur(parametres, simulateur, affichage).map(p => ({
        id: p.id,
        categorie: p.categorie,
        libelle: p.libelle,
        impact: p.impact,
        coutVisuel: p.coutVisuel,
        depart: p.departSelonGoulot[goulot] ?? p.departSelonGoulot.indetermine,
        test: p.testValidation,
        statut: p.statut,
        sources: p.sources
    }));
    // Tri stable : impact décroissant sur l'axe du goulot ; sans goulot connu, ordre du fichier
    if (axe) lignes.sort((a, b) => b.impact[axe] - a.impact[axe]);
    return lignes;
}
