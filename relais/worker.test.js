// Tests du relais « J'ai un retour » : validation et gestionnaire, avec des doublures du forum et du
// limiteur (aucun réseau). Lancer depuis la racine du dépôt : node --test relais/worker.test.js (Node 22 ou plus)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import w, { lireRetour } from './worker.js';

const env = (forums, limite = true) => ({ ALLOWED_ORIGINS: 'https://aeronautique.xyz', RETOUR_LIMITER: { limit: async () => ({ success: limite }) }, ...forums });
const req = (corps, origine = 'https://aeronautique.xyz') => new Request('https://aeronautique.xyz/api/retour', { method: 'POST', headers: { Origin: origine }, body: typeof corps === 'string' ? corps : JSON.stringify(corps) });

// Retours types : SELCAL (avec code) et Atelier réglages (avec simulateur et étape)
const s = { app: 'selcal', type: 'bug', message: ' Le son grésille ', pseudo: ' A   B ', contact: 'x@y.z', lang: 'fr', code: 'ab-cd' };
const r = { app: 'reglages', type: 'question', message: 'Diagnostic indéterminé', lang: 'en', simulateur: '2024', etape: 'diagnostic' };

test('SELCAL et horloge : validation des champs', () => {
    assert.deepEqual(lireRetour(s).retour, { type: 'Bug', message: 'Le son grésille', pseudo: 'A B', contact: 'x@y.z', lang: 'fr', code: 'AB-CD' });
    assert.equal(lireRetour({ ...s, app: 'horlogeUtc' }).retour.code, undefined);
    for (const mauvais of [{ app: 'phraseo' }, { type: 'Bug' }, { message: '' }, { message: 'x'.repeat(1801) }, { pseudo: 'x'.repeat(41) }, { contact: 'x'.repeat(121) }, { lang: 'de' }, { code: 'ABCD' }, { app: 'constructor' }])
      assert.equal(lireRetour({ ...s, ...mauvais }), null, JSON.stringify(mauvais));

});

test('Atelier réglages : simulateur et étape facultatifs, valeurs connues seulement', () => {
    assert.deepEqual(lireRetour(r).retour, { type: 'Question', message: 'Diagnostic indéterminé', pseudo: '', contact: '', lang: 'en', simulateur: '2024', etape: 'diagnostic' });
    assert.equal(lireRetour({ ...r, simulateur: undefined, etape: undefined }).retour.etape, '');
    assert.equal(lireRetour({ ...r, etape: 'ailleurs' }), null);
    assert.equal(lireRetour({ ...r, simulateur: '2004' }), null);
    // Les champs de l'atelier ne passent pas pour le SELCAL
    assert.equal(lireRetour({ ...r, app: 'selcal', code: '' }).retour.etape, undefined);

});

test('gestionnaire : origine, débit, JSON, forum', async () => {
    let recu = null;
    const forums = { FORUM_REGLAGES: { submit: async x => { recu = x; return { ok: true, topicId: 2 }; } }, FORUM_SELCAL: { submit: async () => ({ ok: false, reason: 'disabled' }) } };
    assert.equal((await w.fetch(req(r), env(forums))).status, 204); assert.equal(recu.etape, 'diagnostic');
    assert.equal((await w.fetch(req(r, 'https://evil.example'), env(forums))).status, 403);
    assert.equal((await w.fetch(req(r), env(forums, false))).status, 429);
    assert.equal((await w.fetch(req('{'), env(forums))).status, 400);
    assert.equal((await w.fetch(req(s), env(forums))).status, 502);
});
