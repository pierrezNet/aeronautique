// Réalité virtuelle : cadence du casque, règles, réglages, challenge, import de UserCfg.opt et prompt.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base } from './base.js';
import { analyser } from '../js/moteur/analyser.js';
import { analyserCadenceVr } from '../js/moteur/cadenceVr.js';
import { lireUserCfg, valeursPourAffichage } from '../js/moteur/usercfg.js';
import { construirePrompt } from '../js/moteur/prompt.js';

const ids = resultat => resultat.messages.map(m => m.id);

// Quest 3 à 90 Hz sur Meta Link, reprojection automatique, RTX 4070
const enVr = (mesures = {}, profil = {}, autres = {}) => analyser({
    profil: { simulateur: '2024', gpu: 'RTX 4070', affichage: 'vr', casque: 'Quest 3', frequenceCasqueHz: 90, runtime: 'meta', reprojection: 'auto', ...profil },
    mesures,
    ...autres
}, base);

describe('cadence dans un casque', () => {
    test('deux cibles seulement : pleine fréquence et moitié avec reprojection', () => {
        const c = analyserCadenceVr({ frequenceHz: 90 });
        assert.deepEqual(c.cibles.map(x => [x.fps, x.reprojection]), [[90, false], [45, true]]);
        assert.equal(c.cibleConseillee, null);
        assert.equal(c.pleineTenue, null);
    });

    test('pleine fréquence tenue (à 1 FPS près)', () => {
        const c = analyserCadenceVr({ frequenceHz: 90, reprojection: 'auto', fpsReels: 89.4 });
        assert.equal(c.pleineTenue, true);
        assert.equal(c.cibleConseillee.fps, 90);
        assert.equal(c.entreLesDeux, false);
    });

    test('60 FPS pour 90 Hz : entre les deux, la moitié est conseillée', () => {
        const c = analyserCadenceVr({ frequenceHz: 90, reprojection: 'auto', fpsReels: 60 });
        assert.equal(c.entreLesDeux, true);
        assert.equal(c.cibleConseillee.fps, 45);
    });

    test('moitié non tenue : fréquence de casque plus basse dont la moitié l\'est', () => {
        assert.equal(analyserCadenceVr({ frequenceHz: 90, fpsReels: 40 }).frequencePlusBasse, 80);
        assert.equal(analyserCadenceVr({ frequenceHz: 120, fpsReels: 46 }).frequencePlusBasse, 90);
        // Même 72 Hz (36) hors de portée : il faut alléger
        const c = analyserCadenceVr({ frequenceHz: 90, fpsReels: 30 });
        assert.equal(c.demiTenue, false);
        assert.equal(c.frequencePlusBasse, null);
    });

    test('reprojection forcée et FPS à la moitié : mesure plafonnée, pleine fréquence inconnue', () => {
        const c = analyserCadenceVr({ frequenceHz: 90, reprojection: 'forcee', fpsReels: 45 });
        assert.equal(c.mesurePlafonnee, true);
        assert.equal(c.pleineTenue, null);
        assert.equal(c.cibleConseillee.fps, 45);
    });

    test('sans fréquence : invalide', () => {
        assert.equal(analyserCadenceVr({ frequenceHz: null }).valide, false);
    });
});

describe('règles en VR', () => {
    test('toujours : réglages VR distincts de ceux de l\'écran', () => {
        assert.ok(ids(enVr()).includes('vr-profil-separe'));
        assert.ok(!ids(analyser({ profil: { simulateur: '2024', frequenceHz: 144 } }, base)).includes('vr-profil-separe'));
    });

    test('Windows Mixed Reality : fin de vie signalée', () => {
        assert.ok(ids(enVr({}, { runtime: 'wmr' })).includes('vr-wmr-fin-de-vie'));
        assert.ok(!ids(enVr()).includes('vr-wmr-fin-de-vie'));
    });

    test('pleine fréquence non tenue : reprojection expliquée ; entre les deux : moitié stable', () => {
        const r = enVr({ fpsReels: 60 });
        assert.ok(ids(r).includes('vr-reprojection-moitie'));
        assert.ok(ids(r).includes('vr-entre-les-deux'));
        assert.ok(!ids(enVr({ fpsReels: 90 })).includes('vr-reprojection-moitie'));
    });

    test('reprojection désactivée sans tenir la pleine fréquence : saccades signalées', () => {
        assert.ok(ids(enVr({ fpsReels: 60 }, { reprojection: 'desactivee' })).includes('vr-reprojection-desactivee'));
        assert.ok(!ids(enVr({ fpsReels: 90 }, { reprojection: 'desactivee' })).includes('vr-reprojection-desactivee'));
    });

    test('reprojection forcée : mesure plafonnée expliquée', () => {
        assert.ok(ids(enVr({ fpsReels: 45 }, { reprojection: 'forcee' })).includes('vr-mesure-plafonnee'));
    });

    test('processeur limitant en 2024 : le rendu fovéal ne l\'aidera pas', () => {
        assert.ok(ids(enVr({ limite: 'main-thread' })).includes('vr-foveal-pas-le-processeur'));
        assert.ok(!ids(enVr({ limite: 'gpu' })).includes('vr-foveal-pas-le-processeur'));
        // Pas de rendu fovéal natif dans MSFS 2020
        assert.ok(!ids(enVr({ limite: 'main-thread' }, { simulateur: '2020', directx: 'dx12' })).includes('vr-foveal-pas-le-processeur'));
    });

    test('génération d\'images : pas de seuil écran, avis « à vérifier »', () => {
        const r = enVr({ fpsReels: 36, limite: 'gpu' });
        assert.equal(r.generation.avis, 'vr-a-verifier');
        assert.ok(ids(r).includes('vr-generation-a-verifier'));
        assert.ok(!ids(r).includes('generation-juste-sous-seuil'));
    });

    test('les règles de cadence de l\'écran ne s\'appliquent pas', () => {
        const r = enVr({ verrouFps: 41, synchroAffichee: 'vsync', fpsReels: 60 }, { frequenceHz: 165, vrr: false });
        for (const id of ['cadence-sous-multiple', 'cadence-vrr', 'cadence-vsync-affichee']) assert.ok(!ids(r).includes(id), id);
        assert.equal(r.cadence.vr, true);
        assert.equal(r.cadence.frequenceHz, 90);
    });
});

