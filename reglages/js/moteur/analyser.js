// Point d'entrée du moteur : à partir de ce que l'utilisateur a saisi et de la base de
// connaissances, produit le diagnostic, la cadence, l'avis sur la génération d'images,
// le tableau de réglages et les messages (règles) à afficher. Aucune lecture ni écriture de la page.

import { analyserCadence } from './cadence.js';
import { diagnostiquer } from './diagnostic.js';
import { evaluerGeneration } from './generationImages.js';
import { familleGpu } from './materiel.js';
import { tableauReglages } from './recommandations.js';
import { reglesApplicables } from './regles.js';

/**
 * @param {object} saisie
 * @param {object} saisie.profil       { simulateur, directx, gpu, vramGo, frequenceHz, vrr, affichage, … }
 * @param {object} [saisie.mesures]    { limite, msPrincipal, msRendu, msGpu, vramUtiliseeGo, fpsReels, verrouFps }
 * @param {string[]} [saisie.symptomes]  ids de symptomes.json
 * @param {object[]} [saisie.changements] réglages modifiés par l'utilisateur : { id, sens: 'baisse'|'hausse' }
 * @param {object} base  { parametres, regles, materiel, symptomes } (contenu des fichiers de donnees/)
 */
export function analyser(saisie, base) {
    const profil = saisie.profil ?? {};
    const mesures = saisie.mesures ?? {};
    const symptomes = saisie.symptomes ?? [];
    const changements = saisie.changements ?? [];

    const famille = familleGpu(profil.gpu, base.materiel);
    const diagnostic = diagnostiquer(profil, mesures, symptomes, base.symptomes);
    const cadence = analyserCadence({
        frequenceHz: profil.frequenceHz,
        vrr: profil.vrr === true,
        verrouFps: mesures.verrouFps ?? null,
        fpsReels: mesures.fpsReels ?? null
    });
    // Des FPS bloqués par le verrou ne disent rien de la capacité réelle : pas d'avis sur le seuil
    const fpsReels = cadence.mesureBloqueeParVerrou ? null : (mesures.fpsReels ?? null);
    const generation = evaluerGeneration({ profil, famille, fpsReels, goulot: diagnostic.goulot });

    const ctx = { profil, mesures, symptomes, changements, famille, diagnostic, cadence, generation };
    return {
        famille,
        diagnostic,
        cadence,
        generation,
        tableau: tableauReglages(base.parametres, profil.simulateur, diagnostic.goulot),
        messages: reglesApplicables(base.regles, ctx)
    };
}
