// Sauvegarde complète de l'atelier dans un fichier : réponses du formulaire (configuration,
// mesures, constats, réglages changés, fichiers importés résumés) et journal des essais.
// Permet de changer de navigateur ou d'appareil, ou de repartir après un effacement.

import { fusionner, lireJson as lireJournalJson } from './journal.js';

export const FORMAT = 'atelier-reglages-sauvegarde';
export const VERSION = 1;

/** Contenu du fichier de sauvegarde (texte JSON) */
export function versSauvegarde(reponses, journal, maintenant = new Date()) {
    return JSON.stringify({ format: FORMAT, version: VERSION, exporte: maintenant.toISOString(), reponses: reponses ?? {}, journal: journal ?? [] }, null, 2);
}

/**
 * Lecture d'un fichier de sauvegarde. Les entrées de journal invalides sont ignorées et comptées.
 * Un export du journal seul (format du journal) est aussi accepté : il ne contient pas de réponses.
 * @returns {{ reponses: object|null, journal: object[], ignorees: number, erreur: 'json'|'format'|null }}
 */
export function lireSauvegarde(contenu) {
    let donnees;
    try {
        donnees = JSON.parse(contenu);
    } catch (e) {
        return { reponses: null, journal: [], ignorees: 0, erreur: 'json' };
    }
    if (donnees?.format === FORMAT) {
        const reponses = donnees.reponses && typeof donnees.reponses === 'object' && !Array.isArray(donnees.reponses) ? donnees.reponses : {};
        // Le journal est relu avec les contrôles de l'import du journal
        const journal = lireJournalJson(JSON.stringify({ format: 'atelier-reglages-journal', version: 1, entrees: Array.isArray(donnees.journal) ? donnees.journal : [] }));
        return { reponses, journal: journal.entrees, ignorees: journal.ignorees, erreur: null };
    }
    const journalSeul = lireJournalJson(contenu);
    if (!journalSeul.erreur) return { reponses: null, journal: journalSeul.entrees, ignorees: journalSeul.ignorees, erreur: null };
    return { reponses: null, journal: [], ignorees: 0, erreur: 'format' };
}

/** Journal après restauration : entrées actuelles et restaurées, sans doublon */
export const journalRestaure = (actuel, restaure) => fusionner(actuel, restaure);
