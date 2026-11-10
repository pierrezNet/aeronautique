// Prompt et requêtes vers les IA (sans réseau : seules la préparation et la lecture sont testées).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { base } from './base.js';
import { analyser } from '../js/moteur/analyser.js';
import { construirePrompt } from '../js/moteur/prompt.js';
import { lireErreur, lireModeles, lireReponse, requeteMessage, requeteModeles } from '../js/ia.js';

const saisie = {
    profil: { simulateur: '2024', gpu: 'RTX 5060 Ti', vramGo: 16, frequenceHz: 165, vrr: false, vrrInconnu: false, affichage: 'moniteur', avion: 'A320neo' },
    mesures: { limite: 'main-thread', fpsReels: 47, verrouFps: 41, capture: null, vramUtiliseeGo: 6.869, vramTotaleGo: 14.926, synchroAffichee: 'novsync' },
    symptomes: ['chute-villes'],
    changements: [{ id: 'echelle-rendu-2024', sens: 'baisse' }],
    usercfg: { simulateur: '2024', valeurs: { 'tlod-2024': { valeur: 200, libelle: null }, 'nuages-volumetriques': { valeur: '3', libelle: 'ultra' } } }
};
const resultat = analyser(saisie, base);
const journal = [{ simulateur: '2024', reglage: { id: 'tlod-2024', avant: '200', apres: '100' }, fpsMoyen: 46, unPourcentBas: 35, generationActive: false, scenario: { aeroport: 'LFPG', meteo: 'Ciel clair' } }];

test('prompt : instructions, profil, réglages actuels, diagnostic, règles marquées « à vérifier », journal', () => {
    const p = construirePrompt({ langue: 'fr', saisie, resultat, base, journal, question: 'Pourquoi ça saccade ?' });
    assert.match(p, /Propose au plus trois changements/);
    assert.match(p, /- Carte graphique : RTX 5060 Ti/);
    assert.match(p, /- Niveau de détail du terrain \(Terrain LOD\) : 200/);
    assert.match(p, /- Nuages volumétriques : ultra/);
    assert.match(p, /- Goulot : cpu/);
    assert.match(p, /- Mémoire vidéo totale affichée \(Go\) : 14.926/);
    assert.match(p, /- Synchronisation verticale affichée : NoVSync/);
    assert.match(p, /\[à vérifier\]/);
    assert.match(p, /200 → 100 : 46 FPS, 1 % bas 35 \(LFPG, Ciel clair\)/);
    assert.match(p, /## Ma question\nPourquoi ça saccade \?/);
});

test('prompt en anglais ; sections vides omises ; UserCfg d\'un autre simulateur ignoré', () => {
    const p = construirePrompt({ langue: 'en', saisie: { ...saisie, symptomes: [], usercfg: { ...saisie.usercfg, simulateur: '2020' } }, resultat, base });
    assert.match(p, /Answer in English/);
    assert.doesNotMatch(p, /## Symptoms/);
    assert.doesNotMatch(p, /Current settings/);
    assert.match(p, /- Graphics card : RTX 5060 Ti/);
    assert.doesNotMatch(p, /Carte graphique|Fréquence/);
});

test('Claude : en-têtes navigateur, repli côté serveur pour Opus 5 seulement', () => {
    const { url, options } = requeteMessage('anthropic', 'sk-ant-xxx', 'claude-opus-5', 'Bonjour');
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(options.headers['anthropic-dangerous-direct-browser-access'], 'true');
    assert.equal(options.headers['x-api-key'], 'sk-ant-xxx');
    assert.equal(options.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
    const corps = JSON.parse(options.body);
    assert.equal(corps.fallbacks, 'default');
    assert.deepEqual(corps.messages, [{ role: 'user', content: 'Bonjour' }]);
    const autre = requeteMessage('anthropic', 'k', 'claude-haiku-4-5', 'x');
    assert.equal(autre.options.headers['anthropic-beta'], undefined);
    assert.equal(JSON.parse(autre.options.body).fallbacks, undefined);
});

test('OpenAI et Gemini : adresses et authentification', () => {
    const o = requeteMessage('openai', 'sk-x', 'gpt-test', 'Bonjour');
    assert.equal(o.options.headers.authorization, 'Bearer sk-x');
    const g = requeteMessage('gemini', 'AIza', 'gemini-test', 'Bonjour');
    assert.equal(g.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    assert.equal(g.options.headers['x-goog-api-key'], 'AIza');
    // Nom de modèle qui pourrait détourner l'adresse : refusé
    assert.throws(() => requeteMessage('gemini', 'k', '../autre?x=1', 'x'));
});

test('lecture des réponses, refus compris', () => {
    assert.deepEqual(lireReponse('anthropic', { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'A' }, { type: 'text', text: 'B' }] }), { texte: 'A\n\nB', refus: false });
    assert.deepEqual(lireReponse('anthropic', { stop_reason: 'refusal', content: [] }), { texte: '', refus: true });
    assert.equal(lireReponse('openai', { choices: [{ message: { content: 'Salut' } }] }).texte, 'Salut');
    assert.equal(lireReponse('openai', { choices: [{ message: { content: null, refusal: 'non' } }] }).refus, true);
    assert.equal(lireReponse('gemini', { candidates: [{ content: { parts: [{ text: 'Bon' }, { text: 'jour' }] } }] }).texte, 'Bonjour');
    assert.equal(lireReponse('gemini', { promptFeedback: { blockReason: 'SAFETY' } }).refus, true);
});

test('listes de modèles : modèles de discussion seulement', () => {
    assert.deepEqual(lireModeles('anthropic', { data: [{ id: 'claude-b' }, { id: 'claude-a' }] }), ['claude-a', 'claude-b']);
    assert.deepEqual(lireModeles('openai', { data: [{ id: 'gpt-x' }, { id: 'text-embedding-3' }, { id: 'gpt-x-audio' }, { id: 'dall-e' }] }), ['gpt-x']);
    assert.deepEqual(lireModeles('gemini', { models: [
        { name: 'models/gemini-x', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding-y', supportedGenerationMethods: ['embedContent'] }
    ] }), ['gemini-x']);
    assert.equal(requeteModeles('openai', 'k').options.headers.authorization, 'Bearer k');
});

test('erreurs : clé refusée, quota, autre', () => {
    assert.equal(lireErreur(401, {}).type, 'cle');
    assert.equal(lireErreur(429, {}).type, 'quota');
    assert.equal(lireErreur(400, { error: { message: 'model not found' } }).detail, '400 — model not found');
});
