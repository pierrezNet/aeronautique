// Tests des modules du moteur (fonctions pures), un bloc par module.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { base } from './base.js';
import { familleGpu } from '../js/moteur/materiel.js';
import { analyserCadence, sousMultiples } from '../js/moteur/cadence.js';
import { diagnostiquer } from '../js/moteur/diagnostic.js';
import { evaluerGeneration } from '../js/moteur/generationImages.js';
import { tableauReglages } from '../js/moteur/recommandations.js';

const famille = nom => familleGpu(nom, base.materiel);

describe('materiel : famille de la carte graphique', () => {
    test('modèles NVIDIA reconnus, casse et espaces indifférents', () => {
        assert.equal(famille('RTX 5060 Ti').id, 'rtx-50');
        assert.equal(famille('geforce rtx4070 super').id, 'rtx-40');
        assert.equal(famille('RTX 3080').id, 'rtx-30');
        assert.equal(famille('RTX 2060').id, 'rtx-20');
        assert.equal(famille('GTX 1080 Ti').id, 'gtx');
    });

    test('AMD reconnu ; modèle inconnu ou vide : null', () => {
        assert.equal(famille('Radeon RX 7800 XT').id, 'amd-radeon');
        assert.equal(famille('Intel Arc A770'), null);
        assert.equal(famille(''), null);
        assert.equal(famille(undefined), null);
    });
});

describe('cadence : sous-multiples et verrou', () => {
    test('sous-multiples de 165 Hz jusqu\'à 24 FPS', () => {
        assert.deepEqual(sousMultiples(165).map(c => c.fps), [165, 82.5, 55, 41.25, 33, 27.5]);
        assert.deepEqual(sousMultiples(60).map(c => c.fps), [60, 30]);
    });

    test('verrou exact (55 à 165 Hz) : rien à signaler', () => {
        const c = analyserCadence({ frequenceHz: 165, verrouFps: 55 });
        assert.equal(c.verrouExact, true);
        assert.equal(c.verrouProblematique, false);
    });

    test('verrou inexact avec VRR : sans conséquence', () => {
        const c = analyserCadence({ frequenceHz: 165, vrr: true, verrouFps: 41 });
        assert.equal(c.verrouExact, false);
        assert.equal(c.verrouProblematique, false);
    });

    test('cible conseillée sans VRR : le plus haut sous-multiple réellement tenu', () => {
        assert.equal(analyserCadence({ frequenceHz: 165, fpsReels: 50 }).cibleConseillee.fps, 41.25);
        assert.equal(analyserCadence({ frequenceHz: 165, fpsReels: 60 }).cibleConseillee.fps, 55);
        assert.equal(analyserCadence({ frequenceHz: 144, fpsReels: 75 }).cibleConseillee.fps, 72);
        assert.equal(analyserCadence({ frequenceHz: 165, fpsReels: 20 }).cibleConseillee, null);
        // Avec VRR, pas de sous-multiple imposé
        assert.equal(analyserCadence({ frequenceHz: 165, vrr: true, fpsReels: 50 }).cibleConseillee, null);
    });

    test('FPS mesurés au niveau du verrou : capacité inconnue, pas de cible conseillée', () => {
        const c = analyserCadence({ frequenceHz: 165, verrouFps: 41, fpsReels: 41 });
        assert.equal(c.mesureBloqueeParVerrou, true);
        assert.equal(c.cibleConseillee, null);
        assert.equal(analyserCadence({ frequenceHz: 165, verrouFps: 41, fpsReels: 40.5 }).mesureBloqueeParVerrou, true);
        // Nettement sous le verrou : la machine n'atteint pas 41, la mesure vaut
        assert.equal(analyserCadence({ frequenceHz: 165, verrouFps: 41, fpsReels: 36 }).cibleConseillee.fps, 33);
        // Mesure au-dessus du verrou (verrou retiré pour mesurer) : cible proposée
        assert.equal(analyserCadence({ frequenceHz: 165, verrouFps: 41, fpsReels: 58 }).cibleConseillee.fps, 55);
    });

    test('fréquence absente : analyse impossible', () => {
        assert.equal(analyserCadence({ frequenceHz: undefined }).valide, false);
    });
});

