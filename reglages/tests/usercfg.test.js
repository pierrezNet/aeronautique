// Lecture de UserCfg.opt sur deux fichiers réels (tests/usercfg, licence MIT) et cas limites.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base } from './base.js';
import { analyserTexte, lireUserCfg } from '../js/moteur/usercfg.js';

const correspondances = JSON.parse(readFileSync(new URL('../donnees/usercfg.json', import.meta.url), 'utf8')).correspondances;
const fichier = nom => readFileSync(new URL(`./usercfg/${nom}`, import.meta.url), 'utf8');
const lireFichier = nom => lireUserCfg(fichier(nom), correspondances, base.parametres);

test('analyse du format : sections imbriquées, guillemets retirés', () => {
    const arbre = analyserTexte('Version 66\n{Video\n\tAdapter "RTX 4070"\n}\n{Graphics\n\t{Terrain\n\t\tLoDFactor 2.650000\n\t}\n}');
    assert.equal(arbre.Video.Adapter, 'RTX 4070');
    assert.equal(arbre.Graphics.Terrain.LoDFactor, '2.650000');
});

test('MSFS 2024 (préréglage High) : simulateur, carte, définition et réglages', () => {
    const r = lireFichier('msfs2024-rigready.opt');
    assert.equal(r.erreur, null);
    assert.equal(r.simulateur, '2024');
    assert.equal(r.carte, 'NVIDIA GeForce RTX 5080');
    assert.equal(r.resolution, '5120×1440');
    const v = id => r.valeurs[id];
    assert.equal(v('tlod-2024').valeur, 100);
    assert.equal(v('olod-2024').valeur, 100);
    assert.equal(v('echelle-rendu-2024').valeur, 100);
    assert.equal(v('anticrenelage-2024').valeur, 'DLSS (AUTO)');
    assert.equal(v('generation-images-2024').libelle, 'desactive');
    // Préréglage High : textures (échelle inversée) et nuages tous deux « haut »
    assert.equal(v('resolution-textures').libelle, 'haut');
    assert.equal(v('nuages-volumetriques').libelle, 'haut');
    assert.equal(v('trafic-2024').libelle, 'haut');
    assert.equal(v('ecrans-cockpit').libelle, 'moyen');
    assert.equal(v('vsync-2024').libelle, 'active');
    assert.equal(v('ombres-terrain').valeur, 512);
    // Rien des réglages propres à 2020
    assert.ok(!Object.keys(r.valeurs).some(id => id.endsWith('-2020')));
});

test('la section GraphicsVR (réalité virtuelle) n\'est pas lue à la place de Graphics', () => {
    // Le fichier 2024 a un TLOD de 0.5 (50) en réalité virtuelle et de 1.0 (100) à l'écran
    assert.equal(lireFichier('msfs2024-rigready.opt').valeurs['tlod-2024'].valeur, 100);
});

test('MSFS 2020 : simulateur, DirectX 12, génération d\'images désactivée', () => {
    const r = lireFichier('msfs2020-usercfg-opt-parser.opt');
    assert.equal(r.simulateur, '2020');
    assert.equal(r.carte, 'NVIDIA GeForce RTX 3070');
    assert.equal(r.resolution, '3440×1440');
    assert.equal(r.valeurs['tlod-2020'].valeur, 100);
    assert.equal(r.valeurs['directx-2020'].libelle, 'dx12');
    assert.equal(r.valeurs['generation-images-2020'].libelle, 'desactive');
    assert.equal(r.valeurs['anticrenelage-2020'].valeur, 'DLSS (BALANCED)');
    assert.equal(r.valeurs['resolution-textures'].libelle, 'haut');
    assert.ok(!Object.keys(r.valeurs).some(id => id.endsWith('-2024')));
});

test('réglage désactivé par sa clé Enabled', () => {
    const r = lireUserCfg('{Graphics\nVersion 2.1.0\n{VolumetricClouds\nEnabled 0\nQuality 3\n}\n}', correspondances, base.parametres);
    assert.equal(r.valeurs['nuages-volumetriques'].libelle, 'desactive');
});

test('LoDFactor non entier : 2.65 → 265', () => {
    const r = lireUserCfg('{Video\nFrameGeneration NONE\n}\n{Graphics\nVersion 2.1.0\n{Terrain\nLoDFactor 2.650000\n}\n}', correspondances, base.parametres);
    assert.equal(r.valeurs['tlod-2024'].valeur, 265);
});

test('fichier qui n\'est pas un UserCfg.opt : erreur', () => {
    assert.equal(lireUserCfg('Bonjour', correspondances, base.parametres).erreur, 'format');
    assert.equal(lireUserCfg('', correspondances, base.parametres).erreur, 'format');
});

test('chaque correspondance vise au moins un réglage existant', () => {
    const ids = base.parametres.map(p => p.id);
    for (const c of correspondances) {
        assert.ok(ids.some(id => id === c.parametre || id.startsWith(c.parametre + '-')), c.id);
    }
});
