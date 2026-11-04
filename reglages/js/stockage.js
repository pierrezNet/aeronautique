// Mémorisation locale des réponses (localStorage), pour les retrouver à la visite suivante.
// Rien ne quitte l'appareil. localStorage peut être indisponible (navigation privée,
// stockage bloqué) : chaque accès est protégé, et l'outil fonctionne alors sans mémoire.

const CLE = 'atelier-reglages';

export function lire() {
    try {
        const brut = localStorage.getItem(CLE);
        return brut ? JSON.parse(brut) : null;
    } catch (e) {
        return null;
    }
}

export function ecrire(donnees) {
    try {
        localStorage.setItem(CLE, JSON.stringify(donnees));
    } catch (e) {}
}

export function effacer() {
    try {
        localStorage.removeItem(CLE);
    } catch (e) {}
}

// Journal des essais (étape 6) : clé séparée, il peut grossir pendant des semaines
const CLE_JOURNAL = 'atelier-reglages-journal';

export function lireJournal() {
    try {
        const brut = localStorage.getItem(CLE_JOURNAL);
        const entrees = brut ? JSON.parse(brut) : [];
        return Array.isArray(entrees) ? entrees : [];
    } catch (e) {
        return [];
    }
}

/** Renvoie false si l'écriture a échoué (stockage plein ou bloqué) */
export function ecrireJournal(entrees) {
    try {
        localStorage.setItem(CLE_JOURNAL, JSON.stringify(entrees));
        return true;
    } catch (e) {
        return false;
    }
}
