// Interface de l'Atelier réglages : construit le formulaire, mémorise les réponses sur l'appareil,
// appelle le moteur (moteur/analyser.js) et affiche les résultats. Seul fichier qui touche à la page.

import { analyser } from './moteur/analyser.js';
import { familleGpu } from './moteur/materiel.js';
import { parametresDuSimulateur } from './moteur/recommandations.js';
import { T, langue, nombre, tr } from './textes.js';
import * as stockage from './stockage.js';
import { choisirFichierTexte, el, telecharger } from './dom.js';
import { lireCapture } from './moteur/presentmon.js';
import { lireUserCfg } from './moteur/usercfg.js';
import { lireMemoireVideo } from './moteur/mesures.js';
import { monterJournal } from './interfaceJournal.js';
import { blocIa } from './interfaceIa.js';
import { creerParcours } from './parcours.js';
import { construireRapport, copierRapport, imprimerRapport, telechargerRapport } from './rapport.js';
import { journalRestaure, lireSauvegarde, versSauvegarde } from './moteur/sauvegarde.js';

const racine = document.getElementById('atelier');
const DONNEES = '/reglages/donnees/';

// ── Chargement de la base de connaissances ──────────────────────────────────────────────
async function chargerBase() {
    const lire = async nom => {
        const reponse = await fetch(DONNEES + nom);
        if (!reponse.ok) throw new Error(`${nom} : ${reponse.status}`);
        return reponse.json();
    };
    const [parametres, regles, materiel, symptomes, challenges, usercfg] = await Promise.all(
        ['parametres.json', 'regles.json', 'materiel.json', 'symptomes.json', 'challenges.json', 'usercfg.json'].map(lire)
    );
    return {
        parametres: parametres.parametres, regles: regles.regles, materiel,
        symptomes: symptomes.symptomes, challenges: challenges.challenges, correspondances: usercfg.correspondances
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

// Import de UserCfg.opt : seules les valeurs utiles sont gardées (champ caché, mémorisé avec le reste).
// Simulateur, carte graphique et définition sont remplis s'ils sont vides ; rien de saisi n'est écrasé.
function blocUserCfg(base) {
    const memoire = el('input', { type: 'hidden', name: 'usercfg', id: 'champ-usercfg' });
    const resume = el('p', { class: 'aide', id: 'resume-usercfg', 'aria-live': 'polite' });
    const importer = el('button', { type: 'button', class: 'btn btn-secondaire' }, T.importerUsercfg);
    const oublier = el('button', { type: 'button', class: 'btn btn-secondaire', id: 'oublier-usercfg', hidden: true }, T.oublierUsercfg);

    importer.addEventListener('click', async () => {
        const contenu = await choisirFichierTexte('.opt,text/plain');
        if (contenu === null) return;
        const lu = lireUserCfg(contenu, base.correspondances, base.parametres);
        if (lu.erreur) {
            resume.textContent = T.erreurUsercfg;
            return;
        }
        const formulaire = memoire.form;
        const choisi = formulaire.querySelector('input[name=simulateur]:checked');
        if (!choisi && lu.simulateur) formulaire.querySelector(`input[name=simulateur][value="${lu.simulateur}"]`).checked = true;
        const gpu = document.getElementById('champ-gpu');
        if (!gpu.value && lu.carte) gpu.value = lu.carte;
        const resolution = document.getElementById('champ-resolution');
        if (!resolution.value && [...resolution.options].some(o => o.value === lu.resolution)) resolution.value = lu.resolution;
        memoire.value = JSON.stringify(lu);
        formulaire.dispatchEvent(new Event('input', { bubbles: true }));
    });
    oublier.addEventListener('click', () => {
        memoire.value = '';
        memoire.form.dispatchEvent(new Event('input', { bubbles: true }));
    });

    return el('div', { class: 'bloc-capture' },
        el('p', { class: 'sous-titre' }, T.usercfgTitre),
        el('p', { class: 'aide' }, T.usercfgAide),
        el('div', { class: 'actions' }, importer, oublier),
        resume, memoire);
}

// La valeur du champ « FPS réels » est-elle celle posée par la capture mémorisée ?
function vientDeLaCapture(valeurChamp, captureMemorisee) {
    const capture = lireJsonMemorise(captureMemorisee);
    return capture !== null && nb(valeurChamp) === capture.fpsMoyen;
}

const lireJsonMemorise = valeur => {
    try {
        return valeur ? JSON.parse(valeur) : null;
    } catch (e) {
        return null;
    }
};

// Pastille numérotée (1 à 7) qui relie une ligne du schéma de l'affichage FPS au champ correspondant.
// Chiffre simple dans un cercle dessiné en CSS : les caractères « ① » sont mal centrés selon la police.
const numero = n => el('span', { class: 'numero', 'aria-hidden': 'true' }, String(n));

// Réplique simplifiée de l'affichage FPS du mode développeur, d'après une capture réelle de
// MSFS 2020 (forum AvroBB, sujet 15). Lignes numérotées : celles que l'atelier utilise.
function schemaAffichage() {
    const lignes = [
        [1, '20.2', 'gros'], [null, '49.93 ms'], [2, 'SDR NoVSync'], [null, 'Screen 3440x1417', 'gris'],
        [3, 'Limited by MainThread', 'alerte'], [4, 'MainThread      41.1 ms', 'alerte'], [5, 'RdrThread        4.8 ms'],
        [null, 'Manipulators    12.3 ms', 'gris'], [null, 'CoherentGTDraw   1.9 ms', 'gris'], [6, 'GPU   14.0 ms   med=14.1'],
        [null, 'CPU Mem: 14.581GB/31.918GB', 'gris'], [7, 'GPU Mem: 6.869GB/14.926GB']
    ];
    return el('figure', { class: 'schema-fps' },
        el('p', { class: 'sous-titre' }, T.schemaTitre),
        el('div', { class: 'ecran-fps' }, lignes.map(([n, texte, classe]) =>
            el('div', { class: `ligne-fps ${classe ?? ''}` }, n ? numero(n) : el('span', { class: 'numero vide', 'aria-hidden': 'true' }), el('code', {}, texte)))),
        el('figcaption', { class: 'aide' }, T.schemaLegende));
}

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
        el('legend', { class: 'sr-only' }, T.configuration),
        blocUserCfg(base),
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
                    ['', '1920×1080', '2560×1440', '3440×1440', '3840×2160', '5120×1440'].map(v => el('option', { value: v }, v || '—')))
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

    // Champs dans l'ordre de l'affichage, chacun avec le numéro de sa ligne sur le schéma
    const memoireVideo = champ('gpuMem', [numero(7), ' ', T.gpuMem], { aide: T.gpuMemAide });
    memoireVideo.append(el('p', { class: 'aide conseil', id: 'gpu-mem-lu', 'aria-live': 'polite' }));
    const mesures = el('fieldset', { class: 'etape' },
        el('legend', { class: 'sr-only' }, T.mesures),
        el('p', {}, T.mesuresIntro),
        schemaAffichage(),
        aide,
        champ('fpsReels', [numero(1), ' ', T.fpsReels], { type: 'number', min: 1, step: 'any', aide: T.fpsReelsAide }),
        choix('synchroAffichee', [numero(2), ' ', T.synchroAffichee], [['novsync', T.synchroNoVsync], ['vsync', T.synchroVsync], ['', T.synchroNsp]]),
        choix('limite', [numero(3), ' ', T.limite], [['main-thread', T.limiteMain], ['rendu', T.limiteRendu], ['gpu', T.limiteGpu], ['', T.limiteNsp]]),
        el('div', { class: 'grille' },
            champ('msPrincipal', [numero(4), ' ', T.msPrincipal], { type: 'number', min: 0, step: 'any' }),
            champ('msRendu', [numero(5), ' ', T.msRendu], { type: 'number', min: 0, step: 'any' }),
            champ('msGpu', [numero(6), ' ', T.msGpu], { type: 'number', min: 0, step: 'any' }),
            memoireVideo,
            champ('verrouFps', T.verrou, { type: 'number', min: 1, step: 'any', aide: T.verrouAide })
        ),
        blocCapture()
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

    // Les étapes 1 à 3 sont des panneaux du même formulaire : ses réponses sont mémorisées d'un bloc
    const panneau = (id, titre, ...contenu) => el('div', { class: 'panneau', id: `panneau-${id}` }, el('h2', {}, titre), ...contenu);
    const panneaux = {
        configuration: panneau('configuration', T.etapes.configuration, el('p', { class: 'intro' }, T.intro), configuration,
            el('div', { class: 'actions' },
                el('button', { type: 'button', class: 'btn btn-secondaire', id: 'sauvegarder' }, T.sauvegarder),
                el('button', { type: 'button', class: 'btn btn-secondaire', id: 'restaurer' }, T.restaurer),
                el('button', { type: 'button', class: 'btn btn-secondaire', id: 'effacer' }, T.effacer)),
            el('p', { class: 'aide' }, T.sauvegardeAide),
            el('p', { class: 'erreur', id: 'erreur-sauvegarde', role: 'alert', hidden: true })),
        mesures: panneau('mesures', T.etapes.mesures, mesures),
        constats: panneau('constats', T.etapes.constats, symptomes, changements)
    };
    const formulaire = el('form', { id: 'formulaire', novalidate: true }, Object.values(panneaux));
    return { formulaire, panneaux };
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
            // Ligne « GPU Mem » recopiée ; ancien champ numérique repris pour les réponses mémorisées
            vramUtiliseeGo: lireMemoireVideo(v.gpuMem)?.utiliseeGo ?? nb(v.vramUtiliseeGo),
            vramTotaleGo: lireMemoireVideo(v.gpuMem)?.totaleGo ?? null,
            synchroAffichee: v.synchroAffichee || null,
            fpsReels: nb(v.fpsReels),
            verrouFps: nb(v.verrouFps),
            capture: lireJsonMemorise(v.capture)
        },
        usercfg: lireJsonMemorise(v.usercfg),
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

// Valeur lue dans UserCfg.opt pour un réglage, mise en forme (libellé traduit, ou nombre)
function valeurChezVous(usercfg, id) {
    const v = usercfg?.valeurs?.[id];
    if (!v) return '—';
    if (v.libelle) return T.libellesValeurs[v.libelle] ?? v.libelle;
    return typeof v.valeur === 'number' ? nombre(v.valeur) : v.valeur;
}

// Impact d'un réglage en clair : « fort », « nul »… plutôt qu'un chiffre de 0 à 3
const impactClair = l => el('ul', { class: 'impacts' },
    el('li', {}, T.impact(T.impactCpu, T.impactNiveaux[l.impact.cpu])),
    el('li', {}, T.impact(T.impactGpu, T.impactNiveaux[l.impact.gpu])),
    el('li', {}, T.impact(T.impactVram, T.impactNiveaux[l.impact.vram]))
);

// Fiche d'un réglage prioritaire : tout ce qu'il faut pour l'essayer, sur une colonne
function ficheReglage(l, usercfg) {
    const chezVous = usercfg ? valeurChezVous(usercfg, l.id) : '—';
    return el('article', { class: 'fiche' },
        el('h3', {}, tr(l.libelle), ' ', badgeStatut(l.statut)),
        el('dl', {},
            chezVous !== '—' && [el('dt', {}, T.colChezVous), el('dd', { class: 'chez-vous' }, chezVous)],
            el('dt', {}, T.colDepart), el('dd', {}, el('strong', {}, tr(l.depart))),
            el('dt', {}, T.colTest), el('dd', {}, tr(l.test)),
            el('dt', {}, T.colCout), el('dd', {}, tr(l.coutVisuel)),
            el('dt', {}, T.colImpact), el('dd', {}, impactClair(l))),
        listeSources(l.sources));
}

function blocTableau(r, usercfg) {
    // Colonne « Chez vous » seulement si un UserCfg.opt du même simulateur a été importé
    const avecUsercfg = usercfg !== null && Object.keys(usercfg.valeurs ?? {}).length > 0;
    const connu = r.diagnostic.goulot !== 'indetermine';
    // Goulot connu : les trois réglages qui pèsent le plus dessus, en fiches ; les autres repliés
    const prioritaires = connu ? r.tableau.slice(0, 3) : [];
    const autres = connu ? r.tableau.slice(3) : r.tableau;
    const tableau = lignes => el('table', { class: 'tableau' },
            el('thead', {}, el('tr', {},
                [T.colReglage, avecUsercfg && T.colChezVous, T.colImpact, T.colDepart, T.colCout, T.colTest]
                    .filter(Boolean).map(t => el('th', { scope: 'col' }, t)))),
            el('tbody', {}, lignes.map(l => el('tr', {},
                el('th', { scope: 'row', 'data-label': T.colReglage }, tr(l.libelle), ' ', badgeStatut(l.statut), listeSources(l.sources)),
                avecUsercfg && el('td', { 'data-label': T.colChezVous, class: 'chez-vous' }, valeurChezVous(usercfg, l.id)),
                el('td', { 'data-label': T.colImpact }, impactClair(l)),
                el('td', { 'data-label': T.colDepart }, tr(l.depart)),
                el('td', { 'data-label': T.colCout }, tr(l.coutVisuel)),
                el('td', { 'data-label': T.colTest }, tr(l.test))
            )))
        );
    // Le titre et l'introduction sont ceux de l'étape « Réglages »
    return el('div', {},
        connu
            ? [el('h3', {}, T.prioritaires), el('p', { class: 'aide' }, T.prioritairesAide),
                el('div', { class: 'fiches' }, prioritaires.map(l => ficheReglage(l, avecUsercfg ? usercfg : null))),
                el('details', { class: 'autres-reglages' }, el('summary', {}, T.autresReglages(autres.length)), tableau(autres))]
            : [el('p', { class: 'avertissement' }, T.prioritairesIndetermine), tableau(autres)]
    );
}

// Une question du challenge : choix radio, puis explication du choix fait (et de la réponse attendue)
function questionChallenge({ challenge, changement = null }, nom, base) {
    const parametre = changement && base.parametres.find(p => p.id === changement.id);
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
        changement && el('p', { class: 'aide' }, T.challengeVotreChangement(tr(parametre?.libelle) || changement.id,
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
    let changements;
    if (saisie.changements.length === 0) {
        changements = el('p', {}, T.challengeAucunChangement, ' ', el('a', { href: '#constats' }, T.allerConstats));
    } else if (r.challenge.length === 0) {
        changements = el('p', {}, T.challengeAucuneQuestion);
    } else {
        changements = r.challenge.map((q, i) => questionChallenge(q, `challenge-${i}`, base));
    }
    return el('div', {},
        r.quiz.length > 0 && [el('h3', {}, T.quizTitre), r.quiz.map((c, i) => questionChallenge({ challenge: c }, `quiz-${i}`, base))],
        el('h3', {}, T.changementsTitre),
        changements);
}

// « Conserver ces résultats » : rapport sur une colonne, à imprimer, copier ou télécharger
function blocConserver(saisie, r, base) {
    const statut = el('p', { class: 'statut', role: 'status' });
    const bouton = (texte, action) => {
        const b = el('button', { type: 'button', class: 'btn btn-secondaire' }, texte);
        b.addEventListener('click', action);
        return b;
    };
    const rapport = () => construireRapport(saisie, r, base);
    return el('section', { class: 'conserver', 'aria-label': T.conserverTitre },
        el('h3', {}, T.conserverTitre),
        el('p', { class: 'aide' }, T.conserverAide),
        el('div', { class: 'actions' },
            bouton(T.imprimer, () => imprimerRapport(rapport())),
            bouton(T.copierRapport, async () => {
                statut.textContent = (await copierRapport(rapport())) ? T.rapportCopie : T.rapportCopieErreur;
            }),
            bouton(T.telechargerRapport, () => telechargerRapport(rapport()))),
        statut);
}

// Contenu des étapes de résultats (4 à 6, et 8), recalculé à chaque entrée dans l'une d'elles
function afficherResultats(zones, saisie, base) {
    const profil = saisie.profil;
    if (!profil.simulateur || !profil.frequenceHz) {
        // Il manque l'essentiel : chaque étape renvoie vers l'étape 1
        for (const zone of Object.values(zones)) {
            zone.replaceChildren(el('p', { class: 'avertissement' }, T.resultatsManquants, ' ',
                el('a', { href: '#configuration' }, T.allerConfiguration)));
        }
        return;
    }
    const r = analyser(saisie, base);
    zones.diagnostic.replaceChildren(
        el('div', { class: 'cartes' }, blocDiagnostic(r), blocCadence(r, profil), blocGeneration(r)),
        blocMessages(r),
        blocConserver(saisie, r, base));
    zones.reglages.replaceChildren(
        blocTableau(r, saisie.usercfg && saisie.usercfg.simulateur === profil.simulateur ? saisie.usercfg : null),
        blocConserver(saisie, r, base));
    zones.challenge.replaceChildren(blocChallenge(r, saisie, base));
    zones.ia.replaceChildren(blocIa(saisie, r, base));
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

    const { formulaire, panneaux } = construireFormulaire(base);

    // Étapes de résultats : un titre fixe et une zone remplie par afficherResultats()
    const zones = {};
    const panneauResultat = (id, intro) => {
        zones[id] = el('div', { class: 'zone-resultat' });
        return el('section', { class: 'panneau', id: `panneau-${id}` }, el('h2', {}, T.etapes[id]), intro && el('p', { class: 'intro' }, intro), zones[id]);
    };
    const diagnostic = panneauResultat('diagnostic', T.diagnosticIntro);
    const reglages = panneauResultat('reglages', T.tableauIntro);
    const challenge = panneauResultat('challenge', T.challengeIntro);
    const ia = panneauResultat('ia');
    const journal = el('section', { class: 'panneau journal-section', id: 'panneau-journal' });

    const rafraichir = () => afficherResultats(zones, versSaisie(valeursBrutes(formulaire), base), base);
    const parcours = creerParcours({ etapes: [
        { id: 'configuration', titre: T.etapes.configuration, panneau: panneaux.configuration },
        { id: 'mesures', titre: T.etapes.mesures, panneau: panneaux.mesures },
        { id: 'constats', titre: T.etapes.constats, panneau: panneaux.constats },
        { id: 'diagnostic', titre: T.etapes.diagnostic, panneau: diagnostic, entree: rafraichir },
        { id: 'reglages', titre: T.etapes.reglages, panneau: reglages, entree: rafraichir },
        { id: 'challenge', titre: T.etapes.challenge, panneau: challenge, entree: rafraichir },
        { id: 'journal', titre: T.etapes.journal, panneau: journal },
        { id: 'ia', titre: T.etapes.ia, panneau: ia, entree: rafraichir }
    ] });
    racine.replaceChildren(parcours.nav, formulaire, diagnostic, reglages, challenge, journal, ia, parcours.barre);

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
        // Ce que l'atelier a compris de la ligne « GPU Mem »
        const memoire = lireMemoireVideo(v.gpuMem);
        document.getElementById('gpu-mem-lu').textContent = !v.gpuMem ? ''
            : memoire ? T.gpuMemLu(nombre(memoire.utiliseeGo), memoire.totaleGo && nombre(memoire.totaleGo)) : T.gpuMemIllisible;
        // Résumé de la capture importée, s'il y en a une
        const capture = lireJsonMemorise(v.capture);
        const resume = document.getElementById('resume-capture');
        if (capture) resume.textContent = T.resumeCapture(capture);
        else if (resume.textContent !== T.erreurCapture) resume.textContent = '';
        document.getElementById('oublier-capture').hidden = !capture;
        // Résumé du UserCfg.opt importé, et avertissement s'il vient de l'autre simulateur
        const usercfg = lireJsonMemorise(v.usercfg);
        const resumeUsercfg = document.getElementById('resume-usercfg');
        if (usercfg) {
            resumeUsercfg.textContent = T.resumeUsercfg(usercfg)
                + (v.simulateur && usercfg.simulateur && usercfg.simulateur !== v.simulateur ? ' ' + T.usercfgAutreSimulateur(usercfg.simulateur) : '');
        } else if (resumeUsercfg.textContent !== T.erreurUsercfg) {
            resumeUsercfg.textContent = '';
        }
        document.getElementById('oublier-usercfg').hidden = !usercfg;
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

    // Entrée dans un champ texte ou nombre : étape suivante. Le formulaire n'a pas de bouton
    // d'envoi, le navigateur ne le ferait donc pas de lui-même.
    formulaire.addEventListener('submit', e => e.preventDefault());
    formulaire.addEventListener('keydown', function etapeSuivante(e) {
        if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement) || !['text', 'number', 'password'].includes(e.target.type)) return;
        e.preventDefault();
        const ordre = ['configuration', 'mesures', 'constats', 'diagnostic'];
        location.hash = ordre[Math.min(ordre.indexOf(parcours.courante) + 1, ordre.length - 1)];
    });

    document.getElementById('effacer').addEventListener('click', function toutEffacer() {
        if (!window.confirm(T.effacerConfirmer)) return;
        stockage.effacer();
        formulaire.reset();
        majDependances();
        majJournal();
    });

    // Contexte joint au formulaire « J'ai un retour » (retour.js) : simulateur et étape courante,
    // pour trier les messages sur le forum. Rien d'autre (ni mesures, ni configuration).
    window.contexteRetour = function contexteRetour() {
        return { simulateur: valeursBrutes(formulaire).simulateur ?? '', etape: parcours.courante ?? '' };
    };

    // Sauvegarde complète : réponses mémorisées et journal, dans un seul fichier
    document.getElementById('sauvegarder').addEventListener('click', function sauvegarder() {
        const reponses = { ...(stockage.lire() ?? {}), ...valeursBrutes(formulaire) };
        telecharger(versSauvegarde(reponses, stockage.lireJournal()), `${T.nomSauvegarde}-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    });
    document.getElementById('restaurer').addEventListener('click', async function restaurer() {
        const erreur = document.getElementById('erreur-sauvegarde');
        const contenu = await choisirFichierTexte('.json,application/json');
        if (contenu === null) return;
        const lu = lireSauvegarde(contenu);
        if (lu.erreur) {
            erreur.textContent = T.sauvegardeErreur;
            erreur.hidden = false;
            return;
        }
        if (!window.confirm(T.restaurerConfirmer)) return;
        if (lu.reponses) stockage.ecrire(lu.reponses);
        stockage.ecrireJournal(journalRestaure(stockage.lireJournal(), lu.journal));
        // Rechargement : formulaire, journal et résultats repartent des données restaurées
        location.reload();
    });

    parcours.demarrer();
}

demarrer();