describe('diagnostic du goulot', () => {
    test('mémoire vidéo à 90 % ou plus : goulot vram, prioritaire sur le libellé', () => {
        const d = diagnostiquer({ vramGo: 8 }, { vramUtiliseeGo: 7.6, limite: 'gpu' });
        assert.equal(d.goulot, 'vram');
        assert.equal(d.confiance, 'mesure');
    });

    test('libellé affiché : main thread → processeur, fil principal', () => {
        assert.deepEqual(diagnostiquer({}, { limite: 'main-thread' }), { goulot: 'cpu', fil: 'principal', confiance: 'mesure', tauxVram: null });
        assert.equal(diagnostiquer({}, { limite: 'rendu' }).fil, 'rendu');
        assert.equal(diagnostiquer({}, { limite: 'gpu' }).goulot, 'gpu');
    });

    test('sans libellé, le fil le plus lent l\'emporte', () => {
        assert.equal(diagnostiquer({}, { msPrincipal: 22, msGpu: 14 }).goulot, 'cpu');
        assert.equal(diagnostiquer({}, { msPrincipal: 12, msGpu: 19 }).goulot, 'gpu');
        // Un seul temps ne permet pas de comparer
        assert.equal(diagnostiquer({}, { msGpu: 19 }).goulot, 'indetermine');
    });

    test('sans mesure : symptômes, et égalité = indéterminé', () => {
        const d = diagnostiquer({}, {}, ['chute-nuages'], base.symptomes);
        assert.deepEqual([d.goulot, d.confiance], ['gpu', 'symptomes']);
        // chute-villes (cpu, vram) + chute-nuages (gpu) : cpu 1, vram 1, gpu 1 → égalité
        assert.equal(diagnostiquer({}, {}, ['chute-villes', 'chute-nuages'], base.symptomes).goulot, 'indetermine');
        assert.deepEqual(diagnostiquer(), { goulot: 'indetermine', fil: null, confiance: 'aucune', tauxVram: null });
    });
});

describe('génération d\'images', () => {
    const evaluer = (gpu, fpsReels, profil = { simulateur: '2024' }, goulot = 'cpu') =>
        evaluerGeneration({ profil, famille: famille(gpu), fpsReels, goulot });

    test('indisponible avant les RTX 40, inconnue si la carte n\'est pas reconnue', () => {
        assert.equal(evaluer('RTX 3080', 60).avis, 'indisponible');
        assert.equal(evaluer('Carte mystère', 60).avis, 'gpu-inconnu');
    });

    test('seuil d\'environ 40 FPS réels', () => {
        assert.equal(evaluer('RTX 4070', 30).avis, 'deconseillee');
        assert.equal(evaluer('RTX 4070', 36).avis, 'juste-sous-seuil');
        assert.equal(evaluer('RTX 4070', 40).avis, 'possible');
        assert.equal(evaluer('RTX 4070', null).avis, 'mesure-requise');
    });

    test('mémoire vidéo saturée : déconseillée', () => {
        assert.equal(evaluer('RTX 4070', 60, { simulateur: '2024' }, 'vram').avis, 'deconseillee-vram');
    });

    test('multi-génération : RTX 50 dans MSFS 2024 seulement', () => {
        assert.equal(evaluer('RTX 5060 Ti', 50).multiDisponible, true);
        assert.equal(evaluer('RTX 4090', 50).multiDisponible, false);
        assert.equal(evaluer('RTX 5060 Ti', 50, { simulateur: '2020', directx: 'dx12' }).multiDisponible, false);
    });

    test('MSFS 2020 en DX11 : indisponible (prérequis DX12 à vérifier)', () => {
        assert.equal(evaluer('RTX 4070', 60, { simulateur: '2020', directx: 'dx11' }).avis, 'dx11');
    });
});

describe('tableau des réglages', () => {
    test('seulement les réglages du simulateur choisi (et communs)', () => {
        const ids = tableauReglages(base.parametres, '2024', 'cpu').map(l => l.id);
        assert.ok(ids.includes('tlod-2024') && ids.includes('nuages-volumetriques'));
        assert.ok(!ids.some(id => id.endsWith('-2020')));
    });

    test('goulot processeur : le niveau de détail du terrain en tête ; carte graphique : l\'échelle de rendu', () => {
        assert.equal(tableauReglages(base.parametres, '2024', 'cpu')[0].id, 'tlod-2024');
        assert.equal(tableauReglages(base.parametres, '2024', 'gpu')[0].id, 'echelle-rendu-2024');
        assert.equal(tableauReglages(base.parametres, '2024', 'vram')[0].id, 'tlod-2024');
    });

    test('valeur de départ propre au goulot, textes bilingues', () => {
        const ligne = tableauReglages(base.parametres, '2024', 'cpu').find(l => l.id === 'echelle-rendu-2024');
        assert.match(ligne.depart.fr, /Inutile/);
        assert.ok(ligne.depart.en.length > 0);
    });

    test('une entrée obsolète disparaît du tableau', () => {
        const parametres = base.parametres.map(p => (p.id === 'tlod-2024' ? { ...p, statut: 'obsolete' } : p));
        assert.ok(!tableauReglages(parametres, '2024', 'cpu').some(l => l.id === 'tlod-2024'));
    });
});
