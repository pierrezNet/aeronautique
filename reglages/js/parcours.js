// Parcours en étapes : une barre d'étapes numérotées, une seule étape visible, boutons
// « Précédent » et « Suivant ». L'étape courante est dans l'adresse (#diagnostic…) : le bouton
// « retour » du navigateur et le rechargement de la page la conservent.
// Navigation libre : toutes les étapes sont accessibles à tout moment.

import { el } from './dom.js';
import { T } from './textes.js';

/**
 * @param {object} p
 * @param {{ id: string, titre: string, panneau: HTMLElement, entree?: () => void }[]} p.etapes
 *        panneau : élément à afficher (il doit contenir un titre h2) ; entree : appelée à chaque affichage
 * @returns {{ nav: HTMLElement, barre: HTMLElement, aller: (id: string, focus?: boolean) => void }}
 */
export function creerParcours({ etapes }) {
    const liens = etapes.map((etape, i) => el('a', { href: `#${etape.id}`, class: 'etape-lien' },
        el('span', { class: 'etape-numero', 'aria-hidden': 'true' }, String(i + 1)),
        el('span', { class: 'etape-titre' }, etape.titre)));
    const nav = el('nav', { class: 'parcours', 'aria-label': T.parcoursNom },
        el('ol', {}, liens.map(lien => el('li', {}, lien))));

    const position = el('p', { class: 'position', 'aria-live': 'polite' });
    const precedent = el('a', { class: 'btn btn-secondaire' }, `← ${T.precedent}`);
    const suivant = el('a', { class: 'btn' });
    const barre = el('div', { class: 'barre-parcours' }, precedent, position, suivant);

    let courante = -1;

    function aller(id, focus = true) {
        const index = Math.max(0, etapes.findIndex(e => e.id === id));
        courante = index;
        etapes.forEach((etape, i) => {
            etape.panneau.hidden = i !== index;
            if (i === index) liens[i].setAttribute('aria-current', 'step');
            else liens[i].removeAttribute('aria-current');
        });
        etapes[index].entree?.();

        position.textContent = T.position(index + 1, etapes.length, etapes[index].titre);
        precedent.hidden = index === 0;
        precedent.href = index > 0 ? `#${etapes[index - 1].id}` : '#';
        suivant.hidden = index === etapes.length - 1;
        if (index < etapes.length - 1) {
            suivant.href = `#${etapes[index + 1].id}`;
            suivant.textContent = `${T.suivant} : ${etapes[index + 1].titre} →`;
        }

        if (focus) {
            // Le titre de l'étape reçoit le focus : lecteurs d'écran et clavier repartent de là
            const titre = etapes[index].panneau.querySelector('h2');
            if (titre) {
                titre.setAttribute('tabindex', '-1');
                titre.focus({ preventScroll: true });
            }
            nav.scrollIntoView({ block: 'start' });
        }
    }

    // Changement d'étape par un lien (barre, Précédent, Suivant) ou par le bouton « retour »
    window.addEventListener('hashchange', () => aller(location.hash.slice(1)));

    return {
        nav,
        barre,
        aller,
        demarrer() {
            aller(location.hash.slice(1) || etapes[0].id, false);
        },
        get courante() {
            return etapes[courante]?.id;
        }
    };
}
