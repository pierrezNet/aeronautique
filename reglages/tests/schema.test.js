// La base de connaissances respecte le schéma (outils/schema.js) : champs obligatoires,
// textes FR et EN, sources, statuts, identifiants uniques. Un oubli fait échouer « npm test ».

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifierIdentifiants, verifierParametre, verifierRegle, verifierSymptome } from '../outils/schema.js';

const lire = nom => JSON.parse(readFileSync(new URL(`../donnees/${nom}`, import.meta.url), 'utf8'));

test('parametres.json respecte le schéma', () => {
    const { parametres } = lire('parametres.json');
    assert.ok(parametres.length > 0, 'au moins un paramètre');
    const erreurs = [
        ...parametres.flatMap((p, i) => verifierParametre(p, `parametres[${i}] ${p.id}`)),
        ...verifierIdentifiants(parametres, 'parametres.json')
    ];
    assert.deepEqual(erreurs, []);
});

test('regles.json respecte le schéma', () => {
    const { regles } = lire('regles.json');
    const erreurs = [
        ...regles.flatMap((r, i) => verifierRegle(r, `regles[${i}] ${r.id}`)),
        ...verifierIdentifiants(regles, 'regles.json')
    ];
    assert.deepEqual(erreurs, []);
});

test('le contrôle détecte un statut « verifie » sans source sérieuse', () => {
    const regle = {
        id: 'essai', simulateur: '2024', miseAJourMin: 'SU1', statut: 'verifie', remplacePar: null,
        dateVerification: '2026-11-04', type: 'cadence', gravite: 'info',
        message: { fr: 'x', en: 'x' },
        sources: [{ titre: 'Forum', url: 'https://exemple.org', consulte: '2026-11-04', rang: 4 }]
    };
    assert.match(verifierRegle(regle, 'essai').join('\n'), /sans source de rang 1 à 3/);
});

test('le contrôle détecte un texte anglais manquant', () => {
    const regle = {
        id: 'essai', simulateur: '2024', miseAJourMin: 'SU1', statut: 'a-verifier', remplacePar: null,
        dateVerification: '2026-11-04', type: 'cadence', gravite: 'info',
        message: { fr: 'seulement en français' }, sources: []
    };
    assert.match(verifierRegle(regle, 'essai').join('\n'), /message\.en/);
});

test('materiel.json : chaque famille de GPU a ses capacités et une source', () => {
    const { familles } = lire('materiel.json');
    for (const f of familles) {
        assert.equal(typeof f.motif, 'string', `${f.id} : motif`);
        for (const capacite of ['dlssSR', 'generationImages', 'multiGeneration']) {
            assert.equal(typeof f[capacite], 'boolean', `${f.id}.${capacite}`);
        }
        assert.ok(f.sources.length > 0, `${f.id} : au moins une source`);
    }
});

test('symptomes.json : textes, pistes vers des goulots et des paramètres existants', () => {
    const ids = new Set(lire('parametres.json').parametres.map(p => p.id));
    const { symptomes } = lire('symptomes.json');
    const erreurs = symptomes.flatMap((s, i) => verifierSymptome(s, `symptomes[${i}] ${s.id}`, ids));
    assert.deepEqual(erreurs, []);
});
