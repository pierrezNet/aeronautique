// Interface de l'Atelier réglages : construit le formulaire, mémorise les réponses sur l'appareil,
// appelle le moteur (moteur/analyser.js) et affiche les résultats. Seul fichier qui touche à la page.

import { analyser } from './moteur/analyser.js';
import { familleGpu } from './moteur/materiel.js';
import { parametresDuSimulateur } from './moteur/recommandations.js';
import { T, langue, nombre, tr } from './textes.js';
import * as stockage from './stockage.js';
import { choisirFichierTexte, el } from './dom.js';
import { lireCapture } from './moteur/presentmon.js';
import { monterJournal } from './interfaceJournal.js';

const racine = document.getElementById('atelier');
const DONNEES = '/reglages/donnees/';

// ── Chargement de la base de connaissances ──────────────────────────────────────────────
async function chargerBase() {
    const lire = async nom => {
        const reponse = await fetch(DONNEES + nom);
        if (!reponse.ok) throw new Error(`${nom} : ${reponse.status}`);
        return reponse.json();
    };
    const [parametres, regles, materiel, symptomes, challenges] = await Promise.all(
        ['parametres.json', 'regles.json', 'materiel.json', 'symptomes.json', 'challenges.json'].map(lire)
    );
    return {
        parametres: parametres.parametres, regles: regles.regles, materiel,
        symptomes: symptomes.symptomes, challenges: challenges.challenges
    };
}

// ── Champs du formulaire ────────────────────────────────────────────────────────────────

// Champ texte ou nombre, avec son label et une aide facultative reliée par aria-describedby
function champ(nom, libelle, { type = 'text', aide = null, min = null, max = null, step = null, liste = null, autocomplete = 'off' } = {}) {
    const id = `champ-${nom}`;
    const idAide = aide ? `${id}-aide` : null;
    return el('div', { class: 'champ' },
        el('label', { for: id }, libelle),
        el('input', {
            id, name: nom, type, min, max, step, list: liste, autocomplete,
            inputmode: type === 'number' ? 'decimal' : null,
            'aria-describedby': idAide
        }),
        aide && el('p', { class: 'aide', id: idAide }, aide)
    );
}

// Groupe de boutons radio dans un fieldset (la légende est le libellé du groupe)
function choix(nom, legende, options, aide = null) {
    const idAide = aide ? `aide-${nom}` : null;
    return el('fieldset', { class: 'choix', 'aria-describedby': idAide },
        el('legend', {}, legende),
        options.map(([valeur, libelle]) => el('label', { class: 'option' },
            el('input', { type: 'radio', name: nom, value: valeur }),
            ' ', libelle
        )),
        aide && el('p', { class: 'aide', id: idAide }, aide)
    );
}

// Import d'une capture PresentMon : le résumé est gardé dans un champ caché (mémorisé avec le reste)
function blocCapture() {
    const memoire = el('input', { type: 'hidden', name: 'capture', id: 'champ-capture' });
    const resume = el('p', { class: 'aide', id: 'resume-capture', 'aria-live': 'polite' });
    const importer = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.importerCapture);
    const oublier = el('button', { type: 'button', class: 'btn btn-secondaire', id: 'oublier-capture', hidden: true }, T.oublierCapture);

    importer.addEventListener('click', async () => {
        const contenu = await choisirFichierTexte('.csv,text/csv');
        if (contenu === null) return;
        const capture = lireCapture(contenu);
        if (capture.erreur) {
            resume.textContent = T.erreurCapture;
            return;
        }
        // Les FPS de la capture sont des FPS réels (images générées exclues). On remplit le champ s'il
        // est vide ou s'il contient la valeur d'une capture précédente ; une valeur tapée n'est jamais écrasée.
        const fps = document.getElementById('champ-fpsReels');
        if (!fps.value || vientDeLaCapture(fps.value, memoire.value)) fps.value = capture.fpsMoyen;
        memoire.value = JSON.stringify(capture);
        memoire.form.dispatchEvent(new Event('input', { bubbles: true }));
    });
    oublier.addEventListener('click', () => {
        // Les FPS réels posés par cette capture partent avec elle
        const fps = document.getElementById('champ-fpsReels');
        if (vientDeLaCapture(fps.value, memoire.value)) fps.value = '';
        memoire.value = '';
        memoire.form.dispatchEvent(new Event('input', { bubbles: true }));
    });

    return el('div', { class: 'bloc-capture' },
        el('p', { class: 'sous-titre' }, T.captureTitre),
        el('p', { class: 'aide' }, T.captureAide),
        el('div', { class: 'actions' }, importer, oublier),
        resume, memoire);
}

