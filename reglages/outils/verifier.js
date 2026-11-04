// Liste les entrées de la base à revoir : à vérifier, vérifiées il y a plus de 6 mois,
// ou testées avant une Sim Update donnée. Sert après une mise à jour du simulateur.
//
//   npm run verifier                       → schéma + entrées à vérifier + vérifications anciennes
//   npm run verifier -- --avant 2024:SU4   → en plus, entrées 2024 testées avant la SU4
//
// Le code de sortie vaut 1 si le schéma est invalide (utilisable avant un commit).

import { readFileSync } from 'node:fs';
import { verifierChallenge, verifierIdentifiants, verifierParametre, verifierRegle } from './schema.js';

const DOSSIER = new URL('../donnees/', import.meta.url);
const lire = nom => JSON.parse(readFileSync(new URL(nom, DOSSIER), 'utf8'));
const MOIS_MAX = 6;

// « SU4 » → 4 ; une valeur non reconnue vaut 0 (donc toujours « avant »)
const numeroSU = texte => Number(/SU\s*(\d+)/i.exec(texte ?? '')?.[1] ?? 0);

function argumentAvant() {
    const i = process.argv.indexOf('--avant');
    if (i === -1) return null;
    const [simulateur, su] = String(process.argv[i + 1] ?? '').split(':');
    if (!['2020', '2024'].includes(simulateur) || !numeroSU(su)) {
        console.error('Usage : npm run verifier -- --avant 2024:SU4');
        process.exit(2);
    }
    return { simulateur, numero: numeroSU(su) };
}

const avant = argumentAvant();
const limite = new Date();
limite.setMonth(limite.getMonth() - MOIS_MAX);

const idsParametres = new Set(lire('parametres.json').parametres.map(p => p.id));
const fichiers = [
    { nom: 'parametres.json', entrees: lire('parametres.json').parametres, verifier: verifierParametre },
    { nom: 'regles.json', entrees: lire('regles.json').regles, verifier: verifierRegle },
    { nom: 'challenges.json', entrees: lire('challenges.json').challenges, verifier: (c, chemin) => verifierChallenge(c, chemin, idsParametres) }
];

let erreursSchema = 0;
for (const { nom, entrees, verifier } of fichiers) {
    const erreurs = [
        ...entrees.flatMap((e, i) => verifier(e, `${nom}[${i}] ${e.id ?? ''}`)),
        ...verifierIdentifiants(entrees, nom)
    ];
    erreursSchema += erreurs.length;
    erreurs.forEach(e => console.error('✗ ' + e));

    const aRevoir = entrees.filter(e => e.statut !== 'obsolete').map(e => {
        const raisons = [];
        if (e.statut === 'a-verifier') raisons.push('à vérifier');
        if (new Date(e.dateVerification) < limite) raisons.push(`vérifié il y a plus de ${MOIS_MAX} mois (${e.dateVerification})`);
        if (avant && (e.simulateur === avant.simulateur || e.simulateur === 'les-deux')) {
            const su = e.simulateur === 'les-deux' ? e.miseAJourMin[avant.simulateur] : e.miseAJourMin;
            if (numeroSU(su) < avant.numero) raisons.push(`testé avec ${su} (${avant.simulateur}), avant la SU${avant.numero}`);
        }
        return { id: e.id, simulateur: e.simulateur, raisons };
    }).filter(e => e.raisons.length > 0);

    console.log(`\n${nom} : ${entrees.length} entrées, ${aRevoir.length} à revoir`);
    aRevoir.forEach(e => console.log(`  - ${e.id} (${e.simulateur}) : ${e.raisons.join(' ; ')}`));
}

if (erreursSchema > 0) {
    console.error(`\n${erreursSchema} erreur(s) de schéma.`);
    process.exit(1);
}
