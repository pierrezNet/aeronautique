// Point d'entrée du moteur : à partir de ce que l'utilisateur a saisi et de la base de
// connaissances, produit le diagnostic, la cadence, l'avis sur la génération d'images,
// le tableau de réglages et les messages (règles) à afficher. Aucune lecture ni écriture de la page.

import { analyserCadence } from './cadence.js';
import { analyserCadenceVr } from './cadenceVr.js';
import { questionsChallenge, questionsDiagnostic } from './challenge.js';
import { diagnostiquer } from './diagnostic.js';
import { evaluerGeneration } from './generationImages.js';
import { familleGpu } from './materiel.js';
import { tableauReglages } from './recommandations.js';
import { reglesApplicables } from './regles.js';

/**
 * @param {object} saisie
 * @param {object} saisie.profil       { simulateur, directx, gpu, vramGo, frequenceHz, vrr, affichage, … }
 *                                     en VR (affichage 'vr') : { casque, frequenceCasqueHz, runtime, reprojection }
 * @param {object} [saisie.mesures]    { limite, msPrincipal, msRendu, msGpu, vramUtiliseeGo, fpsReels, verrouFps }
 * @param {string[]} [saisie.symptomes]  ids de symptomes.json
 * @param {object[]} [saisie.changements] réglages modifiés par l'utilisateur : { id, sens: 'baisse'|'hausse' }
 * @param {object} base  { parametres, regles, materiel, symptomes, challenges } (contenu des fichiers de donnees/)
 */
export function analyser(saisie, base) {
    const profil = saisie.profil ?? {};
    const mesures = saisie.mesures ?? {};
    const symptomes = saisie.symptomes ?? [];
    const changements = saisie.changements ?? [];

    const vr = profil.affichage === 'vr';
    const famille = familleGpu(profil.gpu, base.materiel);
    const diagnostic = diagnostiquer(profil, mesures, symptomes, base.symptomes);
    // En VR, la cadence suit le casque et sa reprojection, pas l'écran (cadenceVr.js)
    const cadence = vr
        ? analyserCadenceVr({
            frequenceHz: profil.frequenceCasqueHz,
            reprojection: profil.reprojection ?? null,
            fpsReels: mesures.fpsReels ?? null
        })
        : analyserCadence({
            frequenceHz: profil.frequenceHz,
            vrr: profil.vrr === true,
            verrouFps: mesures.verrouFps ?? null,
            fpsReels: mesures.fpsReels ?? null
        });
    // Des FPS bloqués par le verrou (ou par la reprojection forcée) ne disent rien de la capacité réelle
    const fpsReels = cadence.mesureBloqueeParVerrou || cadence.mesurePlafonnee ? null : (mesures.fpsReels ?? null);
    const generation = evaluerGeneration({ profil, famille, fpsReels, goulot: diagnostic.goulot });

    const ctx = { profil, mesures, symptomes, changements, famille, diagnostic, cadence, generation };
    return {
        famille,
        diagnostic,
        cadence,
        generation,
        tableau: tableauReglages(base.parametres, profil.simulateur, diagnostic.goulot, profil.affichage),
        messages: reglesApplicables(base.regles, ctx),
        challenge: questionsChallenge(base.challenges ?? [], {
            simulateur: profil.simulateur, changements, goulot: diagnostic.goulot, avisGeneration: generation.avis, affichage: profil.affichage
        }),
        quiz: questionsDiagnostic(base.challenges ?? [], { simulateur: profil.simulateur, goulot: diagnostic.goulot, affichage: profil.affichage })
    };
}