// La valeur du champ « FPS réels » est-elle celle posée par la capture mémorisée ?
function vientDeLaCapture(valeurChamp, captureMemorisee) {
    const capture = lireCaptureMemorisee(captureMemorisee);
    return capture !== null && nb(valeurChamp) === capture.fpsMoyen;
}

const lireCaptureMemorisee = valeur => {
    try {
        return valeur ? JSON.parse(valeur) : null;
    } catch (e) {
        return null;
    }
};

function construireFormulaire(base) {
    const exemplesGpu = el('datalist', { id: 'exemples-gpu' },
        ['RTX 5090', 'RTX 5080', 'RTX 5070 Ti', 'RTX 5070', 'RTX 5060 Ti', 'RTX 5060', 'RTX 4090', 'RTX 4080', 'RTX 4070 Ti', 'RTX 4070', 'RTX 4060 Ti', 'RTX 4060', 'RTX 3080', 'RTX 3070', 'RTX 3060', 'RTX 2070', 'GTX 1080', 'Radeon RX 7900 XTX', 'Radeon RX 7800 XT']
            .map(m => el('option', { value: m }))
    );

    const blocDirectx = choix('directx', T.directx, [['dx11', 'DirectX 11'], ['dx12', 'DirectX 12']]);
    blocDirectx.id = 'bloc-directx';

    const avertissementGpu = el('p', { class: 'aide avertissement', id: 'gpu-inconnu', hidden: true }, T.gpuInconnu);
    const avertissementVr = el('p', { class: 'aide avertissement', id: 'vr-avertissement', hidden: true }, T.vrAvertissement);

    const configuration = el('fieldset', { class: 'etape' },
        el('legend', {}, T.configuration),
        choix('simulateur', T.simulateur, [['2024', 'Microsoft Flight Simulator 2024'], ['2020', 'Microsoft Flight Simulator 2020']]),
        blocDirectx,
        el('div', { class: 'grille' },
            el('div', {}, champ('gpu', T.gpu, { aide: T.gpuAide, liste: 'exemples-gpu' }), avertissementGpu),
            champ('vramGo', T.vram, { type: 'number', min: 1, max: 64, step: 'any', aide: T.vramAide }),
            champ('cpu', T.cpu),
            champ('ramGo', T.ram, { type: 'number', min: 1, max: 512, step: 'any' }),
            el('div', { class: 'champ' },
                el('label', { for: 'champ-resolution' }, T.resolution),
                el('select', { id: 'champ-resolution', name: 'resolution' },
                    ['', '1920×1080', '2560×1440', '3440×1440', '3840×2160'].map(v => el('option', { value: v }, v || '—')))
            ),
            champ('frequenceHz', T.frequence, { type: 'number', min: 30, max: 500, step: 'any', aide: T.frequenceAide })
        ),
        choix('vrr', T.vrr, [['oui', T.oui], ['non', T.non], ['nsp', T.nsp]], T.vrrAide),
        choix('affichage', T.affichage, [['moniteur', T.moniteur], ['vr', T.vr]]),
        avertissementVr,
        champ('avion', T.avion),
        exemplesGpu
    );

    const aide = el('details', { class: 'aide-mesures' },
        el('summary', {}, T.aideMesuresTitre),
        el('ol', {}, T.aideMesures.map(etape => el('li', {}, etape)))
    );

    const mesures = el('fieldset', { class: 'etape' },
        el('legend', {}, T.mesures),
        el('p', {}, T.mesuresIntro),
        aide,
        blocCapture(),
        choix('limite', T.limite, [['main-thread', T.limiteMain], ['rendu', T.limiteRendu], ['gpu', T.limiteGpu], ['', T.limiteNsp]]),
        el('div', { class: 'grille' },
            champ('msPrincipal', T.msPrincipal, { type: 'number', min: 0, step: 'any' }),
            champ('msRendu', T.msRendu, { type: 'number', min: 0, step: 'any' }),
            champ('msGpu', T.msGpu, { type: 'number', min: 0, step: 'any' }),
            champ('vramUtiliseeGo', T.vramUtilisee, { type: 'number', min: 0, step: 'any' }),
            champ('fpsReels', T.fpsReels, { type: 'number', min: 1, step: 'any', aide: T.fpsReelsAide }),
            champ('verrouFps', T.verrou, { type: 'number', min: 1, step: 'any', aide: T.verrouAide })
        )
    );

    const symptomes = el('fieldset', { class: 'etape' },
        el('legend', {}, T.symptomes),
        base.symptomes.map(s => el('label', { class: 'option' },
            el('input', { type: 'checkbox', name: 'symptomes', value: s.id }),
            ' ', tr(s.libelle)
        ))
    );

    // Étape 4 : la liste des réglages dépend du simulateur, elle est remplie par majChangements()
    const changements = el('fieldset', { class: 'etape' },
        el('legend', {}, T.changements),
        el('p', {}, T.changementsIntro),
        el('div', { class: 'grille', id: 'liste-changements' })
    );

    return el('form', { id: 'formulaire', novalidate: true },
        configuration, mesures, symptomes, changements,
        el('p', { class: 'erreur', id: 'erreur-formulaire', role: 'alert', hidden: true }),
        el('div', { class: 'actions' },
            el('button', { type: 'submit', class: 'btn' }, T.analyser),
            el('button', { type: 'button', class: 'btn btn-secondaire', id: 'effacer' }, T.effacer)
        )
    );
}

