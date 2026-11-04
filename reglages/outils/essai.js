// Essai du moteur en ligne de commande, en attendant l'interface.
//
//   npm run essai                               → cas de départ (165 Hz, RTX 5060 Ti, verrou à 41)
//   npm run essai -- '{"profil":{…},"mesures":{…}}'  → votre propre saisie (JSON)
//
// Champs : profil { simulateur, directx, gpu, vramGo, frequenceHz, vrr },
//          mesures { limite: main-thread|rendu|gpu, msPrincipal, msRendu, msGpu, vramUtiliseeGo, fpsReels, verrouFps },
//          symptomes [ids], changements [{ id, sens }]

import { readFileSync } from 'node:fs';
import { analyser } from '../js/moteur/analyser.js';

const lire = nom => JSON.parse(readFileSync(new URL(`../donnees/${nom}`, import.meta.url), 'utf8'));
const base = {
    parametres: lire('parametres.json').parametres,
    regles: lire('regles.json').regles,
    materiel: lire('materiel.json'),
    symptomes: lire('symptomes.json').symptomes
};

const CAS_DE_DEPART = {
    profil: { simulateur: '2024', gpu: 'RTX 5060 Ti', vramGo: 16, frequenceHz: 165, vrr: false },
    mesures: { verrouFps: 41, limite: 'main-thread', fpsReels: 47 },
    changements: [{ id: 'echelle-rendu-2024', sens: 'baisse' }]
};

const saisie = process.argv[2] ? JSON.parse(process.argv[2]) : CAS_DE_DEPART;
const r = analyser(saisie, base);
const statut = s => (s === 'verifie' ? '' : ' [à vérifier]');

console.log('Saisie :', JSON.stringify(saisie));
console.log(`\nCarte graphique : ${r.famille?.nom ?? 'non reconnue'}`);
console.log(`Goulot : ${r.diagnostic.goulot} (fil : ${r.diagnostic.fil ?? '—'}, confiance : ${r.diagnostic.confiance})`);
if (r.cadence.valide) {
    console.log(`Sous-multiples de ${r.cadence.frequenceHz} Hz : ${r.cadence.cibles.map(c => c.fps).join(' ; ')}`);
    if (r.cadence.verrouFps !== null) console.log(`Verrou ${r.cadence.verrouFps} : ${r.cadence.verrouExact ? 'exact' : `inexact (voisins : ${r.cadence.voisins.map(c => c.fps).join(' et ')})`}`);
    if (r.cadence.mesureBloqueeParVerrou) console.log('FPS mesurés égaux au verrou : mesurez sans verrou pour connaître la capacité réelle.');
    if (r.cadence.cibleConseillee) console.log(`Cible conseillée : ${r.cadence.cibleConseillee.fps} FPS (fréquence / ${r.cadence.cibleConseillee.diviseur})`);
}
console.log(`Génération d'images : ${r.generation.avis}${r.generation.multiDisponible ? ' (multi-génération disponible)' : ''}`);

console.log('\nMessages :');
for (const m of r.messages) console.log(`- [${m.gravite}] ${m.id}${statut(m.statut)}\n  ${m.message.fr}`);

console.log('\nRéglages, du plus au moins utile pour ce goulot :');
for (const l of r.tableau) console.log(`- ${l.libelle.fr}${statut(l.statut)} (CPU ${l.impact.cpu}, GPU ${l.impact.gpu}, VRAM ${l.impact.vram})\n  → ${l.depart.fr}`);
