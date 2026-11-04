// Journal avant/après : entrées, comparaison, exports et import.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecComparaisons, champsInvalides, comparer, creerEntree, fusionner, lireJson, versCsv, versJson } from '../js/moteur/journal.js';

const SCENARIO = { simulateur: '2024', aeroport: 'LFPG', avion: 'A320', meteo: 'Ciel clair', heure: '12:00', duree: '2 min' };
const essai = (champs, jour = 1) => creerEntree({ ...SCENARIO, ...champs }, new Date(Date.UTC(2026, 10, jour, 10)));

const reference = essai({ fpsMoyen: '40', unPourcentBas: '30' }, 1);
const tlodBaisse = essai({ reglage: 'tlod-2024', avant: '200', apres: '100', fpsMoyen: '46', unPourcentBas: '35', ressenti: '4' }, 2);

test('création : nombres lus (virgule acceptée), réglage vide = mesure de référence', () => {
    const e = essai({ fpsMoyen: '41,5' });
    assert.equal(e.fpsMoyen, 41.5);
    assert.equal(e.reglage.id, '');
    assert.equal(e.date, '2026-11-01T10:00:00.000Z');
    assert.equal(e.scenario.aeroport, 'LFPG');
});

test('champs invalides : FPS obligatoires, avant/après si un réglage est indiqué, ressenti de 1 à 5', () => {
    assert.deepEqual(champsInvalides(reference), []);
    assert.deepEqual(champsInvalides(essai({})), ['fpsMoyen']);
    assert.deepEqual(champsInvalides(essai({ fpsMoyen: 40, reglage: 'tlod-2024' })), ['avantApres']);
    assert.deepEqual(champsInvalides(essai({ fpsMoyen: 40, ressenti: 7 })), ['ressenti']);
    assert.deepEqual(champsInvalides(essai({ fpsMoyen: 40, simulateur: '' })), ['simulateur']);
});

test('comparaison avec l\'essai précédent : écarts en FPS et en pourcentage', () => {
    const c = comparer(tlodBaisse, reference);
    assert.equal(c.ecartFps, 6);
    assert.equal(c.ecartPourcent, 15);
    assert.equal(c.ecartUnPourcent, 5);
    assert.deepEqual(c.avertissements, []);
});

test('premier essai, référence sans changement', () => {
    assert.deepEqual(comparer(reference, null).avertissements, ['premier', 'sans-changement']);
});

test('scénario différent ou génération d\'images différente : comparaison signalée comme douteuse', () => {
    const ailleurs = essai({ fpsMoyen: 50, aeroport: 'EGLL' }, 3);
    const c = comparer(ailleurs, reference);
    assert.ok(c.avertissements.includes('scenario-different'));
    assert.deepEqual(c.champsDifferents, ['aeroport']);
    // La casse n'est pas une différence de scénario
    assert.deepEqual(comparer(essai({ fpsMoyen: 40, aeroport: 'lfpg' }, 3), reference).avertissements, ['sans-changement']);
    assert.ok(comparer(essai({ fpsMoyen: 80, generationActive: true }, 3), reference).avertissements.includes('generation-differente'));
});

test('comparaisons par simulateur, dans l\'ordre chronologique quel que soit l\'ordre reçu', () => {
    const autreSim = essai({ fpsMoyen: 60, simulateur: '2020' }, 3);
    const liste = avecComparaisons([tlodBaisse, autreSim, reference]);
    assert.deepEqual(liste.map(l => l.entree), [reference, tlodBaisse, autreSim]);
    assert.equal(liste[1].comparaison.ecartFps, 6);
    // Premier essai en 2020 : pas comparé à ceux de 2024
    assert.ok(liste[2].comparaison.avertissements.includes('premier'));
});

test('export JSON puis import : aller-retour sans perte, entrées invalides ignorées', () => {
    const json = versJson([reference, tlodBaisse], new Date(Date.UTC(2026, 10, 4)));
    assert.deepEqual(lireJson(json), { entrees: [reference, tlodBaisse], ignorees: 0, erreur: null });

    const abime = JSON.parse(json);
    abime.entrees.push({ id: 'x', date: '2026', scenario: {}, reglage: { id: '' }, fpsMoyen: null });
    assert.equal(lireJson(JSON.stringify(abime)).ignorees, 1);
    assert.equal(lireJson('pas du json').erreur, 'json');
    assert.equal(lireJson('{"format":"autre"}').erreur, 'format');
});

test('fusion : pas de doublon à la réimportation', () => {
    assert.equal(fusionner([reference, tlodBaisse], [tlodBaisse]).length, 2);
});

test('export CSV : en-têtes, séparateur, guillemets, comparaison', () => {
    const entetes = ['date', 'sim', 'aeroport', 'avion', 'meteo', 'heure', 'duree', 'reglage', 'avant', 'apres', 'fg', 'fps', '1%', 'ressenti', 'ecart', 'ecart%', 'alertes', 'notes'];
    const avecNote = { ...tlodBaisse, notes: 'Mieux; "net"' };
    const csv = versCsv([reference, avecNote], {
        entetes, libelle: id => (id === 'tlod-2024' ? 'Terrain LOD' : id),
        remarque: code => ({ premier: 'Premier essai.', 'sans-changement': 'Référence.' })[code]
    });
    const lignes = csv.split('\r\n');
    assert.match(lignes[1], /;Premier essai\. Référence\.;$/);
    assert.equal(lignes.length, 3);
    assert.equal(lignes[0], entetes.join(';'));
    assert.match(lignes[2], /;Terrain LOD;200;100;0;46;35;4;6;15;;"Mieux; ""net"""$/);
});