// Un menu par réglage du simulateur choisi : pas touché, baissé, augmenté.
// Les menus portent le nom « changement:<id du paramètre> ».
function majChangements(base, simulateur) {
    const liste = document.getElementById('liste-changements');
    if (liste.dataset.simulateur === (simulateur ?? '')) return false;
    liste.dataset.simulateur = simulateur ?? '';
    if (!simulateur) {
        liste.replaceChildren(el('p', { class: 'aide' }, T.changementsChoisirSimulateur));
        return true;
    }
    liste.replaceChildren(...parametresDuSimulateur(base.parametres, simulateur).map(p => {
        const id = `changement-${p.id}`;
        return el('div', { class: 'champ' },
            el('label', { for: id }, tr(p.libelle)),
            el('select', { id, name: `changement:${p.id}` },
                el('option', { value: '' }, T.sensAucun),
                el('option', { value: 'baisse' }, T.sensBaisse),
                el('option', { value: 'hausse' }, T.sensHausse))
        );
    }));
    return true;
}

// ── Lecture, mémorisation et restauration des réponses ─────────────────────────────────

// Valeurs brutes du formulaire : { nom: valeur } (liste pour les cases à cocher)
function valeursBrutes(formulaire) {
    const valeurs = {};
    for (const champ of formulaire.elements) {
        if (!champ.name) continue;
        if (champ.type === 'checkbox') {
            valeurs[champ.name] ??= [];
            if (champ.checked) valeurs[champ.name].push(champ.value);
        } else if (champ.type === 'radio') {
            if (champ.checked) valeurs[champ.name] = champ.value;
        } else {
            valeurs[champ.name] = champ.value;
        }
    }
    return valeurs;
}

function restaurer(formulaire, valeurs) {
    for (const champ of formulaire.elements) {
        if (!champ.name || !(champ.name in valeurs)) continue;
        const v = valeurs[champ.name];
        if (champ.type === 'checkbox') champ.checked = Array.isArray(v) && v.includes(champ.value);
        else if (champ.type === 'radio') champ.checked = champ.value === v;
        else champ.value = v;
    }
}

// Nombre saisi, ou null si vide ou invalide
const nb = v => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};

