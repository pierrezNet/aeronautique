// Interface du journal avant/après (étape 6) : protocole, formulaire d'essai, liste comparée,
// exports JSON et CSV, import JSON. La logique est dans moteur/journal.js ; le stockage
// dans stockage.js (clé séparée des réponses du formulaire principal).

import { choisirFichierTexte, el, telecharger } from './dom.js';
import { lireCapture } from './moteur/presentmon.js';
import { avecComparaisons, champsInvalides, creerEntree, fusionner, lireJson, versCsv, versJson } from './moteur/journal.js';
import { parametresDuSimulateur } from './moteur/recommandations.js';
import * as stockage from './stockage.js';
import { T, langue, nombre, tr } from './textes.js';

const douteuse = c => c.avertissements.includes('scenario-different') || c.avertissements.includes('generation-differente');

const formatDate = iso => new Date(iso).toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' });

function champ(nom, libelle, { type = 'text', min = null, max = null } = {}) {
    const id = `essai-${nom}`;
    return el('div', { class: 'champ' },
        el('label', { for: id }, libelle),
        el('input', { id, name: nom, type, min, max, step: type === 'number' ? 'any' : null, inputmode: type === 'number' ? 'decimal' : null, autocomplete: 'off' })
    );
}

/**
 * Monte le journal dans le conteneur.
 * @param {HTMLElement} conteneur
 * @param {object} base               base de connaissances (pour les noms des réglages)
 * @param {() => object} profilCourant renvoie { simulateur, avion } d'après le formulaire principal
 */
