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