// Valeurs brutes → saisie attendue par le moteur (analyser.js)
function versSaisie(v, base) {
    const idsDuSimulateur = new Set(parametresDuSimulateur(base.parametres, v.simulateur).map(p => p.id));
    return {
        profil: {
            simulateur: v.simulateur ?? null,
            directx: v.simulateur === '2020' ? (v.directx ?? null) : null,
            gpu: v.gpu ?? '',
            vramGo: nb(v.vramGo),
            cpu: v.cpu ?? '',
            ramGo: nb(v.ramGo),
            resolution: v.resolution ?? '',
            frequenceHz: nb(v.frequenceHz),
            vrr: v.vrr === 'oui',
            vrrInconnu: v.vrr === 'nsp' || v.vrr === undefined,
            affichage: v.affichage ?? 'moniteur',
            avion: v.avion ?? ''
        },
        mesures: {
            limite: v.limite || null,
            msPrincipal: nb(v.msPrincipal),
            msRendu: nb(v.msRendu),
            msGpu: nb(v.msGpu),
            vramUtiliseeGo: nb(v.vramUtiliseeGo),
            fpsReels: nb(v.fpsReels),
            verrouFps: nb(v.verrouFps),
            capture: lireCaptureMemorisee(v.capture)
        },
        symptomes: v.symptomes ?? [],
        // Seulement les changements du simulateur choisi (les menus d'un autre restent mémorisés)
        changements: Object.entries(v)
            .filter(([nom, sens]) => nom.startsWith('changement:') && sens)
            .map(([nom, sens]) => ({ id: nom.slice('changement:'.length), sens }))
            .filter(c => idsDuSimulateur.has(c.id))
    };
}

// ── Affichage des résultats ─────────────────────────────────────────────────────────────

function badgeStatut(statut) {
    return statut === 'verifie' ? null : el('span', { class: 'badge badge-verifier', title: T.aVerifierAide }, T.aVerifier);
}

function listeSources(sources) {
    if (!sources?.length) return null;
    return el('details', { class: 'sources' },
        el('summary', {}, `${T.sources} (${sources.length})`),
        el('ul', {}, sources.map(s => el('li', {},
            el('a', { href: s.url, rel: 'noopener', hreflang: 'en' }, s.titre),
            ` — ${T.rang(s.rang)}`
        )))
    );
}

function blocDiagnostic(r) {
    const d = r.diagnostic;
    const fil = d.fil && d.goulot === 'cpu' ? ` (${T.fils[d.fil]})` : '';
    return el('section', { class: 'carte', 'aria-labelledby': 'titre-diagnostic' },
        el('h3', { id: 'titre-diagnostic' }, T.diagnostic),
        el('p', { class: `goulot goulot-${d.goulot}` }, T.goulots[d.goulot] + fil),
        el('p', {}, T.confiances[d.confiance]),
        d.tauxVram !== null && el('p', {}, T.vramTaux(Math.round(d.tauxVram * 100)))
    );
}

function blocCadence(r, profil) {
    const c = r.cadence;
    if (!c.valide) return null;
    const contenu = [
        el('p', {}, T.sousMultiples(nombre(c.frequenceHz))),
        el('ul', { class: 'cibles' }, c.cibles.map(cible => el('li', {
            class: cible === c.cibleConseillee ? 'cible conseillee' : 'cible'
        }, `${nombre(cible.fps)} FPS`)))
    ];
    if (c.verrouFps !== null) {
        if (c.verrouExact) contenu.push(el('p', {}, T.verrouExact(nombre(c.verrouFps))));
        else if (c.vrr) contenu.push(el('p', {}, T.verrouVrr(nombre(c.verrouFps))));
        else contenu.push(el('p', { class: 'alerte' }, T.verrouInexact(nombre(c.verrouFps), c.voisins.map(v => `${nombre(v.fps)} FPS`).join(langue === 'en' ? ' and ' : ' et '))));
    }
    if (profil.vrrInconnu) contenu.push(el('p', {}, T.vrrInconnu));
    if (c.mesureBloqueeParVerrou) contenu.push(el('p', { class: 'alerte' }, T.mesureBloquee));
    else if (c.cibleConseillee) contenu.push(el('p', { class: 'conseil' }, T.cibleConseillee(nombre(c.cibleConseillee.fps), c.cibleConseillee.diviseur)));
    else if (!c.vrr) contenu.push(el('p', {}, T.cibleSansMesure));
    return el('section', { class: 'carte', 'aria-labelledby': 'titre-cadence' }, el('h3', { id: 'titre-cadence' }, T.cadence), contenu);
}

