// Sauvegarde complète : aller-retour, fichier abîmé, export du journal seul.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerEntree, versJson } from '../js/moteur/journal.js';
import { journalRestaure, lireSauvegarde, versSauvegarde } from '../js/moteur/sauvegarde.js';

const reponses = { simulateur: '2024', gpu: 'RTX 5060 Ti', frequenceHz: '165', symptomes: ['chute-villes'], 'changement:tlod-2024': 'baisse' };
const essai = creerEntree({ simulateur: '2024', aeroport: 'LFPG', fpsMoyen: '40' }, new Date(Date.UTC(2026, 10, 10)));

test('aller-retour : réponses et journal identiques', () => {
    const fichier = versSauvegarde(reponses, [essai], new Date(Date.UTC(2026, 10, 10)));
    assert.deepEqual(lireSauvegarde(fichier), { reponses, journal: [essai], ignorees: 0, erreur: null });
});

test('entrées de journal invalides ignorées, réponses gardées', () => {
    const donnees = JSON.parse(versSauvegarde(reponses, [essai, { id: 'x' }]));
    const r = lireSauvegarde(JSON.stringify(donnees));
    assert.equal(r.journal.length, 1);
    assert.equal(r.ignorees, 1);
    assert.deepEqual(r.reponses, reponses);
});

test('un export du journal seul est accepté (sans réponses)', () => {
    const r = lireSauvegarde(versJson([essai]));
    assert.equal(r.erreur, null);
    assert.equal(r.reponses, null);
    assert.equal(r.journal.length, 1);
});

test('fichier illisible ou d\'un autre format : erreur', () => {
    assert.equal(lireSauvegarde('pas du json').erreur, 'json');
    assert.equal(lireSauvegarde('{"format":"autre"}').erreur, 'format');
});

test('restauration du journal sans doublon', () => {
    assert.equal(journalRestaure([essai], [essai]).length, 1);
});
