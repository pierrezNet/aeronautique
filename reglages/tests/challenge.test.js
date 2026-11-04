// Mode challenge : quelles questions pour quels changements et quel diagnostic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base } from './base.js';
import { questionsChallenge } from '../js/moteur/challenge.js';

const ids = (changements, autres = {}) => questionsChallenge(base.challenges, {
    simulateur: '2024', goulot: 'cpu', avisGeneration: 'possible', changements, ...autres
}).map(q => q.challenge.id);

test('aucun changement déclaré : aucune question', () => {
    assert.deepEqual(ids([]), []);
});

test('le préfixe du réglage vise ses entrées 2020 et 2024', () => {
    assert.deepEqual(ids([{ id: 'echelle-rendu-2024', sens: 'baisse' }]), ['echelle-baissee-goulot-cpu']);
    assert.deepEqual(ids([{ id: 'echelle-rendu-2020', sens: 'baisse' }], { simulateur: '2020' }), ['echelle-baissee-goulot-cpu']);
});

test('le sens compte : augmenter l\'échelle en goulot processeur ne pose pas de question', () => {
    assert.deepEqual(ids([{ id: 'echelle-rendu-2024', sens: 'hausse' }]), []);
});

test('le goulot compte : baisser le détail du terrain n\'est discuté qu\'en goulot carte graphique', () => {
    assert.deepEqual(ids([{ id: 'tlod-2024', sens: 'baisse' }]), []);
    assert.deepEqual(ids([{ id: 'tlod-2024', sens: 'baisse' }], { goulot: 'gpu' }), ['tlod-baisse-goulot-gpu']);
});

test('génération activée : question selon le goulot et selon la base de FPS réels', () => {
    const fg = [{ id: 'generation-images-2024', sens: 'hausse' }];
    assert.deepEqual(ids(fg), ['generation-activee-goulot-cpu']);
    assert.deepEqual(ids(fg, { goulot: 'gpu', avisGeneration: 'juste-sous-seuil' }), ['generation-activee-base-faible']);
    assert.deepEqual(ids(fg, { goulot: 'gpu', avisGeneration: 'possible' }), []);
});

test('plusieurs changements : une question par changement concerné', () => {
    const questions = ids([
        { id: 'echelle-rendu-2024', sens: 'baisse' },
        { id: 'nuages-volumetriques', sens: 'baisse' },
        { id: 'anticrenelage-2024', sens: 'hausse' }
    ]);
    assert.deepEqual(questions.sort(), ['dlss-active-goulot-cpu', 'echelle-baissee-goulot-cpu', 'nuages-baisses-goulot-cpu']);
});

test('une question obsolète ne s\'affiche plus', () => {
    const challenges = base.challenges.map(c => ({ ...c, statut: 'obsolete' }));
    assert.deepEqual(questionsChallenge(challenges, { simulateur: '2024', goulot: 'cpu', changements: [{ id: 'echelle-rendu-2024', sens: 'baisse' }] }), []);
});