function blocGeneration(r) {
    return el('section', { class: 'carte', 'aria-labelledby': 'titre-generation' },
        el('h3', { id: 'titre-generation' }, T.generation),
        el('p', {}, T.avisGeneration[r.generation.avis]),
        r.generation.multiDisponible && el('p', {}, T.multiDisponible)
    );
}

function blocMessages(r) {
    if (r.messages.length === 0) return null;
    return el('section', { 'aria-labelledby': 'titre-messages' },
        el('h3', { id: 'titre-messages' }, T.messages),
        r.messages.map(m => el('article', { class: `message message-${m.gravite}` },
            el('p', { class: 'message-entete' },
                el('span', { class: 'gravite' }, T.gravites[m.gravite]), ' ', badgeStatut(m.statut)),
            el('p', {}, tr(m.message)),
            listeSources(m.sources)
        ))
    );
}

function blocTableau(r) {
    const impact = l => el('ul', { class: 'impacts' },
        el('li', {}, T.impact(T.impactCpu, l.impact.cpu)),
        el('li', {}, T.impact(T.impactGpu, l.impact.gpu)),
        el('li', {}, T.impact(T.impactVram, l.impact.vram))
    );
    return el('section', { 'aria-labelledby': 'titre-tableau' },
        el('h3', { id: 'titre-tableau' }, T.tableau),
        el('p', {}, T.tableauIntro),
        el('table', { class: 'tableau' },
            el('thead', {}, el('tr', {},
                [T.colReglage, T.colImpact, T.colDepart, T.colCout, T.colTest].map(t => el('th', { scope: 'col' }, t)))),
            el('tbody', {}, r.tableau.map(l => el('tr', {},
                el('th', { scope: 'row', 'data-label': T.colReglage }, tr(l.libelle), ' ', badgeStatut(l.statut), listeSources(l.sources)),
                el('td', { 'data-label': T.colImpact }, impact(l)),
                el('td', { 'data-label': T.colDepart }, tr(l.depart)),
                el('td', { 'data-label': T.colCout }, tr(l.coutVisuel)),
                el('td', { 'data-label': T.colTest }, tr(l.test))
            )))
        )
    );
}

// Une question du challenge : choix radio, puis explication du choix fait (et de la réponse attendue)
function questionChallenge({ challenge, changement }, index, base) {
    const parametre = base.parametres.find(p => p.id === changement.id);
    const nom = `challenge-${index}`;
    const retour = el('div', { class: 'retour-challenge', 'aria-live': 'polite' });
    const choisir = choix => {
        const attendu = challenge.choix.find(c => c.correct);
        retour.replaceChildren(
            el('p', { class: choix.correct ? 'conseil' : 'alerte' }, choix.correct ? T.bonneReponse : T.mauvaiseReponse),
            el('p', {}, tr(choix.explication)),
            !choix.correct && el('p', {}, el('strong', {}, T.reponseAttendue), ' ', tr(attendu.texte), ' — ', tr(attendu.explication))
        );
    };
    return el('fieldset', { class: 'question' },
        el('legend', {}, tr(challenge.question), ' ', badgeStatut(challenge.statut)),
        el('p', { class: 'aide' }, T.challengeVotreChangement(tr(parametre?.libelle) || changement.id,
            (changement.sens === 'baisse' ? T.sensBaisse : T.sensHausse).toLowerCase())),
        challenge.choix.map(choix => {
            const radio = el('input', { type: 'radio', name: nom });
            radio.addEventListener('change', () => choisir(choix));
            return el('label', { class: 'option' }, radio, ' ', tr(choix.texte));
        }),
        retour,
        listeSources(challenge.sources)
    );
}

function blocChallenge(r, saisie, base) {
    let contenu;
    if (saisie.changements.length === 0) contenu = el('p', {}, T.challengeAucunChangement);
    else if (r.challenge.length === 0) contenu = el('p', {}, T.challengeAucuneQuestion);
    else contenu = r.challenge.map((q, i) => questionChallenge(q, i, base));
    return el('section', { 'aria-labelledby': 'titre-challenge' }, el('h3', { id: 'titre-challenge' }, T.challenge), contenu);
}

