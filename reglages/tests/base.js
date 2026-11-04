// Charge la base de connaissances (donnees/*.json) pour les tests, comme le fera l'interface.
import { readFileSync } from 'node:fs';

const lire = nom => JSON.parse(readFileSync(new URL(`../donnees/${nom}`, import.meta.url), 'utf8'));

export const base = {
    parametres: lire('parametres.json').parametres,
    regles: lire('regles.json').regles,
    materiel: lire('materiel.json'),
    symptomes: lire('symptomes.json').symptomes,
    challenges: lire('challenges.json').challenges
};
