// Lecture des captures PresentMon : colonnes des versions 1 et 2, filtres, calculs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireCapture } from '../js/moteur/presentmon.js';

// Capture synthétique : n images de même durée, avec un temps GPU donné
function capture({ entetes = 'Application,ProcessID,MsBetweenPresents,MsCPUBusy,MsGPUBusy', lignes }) {
    return [entetes, ...lignes].join('\r\n');
}
const repete = (n, ligne) => Array.from({ length: n }, () => ligne);

test('PresentMon 2, carte graphique occupée presque tout le temps : goulot GPU', () => {
    const r = lireCapture(capture({ lignes: repete(100, 'FlightSimulator2024.exe,1234,20,12,19.5') }));
    assert.equal(r.erreur, null);
    assert.equal(r.application, 'FlightSimulator2024.exe');
    assert.equal(r.fpsMoyen, 50);
    assert.equal(r.dureeSecondes, 2);
    assert.equal(r.partGpu, 0.98);
    assert.equal(r.goulotEstime, 'gpu');
});

test('carte graphique qui attend : goulot processeur', () => {
    const r = lireCapture(capture({ lignes: repete(50, 'FlightSimulator.exe,1,25,24,11') }));
    assert.equal(r.goulotEstime, 'cpu');
    assert.equal(r.partGpu, 0.44);
});

test('entre les deux seuils, ou sans colonne GPU : indéterminé', () => {
    assert.equal(lireCapture(capture({ lignes: repete(10, 'X,1,20,15,17') })).goulotEstime, 'indetermine');
    const sansGpu = lireCapture(capture({ entetes: 'Application,MsBetweenPresents', lignes: repete(10, 'X,20') }));
    assert.equal(sansGpu.partGpu, null);
    assert.equal(sansGpu.goulotEstime, 'indetermine');
});

test('noms de colonnes de PresentMon 1 (msGPUActive), casse indifférente', () => {
    const r = lireCapture(capture({ entetes: 'Application,ProcessID,msBetweenPresents,msGPUActive', lignes: repete(10, 'X,1,20,19') }));
    assert.equal(r.goulotEstime, 'gpu');
});

test('1 % bas : les images les plus lentes', () => {
    // 99 images à 20 ms (50 FPS) et 1 image à 50 ms (20 FPS)
    const r = lireCapture(capture({ lignes: [...repete(99, 'X,1,20,10,19'), 'X,1,50,10,19'] }));
    assert.equal(r.unPourcentBas, 50);
    // 98 images à 20 ms et 2 à 50 ms : le 99e centile tombe sur une image lente
    const r2 = lireCapture(capture({ lignes: [...repete(98, 'X,1,20,10,19'), 'X,1,50,10,19', 'X,1,50,10,19'] }));
    assert.equal(r2.unPourcentBas, 20);
});

test('plusieurs programmes capturés : celui qui a le plus d\'images', () => {
    const r = lireCapture(capture({ lignes: [...repete(5, 'Discord.exe,9,16,1,1'), ...repete(20, 'FlightSimulator2024.exe,1,25,10,24')] }));
    assert.equal(r.application, 'FlightSimulator2024.exe');
    assert.equal(r.images, 20);
});

test('images générées (FrameType) exclues du calcul', () => {
    const r = lireCapture(capture({
        entetes: 'Application,MsBetweenPresents,MsGPUBusy,FrameType',
        lignes: [...repete(10, 'X,25,24,Application'), ...repete(10, 'X,1,0.5,AMD_AFMF')]
    }));
    assert.equal(r.images, 10);
    assert.equal(r.imagesGenerees, 10);
    assert.equal(r.fpsMoyen, 40);
});

test('fichier vide ou sans colonne de durée d\'image : erreur', () => {
    assert.equal(lireCapture('').erreur, 'vide');
    assert.equal(lireCapture('a,b\n1,2').erreur, 'colonnes');
    // Marque UTF-8 et guillemets acceptés
    assert.equal(lireCapture('﻿"Application","MsBetweenPresents"\n"X","20"').fpsMoyen, 50);
});

// ── Captures réelles d'Intel (tests/captures, licence MIT) ──────────────────────────────
import { readFileSync } from 'node:fs';
const reelle = nom => lireCapture(readFileSync(new URL(`./captures/intel-${nom}.csv`, import.meta.url), 'utf8'));

test('captures réelles : le compositeur de Windows (dwm.exe) est écarté au profit du programme testé', () => {
    assert.equal(reelle('test_case_1').application, 'Presenter.exe');
    assert.equal(reelle('test_case_4').application, 'Presenter.exe');
});

test('captures réelles : les trois formats de colonnes (actuel, v1, v2) donnent les mêmes résultats', () => {
    const [actuel, v1, v2] = ['test_case_1', 'test_case_1_v1', 'test_case_1_v2'].map(reelle);
    for (const r of [actuel, v1, v2]) {
        assert.equal(r.erreur, null);
        assert.equal(r.application, 'Presenter.exe');
    }
    // Petits écarts normaux : la v2 mesure la durée d'image depuis le début du travail du processeur,
    // pas entre deux affichages (104,5 / 105,3 / 105,9 FPS sur ces 7 images) : tolérance de 2 %
    for (const r of [v1, v2]) assert.ok(Math.abs(r.fpsMoyen - actuel.fpsMoyen) / actuel.fpsMoyen < 0.02);
    assert.equal(v2.goulotEstime, actuel.goulotEstime);
});

test('synchronisation verticale (SyncInterval) : la carte graphique attend l\'écran, pas le processeur', () => {
    const synchro = lireCapture(capture({
        entetes: 'Application,SyncInterval,MsBetweenPresents,MsGPUBusy',
        lignes: repete(20, 'FlightSimulator2024.exe,1,16.7,4')
    }));
    assert.equal(synchro.synchro, true);
    assert.equal(synchro.goulotEstime, 'plafonne');
    // Même synchronisée, une carte occupée tout le temps reste le goulot
    assert.equal(lireCapture(capture({
        entetes: 'Application,SyncInterval,MsBetweenPresents,MsGPUBusy',
        lignes: repete(20, 'X,1,33.3,32')
    })).goulotEstime, 'gpu');
});

test('le simulateur est préféré, même s\'il a moins d\'images qu\'un autre programme', () => {
    const r = lireCapture(capture({ lignes: [...repete(50, 'Discord.exe,9,16,1,1'), ...repete(20, 'FlightSimulator2024.exe,1,25,10,24')] }));
    assert.equal(r.application, 'FlightSimulator2024.exe');
});