function afficherResultats(zone, r, saisie, base, donnerFocus = true) {
    const profil = saisie.profil;
    const titre = el('h2', { id: 'titre-resultats', tabindex: '-1' }, T.resultats);
    zone.replaceChildren(
        titre,
        el('div', { class: 'cartes' }, blocDiagnostic(r), blocCadence(r, profil), blocGeneration(r)),
        blocMessages(r),
        blocChallenge(r, saisie, base),
        blocTableau(r)
    );
    zone.hidden = false;
    // Après « Analyser », le focus passe au titre des résultats : lecteurs d'écran et clavier y arrivent directement
    if (donnerFocus) titre.focus();
}

// ── Démarrage ───────────────────────────────────────────────────────────────────────────

async function demarrer() {
    racine.replaceChildren(el('p', { role: 'status' }, T.chargement));
    let base;
    try {
        base = await chargerBase();
    } catch (err) {
        console.error(err);
        racine.replaceChildren(el('p', { class: 'erreur', role: 'alert' }, T.erreurChargement));
        return;
    }

    const formulaire = construireFormulaire(base);
    const resultats = el('section', { id: 'resultats', class: 'resultats', 'aria-labelledby': 'titre-resultats', hidden: true });
    const journal = el('section', { id: 'journal', class: 'journal-section' });
    racine.replaceChildren(el('p', { class: 'intro' }, T.intro), formulaire, resultats, journal);

    // Journal des essais : il reprend le simulateur et l'avion du formulaire principal
    const majJournal = monterJournal(journal, base, () => {
        const v = valeursBrutes(formulaire);
        return { simulateur: v.simulateur ?? null, avion: v.avion ?? '' };
    });

    // Champs qui dépendent d'autres réponses (DirectX en 2020, carte non reconnue, réalité virtuelle,
    // liste des réglages de l'étape 4 selon le simulateur)
    const majDependances = () => {
        const v = valeursBrutes(formulaire);
        // Liste reconstruite pour un autre simulateur : on y remet les choix mémorisés
        if (majChangements(base, v.simulateur)) restaurer(formulaire, stockage.lire() ?? {});
        document.getElementById('bloc-directx').hidden = v.simulateur !== '2020';
        document.getElementById('gpu-inconnu').hidden = !v.gpu || familleGpu(v.gpu, base.materiel) !== null;
        document.getElementById('vr-avertissement').hidden = v.affichage !== 'vr';
        // Résumé de la capture importée, s'il y en a une
        const capture = lireCaptureMemorisee(v.capture);
        const resume = document.getElementById('resume-capture');
        if (capture) resume.textContent = T.resumeCapture(capture);
        else if (resume.textContent !== T.erreurCapture) resume.textContent = '';
        document.getElementById('oublier-capture').hidden = !capture;
    };

    const memorise = stockage.lire();
    if (memorise) restaurer(formulaire, memorise);
    majDependances();

    formulaire.addEventListener('input', function memoriser() {
        // Les choix déjà mémorisés pour l'autre simulateur sont conservés
        stockage.ecrire({ ...(stockage.lire() ?? {}), ...valeursBrutes(formulaire) });
        majDependances();
        majJournal();
    });

    formulaire.addEventListener('submit', function lancerAnalyse(e) {
        e.preventDefault();
        const saisie = versSaisie(valeursBrutes(formulaire), base);
        const erreur = document.getElementById('erreur-formulaire');
        if (!saisie.profil.simulateur || !saisie.profil.frequenceHz) {
            erreur.textContent = T.champsManquants;
            erreur.hidden = false;
            return;
        }
        erreur.hidden = true;
        afficherResultats(resultats, analyser(saisie, base), saisie, base);
    });

    document.getElementById('effacer').addEventListener('click', function toutEffacer() {
        if (!window.confirm(T.effacerConfirmer)) return;
        stockage.effacer();
        formulaire.reset();
        resultats.hidden = true;
        majDependances();
        majJournal();
    });

    // Réponses déjà complètes : résultats affichés d'emblée, sans voler le focus
    if (memorise?.simulateur && nb(memorise.frequenceHz)) {
        const saisie = versSaisie(memorise, base);
        afficherResultats(resultats, analyser(saisie, base), saisie, base, false);
    }
}

demarrer();