describe('réglages et challenge en VR', () => {
    const idsTableau = r => r.tableau.map(l => l.id);

    test('tableau : réglages VR présents, réglages propres à l\'écran absents', () => {
        const t = idsTableau(enVr());
        for (const id of ['reprojection-vr', 'rendu-foveal-2024', 'generation-images-vr', 'tlod-2024']) assert.ok(t.includes(id), id);
        for (const id of ['vsync-2024', 'generation-images-2024']) assert.ok(!t.includes(id), id);
        // Rendu fovéal : 2024 seulement
        assert.ok(!idsTableau(enVr({}, { simulateur: '2020', directx: 'dx12' })).includes('rendu-foveal-2024'));
    });

    test('à l\'écran, aucun réglage propre à la VR', () => {
        const t = idsTableau(analyser({ profil: { simulateur: '2024', frequenceHz: 144 } }, base));
        assert.ok(t.includes('vsync-2024'));
        assert.ok(!t.some(id => base.parametres.find(p => p.id === id).affichage === 'vr'));
    });

    test('questions VR posées dans le casque seulement', () => {
        const quiz = r => r.quiz.map(c => c.id);
        assert.ok(quiz(enVr({ limite: 'gpu' })).includes('vr-reprojection-90-60'));
        assert.ok(quiz(enVr({ limite: 'main-thread' })).includes('vr-foveal-goulot-cpu'));
        const ecran = analyser({ profil: { simulateur: '2024', frequenceHz: 144 }, mesures: { limite: 'main-thread' } }, base);
        assert.ok(!quiz(ecran).some(id => id.startsWith('vr-')));
    });

    test('génération d\'images activée en VR avec un goulot processeur : la question existante s\'applique', () => {
        const r = enVr({ limite: 'main-thread' }, {}, { changements: [{ id: 'generation-images-vr', sens: 'hausse' }] });
        assert.ok(r.challenge.some(q => q.challenge.id === 'generation-activee-goulot-cpu'));
    });
});

describe('UserCfg.opt : réglages VR', () => {
    const correspondances = JSON.parse(readFileSync(new URL('../donnees/usercfg.json', import.meta.url), 'utf8')).correspondances;
    const lireFichier = nom => lireUserCfg(readFileSync(new URL(`./usercfg/${nom}`, import.meta.url), 'utf8'), correspondances, base.parametres);

    test('MSFS 2024 : section GraphicsVR et clés …VR lues à part', () => {
        const r = lireFichier('msfs2024-rigready.opt');
        const vr = r.valeursVr;
        assert.equal(vr['tlod-2024'].valeur, 50);
        assert.equal(vr['olod-2024'].valeur, 50);
        assert.equal(vr['echelle-rendu-2024'].valeur, 80);
        assert.equal(vr['anticrenelage-2024'].valeur, 'TAA');
        assert.equal(vr['rendu-foveal-2024'].libelle, 'desactive');
        assert.equal(vr['generation-images-vr'].libelle, 'desactive');
        assert.equal(vr['reprojection-vr'].valeur, '0');
        // L'écran garde ses propres valeurs, sans réglage propre à la VR
        assert.equal(r.valeurs['tlod-2024'].valeur, 100);
        assert.ok(!('rendu-foveal-2024' in r.valeurs));
        assert.ok(!('vsync-2024' in vr));
    });

    test('MSFS 2020 : génération d\'images VR (DLSSGVR) et DirectX', () => {
        const vr = lireFichier('msfs2020-usercfg-opt-parser.opt').valeursVr;
        assert.equal(vr['generation-images-vr'].libelle, 'desactive');
        assert.equal(vr['directx-2020'].libelle, 'dx12');
        assert.ok(!('rendu-foveal-2024' in vr));
    });

    test('import mémorisé avant la VR (sans valeursVr) : rien d\'affiché pour le casque', () => {
        const ancien = { simulateur: '2024', valeurs: { 'tlod-2024': { valeur: 100 } } };
        assert.deepEqual(valeursPourAffichage(ancien, 'vr'), {});
        assert.equal(valeursPourAffichage(ancien, 'moniteur')['tlod-2024'].valeur, 100);
    });
});

test('prompt IA : le casque à la place de l\'écran', () => {
    const saisie = {
        profil: { simulateur: '2024', gpu: 'RTX 4070', affichage: 'vr', casque: 'Quest 3', frequenceCasqueHz: 90, runtime: 'meta', reprojection: 'auto', frequenceHz: 165 },
        mesures: { fpsReels: 60 }, symptomes: [], changements: [], usercfg: null
    };
    const prompt = construirePrompt({ langue: 'fr', saisie, resultat: analyser(saisie, base), base });
    assert.match(prompt, /Casque : Quest 3/);
    assert.match(prompt, /Fréquence du casque \(Hz\) : 90/);
    assert.match(prompt, /Cibles VR .* : 90, 45/);
    assert.doesNotMatch(prompt, /Fréquence de l'écran/);
});
