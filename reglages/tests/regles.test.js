// Règles : correspondance JSON ↔ fonctions JS, et cas imposés par le cahier des charges,
// passés par le point d'entrée analyser() comme le fera l'interface.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { base } from './base.js';
import { analyser } from '../js/moteur/analyser.js';
import { CONDITIONS } from '../js/moteur/regles.js';

const ids = resultat => resultat.messages.map(m => m.id);

// Cas de départ : écran 165 Hz sans VRR, RTX 5060 Ti 16 Go, verrou à 41 dans le panneau NVIDIA
const casDeDepart = (mesures = {}, autres = {}) => analyser({
    profil: { simulateur: '2024', gpu: 'RTX 5060 Ti', vramGo: 16, frequenceHz: 165, vrr: false },
    mesures: { verrouFps: 41, ...mesures },
    ...autres
}, base);

describe('correspondance regles.json ↔ js/moteur/regles.js', () => {
    test('chaque règle du JSON a sa condition', () => {
        const manquantes = base.regles.map(r => r.id).filter(id => !CONDITIONS[id]);
        assert.deepEqual(manquantes, []);
    });

    test('chaque condition a son entrée dans le JSON', () => {
        const json = new Set(base.regles.map(r => r.id));
        assert.deepEqual(Object.keys(CONDITIONS).filter(id => !json.has(id)), []);
    });
});

describe('cas imposés', () => {
    test('165 Hz verrouillé à 41 sans VRR : signalé, 41,25 et 33 proposés autour', () => {
        const r = casDeDepart();
        assert.ok(ids(r).includes('cadence-sous-multiple'));
        assert.deepEqual(r.cadence.voisins.map(c => c.fps), [41.25, 33]);
    });

    test('… et pas signalé si l\'écran a le VRR', () => {
        const r = analyser({ profil: { simulateur: '2024', frequenceHz: 165, vrr: true }, mesures: { verrouFps: 41 } }, base);
        assert.ok(!ids(r).includes('cadence-sous-multiple'));
        assert.ok(ids(r).includes('cadence-vrr'));
    });

    test('limité par le main thread : DLSS inutile, et la génération d\'images n\'accélère pas la simulation', () => {
        const r = casDeDepart({ limite: 'main-thread', fpsReels: 41 });
        assert.equal(r.diagnostic.goulot, 'cpu');
        assert.ok(ids(r).includes('diag-limite-main-thread'));
        assert.ok(ids(r).includes('dlss-inutile-goulot-cpu'));
        assert.ok(ids(r).includes('generation-pas-la-simulation'));
        // FPS égaux au verrou : capacité inconnue, l'avis sur le seuil attend une mesure sans verrou
        assert.equal(r.generation.avis, 'mesure-requise');
        // Le tableau commence par ce qui soulage le processeur
        assert.equal(r.tableau[0].id, 'tlod-2024');
    });

    test('36 FPS réels : juste sous le seuil de la génération d\'images', () => {
        const r = casDeDepart({ limite: 'gpu', fpsReels: 36 });
        assert.equal(r.generation.avis, 'juste-sous-seuil');
        assert.ok(ids(r).includes('generation-juste-sous-seuil'));
    });

    test('multi-génération sur une carte qui n\'est pas une RTX 50 : indisponible, et expliqué', () => {
        const r = analyser({ profil: { simulateur: '2024', gpu: 'RTX 4070', frequenceHz: 144 }, mesures: { fpsReels: 50 } }, base);
        assert.equal(r.generation.multiDisponible, false);
        assert.ok(ids(r).includes('generation-mfg-rtx50'));
        // Sur une RTX 50, pas besoin de l'expliquer
        assert.ok(!ids(casDeDepart({ fpsReels: 50 })).includes('generation-mfg-rtx50'));
    });

    test('résolution baissée alors que le main thread limite : question de challenge', () => {
        const questions = r => r.challenge.map(q => q.challenge.id);
        const r = casDeDepart({ limite: 'main-thread' }, { changements: [{ id: 'echelle-rendu-2024', sens: 'baisse' }] });
        assert.deepEqual(questions(r), ['echelle-baissee-goulot-cpu']);
        // Même changement avec un goulot carte graphique : pas de challenge, c'est le bon levier
        const gpu = casDeDepart({ limite: 'gpu' }, { changements: [{ id: 'echelle-rendu-2024', sens: 'baisse' }] });
        assert.deepEqual(questions(gpu), []);
    });

    test('diagnostic par capture PresentMon : expliqué, sans réclamer de mesure', () => {
        const r = casDeDepart({ verrouFps: null, capture: { goulotEstime: 'cpu' } });
        assert.ok(ids(r).includes('diag-capture-presentmon'));
        assert.ok(!ids(r).includes('diag-sans-mesure'));
    });

    test('capture plafonnée (synchro, ou FPS égaux au verrou) : pas de diagnostic processeur, explication', () => {
        const synchro = casDeDepart({ verrouFps: null, capture: { goulotEstime: 'plafonne', fpsMoyen: 55 } });
        assert.equal(synchro.diagnostic.goulot, 'indetermine');
        assert.ok(ids(synchro).includes('diag-capture-plafonnee'));
        // Capture « processeur » mais FPS collés au verrou de 41 : la carte attendait le verrou
        const verrou = casDeDepart({ capture: { goulotEstime: 'cpu', fpsMoyen: 41 } });
        assert.equal(verrou.diagnostic.goulot, 'indetermine');
        assert.ok(ids(verrou).includes('diag-capture-plafonnee'));
        // Nettement sous le verrou : le diagnostic processeur tient
        assert.equal(casDeDepart({ capture: { goulotEstime: 'cpu', fpsMoyen: 33 } }).diagnostic.goulot, 'cpu');
    });

    test('sans aucune mesure : on demande de mesurer d\'abord', () => {
        const r = casDeDepart({ verrouFps: null });
        assert.equal(r.diagnostic.goulot, 'indetermine');
        assert.ok(ids(r).includes('diag-sans-mesure'));
    });

    test('les règles d\'un autre simulateur ne s\'affichent pas', () => {
        const r = analyser({ profil: { simulateur: '2020', gpu: 'RTX 4070', frequenceHz: 60 }, mesures: { fpsReels: 50 } }, base);
        assert.ok(!ids(r).includes('generation-mfg-rtx50'));
    });
});
