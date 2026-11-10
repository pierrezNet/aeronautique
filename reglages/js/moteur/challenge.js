// Mode challenge, deux sortes de questions de donnees/challenges.json :
// - sur le diagnostic (« declencheur »: « diagnostic »), posées à tous selon le goulot :
//   « votre processeur limite : quel réglage essayer en premier ? » ;
// - sur les réglages que l'utilisateur dit avoir changés, qui le mettent face à son diagnostic :
//   « vous avez baissé l'échelle de rendu alors que le processeur limite : qu'espériez-vous gagner ? ».

// « echelle-rendu » vise echelle-rendu-2020 et echelle-rendu-2024
const vise = (prefixe, idParametre) => idParametre === prefixe || idParametre.startsWith(prefixe + '-');

/**
 * @param {object[]} challenges  liste de challenges.json
 * @param {object} p
 * @param {string} p.simulateur
 * @param {object[]} p.changements  { id (paramètre), sens: 'baisse'|'hausse' }
 * @param {string} p.goulot         résultat du diagnostic
 * @param {string} p.avisGeneration avis sur la génération d'images (generationImages.js)
 * @returns {{ challenge: object, changement: object }[]} questions à poser, une seule fois chacune
 */
export function questionsChallenge(challenges, { simulateur, changements = [], goulot, avisGeneration }) {
    const questions = [];
    for (const challenge of challenges) {
        if (challenge.statut === 'obsolete' || challenge.declencheur === 'diagnostic') continue;
        if (challenge.simulateur !== 'les-deux' && challenge.simulateur !== simulateur) continue;
        if (challenge.goulots.length > 0 && !challenge.goulots.includes(goulot)) continue;
        if (challenge.avisGeneration && !challenge.avisGeneration.includes(avisGeneration)) continue;

        const changement = changements.find(c => c.sens === challenge.sens && challenge.reglages.some(r => vise(r, c.id)));
        if (changement) questions.push({ challenge, changement });
    }
    return questions;
}

/** Questions sur le diagnostic : celles qui visent le goulot trouvé (ou « indetermine ») */
export function questionsDiagnostic(challenges, { simulateur, goulot }) {
    return challenges.filter(c =>
        c.declencheur === 'diagnostic'
        && c.statut !== 'obsolete'
        && (c.simulateur === 'les-deux' || c.simulateur === simulateur)
        && c.goulots.includes(goulot));
}