export function monterJournal(conteneur, base, profilCourant) {
    let entrees = stockage.lireJournal();
    const libelleReglage = id => tr(base.parametres.find(p => p.id === id)?.libelle) || id;

    const statut = el('p', { class: 'statut', role: 'status' });

    // Mesures d'un essai remplies depuis une capture PresentMon (FPS moyens et 1 % bas)
    const boutonCapture = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.remplirDepuisCapture);
    boutonCapture.addEventListener('click', async () => {
        const contenu = await choisirFichierTexte('.csv,text/csv');
        if (contenu === null) return;
        const capture = lireCapture(contenu);
        if (capture.erreur) {
            statut.textContent = T.erreurCapture;
            return;
        }
        formulaire.elements.fpsMoyen.value = capture.fpsMoyen;
        formulaire.elements.unPourcentBas.value = capture.unPourcentBas;
        statut.textContent = T.resumeCapture(capture);
    });
    const erreur = el('p', { class: 'erreur', role: 'alert', hidden: true });
    const liste = el('div', { class: 'liste-journal' });
    const menuReglage = el('select', { id: 'essai-reglage', name: 'reglage' });
    const simulateurInfo = el('p', { class: 'aide' });

    const formulaire = el('form', { class: 'etape', novalidate: true },
        el('fieldset', { class: 'choix-libre' },
            el('legend', {}, T.nouvelEssai),
            simulateurInfo,
            el('div', { class: 'grille' },
                champ('aeroport', T.aeroport), champ('avion', T.avionEssai), champ('meteo', T.meteo),
                champ('heure', T.heure), champ('duree', T.duree)
            ),
            el('div', { class: 'grille' },
                el('div', { class: 'champ' }, el('label', { for: 'essai-reglage' }, T.reglageModifie), menuReglage),
                champ('avant', T.avant), champ('apres', T.apres)
            ),
            el('label', { class: 'option' }, el('input', { type: 'checkbox', name: 'generationActive' }), ' ', T.generationActive),
            el('div', { class: 'grille' },
                champ('fpsMoyen', T.fpsMoyen, { type: 'number', min: 1 }),
                champ('unPourcentBas', T.unPourcentBas, { type: 'number', min: 1 })
            ),
            boutonCapture,
            el('fieldset', { class: 'choix' },
                el('legend', {}, T.ressenti),
                el('div', { class: 'ressentis' }, [1, 2, 3, 4, 5].map(n =>
                    el('label', { class: 'option' }, el('input', { type: 'radio', name: 'ressenti', value: n }), ' ', String(n))))
            ),
            el('div', { class: 'champ' },
                el('label', { for: 'essai-notes' }, T.notes),
                el('textarea', { id: 'essai-notes', name: 'notes', rows: 2 })
            ),
            erreur,
            el('button', { type: 'submit', class: 'btn' }, T.ajouter)
        )
    );

    // Menu des réglages du simulateur courant, et rappel du simulateur utilisé
    function majFormulaire() {
        const { simulateur } = profilCourant();
        simulateurInfo.textContent = simulateur ? `${T.essaiSimulateur} (MSFS ${simulateur})` : T.essaiSansSimulateur;
        const choixActuel = menuReglage.value;
        menuReglage.replaceChildren(
            el('option', { value: '' }, T.reference),
            ...(simulateur ? parametresDuSimulateur(base.parametres, simulateur) : []).map(p => el('option', { value: p.id }, tr(p.libelle)))
        );
        menuReglage.value = [...menuReglage.options].some(o => o.value === choixActuel) ? choixActuel : '';
    }

    // Scénario repris du dernier essai du même simulateur : on refait le même test
    function preremplirScenario() {
        const { simulateur, avion } = profilCourant();
        const dernier = [...entrees].reverse().find(e => e.simulateur === simulateur);
        for (const nom of ['aeroport', 'avion', 'meteo', 'heure', 'duree']) {
            const valeur = dernier?.scenario[nom] ?? (nom === 'avion' ? avion : '');
            if (valeur && !formulaire.elements[nom].value) formulaire.elements[nom].value = valeur;
        }
    }

    function enregistrer() {
        if (!stockage.ecrireJournal(entrees)) statut.textContent = T.stockagePlein;
    }

    function afficherListe() {
        if (entrees.length === 0) {
            liste.replaceChildren(el('p', {}, T.journalVide));
            return;
        }
        // Plus récent en haut ; les comparaisons sont calculées dans l'ordre chronologique
        const lignes = avecComparaisons(entrees).reverse();
        liste.replaceChildren(el('table', { class: 'tableau journal' },
            el('thead', {}, el('tr', {},
                [T.colDate, T.colChangement, T.colFps, T.colUnPourcent, T.colRessenti, T.colRemarques, ''].map(t => el('th', { scope: 'col' }, t)))),
            el('tbody', {}, lignes.map(({ entree: e, comparaison: c }) => {
                const changement = e.reglage.id ? `${libelleReglage(e.reglage.id)} : ${e.reglage.avant} → ${e.reglage.apres}` : T.reference;
                const remarques = c.avertissements.map(a => T.avertissementsJournal[a]);
                const supprimer = el('button', { type: 'button', class: 'btn-lien', 'aria-label': T.supprimerEssai(formatDate(e.date)) }, T.supprimer);
                supprimer.addEventListener('click', () => {
                    entrees = entrees.filter(x => x.id !== e.id);
                    enregistrer();
                    afficherListe();
                });
                return el('tr', {},
                    el('th', { scope: 'row', 'data-label': T.colDate }, formatDate(e.date), el('br'), el('span', { class: 'aide' }, `MSFS ${e.simulateur}`)),
                    el('td', { 'data-label': T.colChangement }, changement, e.generationActive && el('span', { class: 'aide' }, ` (${T.generationActive.toLowerCase()})`)),
                    el('td', { 'data-label': T.colFps }, nombre(e.fpsMoyen), c.ecartFps !== null && el('span', {
                        // Comparaison douteuse (scénario ou génération d'images différents) : écart sans couleur,
                        // pour ne pas présenter comme un gain ce qui n'en est pas forcément un
                        class: douteuse(c) ? 'aide' : c.ecartFps > 0 ? 'conseil' : c.ecartFps < 0 ? 'alerte' : ''
                    }, ` ${T.ecart(c.ecartFps, c.ecartPourcent, nombre)}`)),
                    el('td', { 'data-label': T.colUnPourcent }, e.unPourcentBas !== null ? nombre(e.unPourcentBas) : '—'),
                    el('td', { 'data-label': T.colRessenti }, e.ressenti ?? '—'),
                    el('td', { 'data-label': T.colRemarques }, remarques.length ? el('ul', { class: 'remarques' }, remarques.map(r => el('li', {}, r))) : '—', e.notes && el('p', { class: 'aide' }, e.notes)),
                    el('td', {}, supprimer)
                );
            }))
        ));
    }

    formulaire.addEventListener('submit', function ajouterEssai(e) {
        e.preventDefault();
        const f = formulaire.elements;
        const entree = creerEntree({
            simulateur: profilCourant().simulateur ?? '',
            aeroport: f.aeroport.value, avion: f.avion.value, meteo: f.meteo.value, heure: f.heure.value, duree: f.duree.value,
            reglage: f.reglage.value, avant: f.avant.value, apres: f.apres.value,
            generationActive: f.generationActive.checked,
            fpsMoyen: f.fpsMoyen.value, unPourcentBas: f.unPourcentBas.value,
            ressenti: formulaire.querySelector('input[name=ressenti]:checked')?.value ?? null,
            notes: f.notes.value
        });
        const invalides = champsInvalides(entree);
        if (invalides.length > 0) {
            erreur.textContent = invalides.map(c => T.erreursEssai[c]).join(' ');
            erreur.hidden = false;
            return;
        }
        erreur.hidden = true;
        entrees = [...entrees, entree];
        enregistrer();
        afficherListe();
        // On garde le scénario pour l'essai suivant ; on vide les mesures et le changement
        for (const nom of ['reglage', 'avant', 'apres', 'fpsMoyen', 'unPourcentBas', 'notes']) f[nom].value = '';
        formulaire.querySelectorAll('input[name=ressenti]').forEach(r => { r.checked = false; });
        statut.textContent = T.essaiAjoute;
    });

    // Exports et import
    const exporterJson = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.exporterJson);
    exporterJson.addEventListener('click', () => telecharger(versJson(entrees), `${T.nomFichier}.json`, 'application/json'));

    const exporterCsv = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.exporterCsv);
    exporterCsv.addEventListener('click', () => {
        const csv = versCsv(entrees, {
            separateur: T.csvSeparateur, entetes: T.csvEntetes, libelle: libelleReglage,
            remarque: code => T.avertissementsJournal[code]
        });
        // Marque UTF-8 en tête : les tableurs affichent alors correctement les accents
        telecharger('﻿' + csv, `${T.nomFichier}.csv`, 'text/csv;charset=utf-8');
    });

    // Sélecteur de fichier caché, ouvert par un vrai bouton (atteignable au clavier)
    const fichier = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
    const importer = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.importer);
    importer.addEventListener('click', () => fichier.click());
    fichier.addEventListener('change', async () => {
        const [f] = fichier.files;
        if (!f) return;
        const { entrees: importees, ignorees, erreur: echec } = lireJson(await f.text());
        fichier.value = '';
        if (echec) {
            statut.textContent = T.importEchec;
            return;
        }
        const avant = entrees.length;
        entrees = fusionner(entrees, importees);
        enregistrer();
        afficherListe();
        statut.textContent = T.importReussi(entrees.length - avant, ignorees);
    });

    const vider = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.viderJournal);
    vider.addEventListener('click', () => {
        if (entrees.length === 0 || !window.confirm(T.viderConfirmer)) return;
        entrees = [];
        enregistrer();
        afficherListe();
    });

    conteneur.replaceChildren(
        el('h2', { id: 'titre-journal' }, T.journal),
        el('p', {}, T.journalIntro),
        el('details', { class: 'aide-mesures', open: true },
            el('summary', {}, T.protocoleTitre),
            el('ol', {}, T.protocole.map(p => el('li', {}, p)))
        ),
        formulaire,
        statut,
        liste,
        el('div', { class: 'actions' },
            exporterJson, exporterCsv,
            importer, fichier,
            vider
        )
    );
    conteneur.setAttribute('aria-labelledby', 'titre-journal');

    majFormulaire();
    preremplirScenario();
    afficherListe();

    // Appelé par app.js quand le simulateur ou l'avion changent dans le formulaire principal
    return function majProfil() {
        majFormulaire();
        preremplirScenario();
    };
}
