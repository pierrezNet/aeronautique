// Interface de l'Atelier réglages : construit le formulaire, mémorise les réponses sur l'appareil,
// appelle le moteur (moteur/analyser.js) et affiche les résultats. Seul fichier qui touche à la page.

import { analyser } from './moteur/analyser.js';
import { familleGpu } from './moteur/materiel.js';
import { T, langue, nombre, tr } from './textes.js';
import * as stockage from './stockage.js';

const racine = document.getElementById('atelier');
const DONNEES = '/reglages/donnees/';

// ── Petit utilitaire de construction du DOM ─────────────────────────────────────────────
// el('p', { class: 'aide' }, 'texte', autreElement) : crée un élément, ses attributs et ses enfants.
// Les textes passent par createTextNode : aucun risque d'injection HTML.
function el(balise, attributs = {}, ...enfants) {
    const noeud = document.createElement(balise);
    for (const [nom, valeur] of Object.entries(attributs)) {
        if (valeur === false || valeur === null || valeur === undefined) continue;
        noeud.setAttribute(nom, valeur === true ? '' : String(valeur));
    }
    for (const enfant of enfants.flat()) {
        if (enfant === null || enfant === undefined || enfant === false) continue;
        noeud.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
    }
    return noeud;
}

// ── Chargement de la base de connaissances ──────────────────────────────────────────────
async function chargerBase() {
    const lire = async nom => {
        const reponse = await fetch(DONNEES + nom);
        if (!reponse.ok) throw new Error(`${nom} : ${reponse.status}`);
        return reponse.json();
    };
    const [parametres, regles, materiel, symptomes] = await Promise.all(
        ['parametres.json', 'regles.json', 'materiel.json', 'symptomes.json'].map(lire)
    );
    return { parametres: parametres.parametres, regles: regles.regles, materiel, symptomes: symptomes.symptomes };
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

    return el('form', { id: 'formulaire', novalidate: true },
        configuration, mesures, symptomes,
        el('p', { class: 'erreur', id: 'erreur-formulaire', role: 'alert', hidden: true }),
        el('div', { class: 'actions' },
            el('button', { type: 'submit', class: 'btn' }, T.analyser),
            el('button', { type: 'button', class: 'btn btn-secondaire', id: 'effacer' }, T.effacer)
        )
    );
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
function versSaisie(v) {
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
            verrouFps: nb(v.verrouFps)
        },
        symptomes: v.symptomes ?? [],
        changements: []
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

function afficherResultats(zone, r, profil, donnerFocus = true) {
    const titre = el('h2', { id: 'titre-resultats', tabindex: '-1' }, T.resultats);
    zone.replaceChildren(
        titre,
        el('div', { class: 'cartes' }, blocDiagnostic(r), blocCadence(r, profil), blocGeneration(r)),
        blocMessages(r),
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
    racine.replaceChildren(el('p', { class: 'intro' }, T.intro), formulaire, resultats);

    // Champs qui dépendent d'autres réponses (DirectX en 2020, carte non reconnue, réalité virtuelle)
    const majDependances = () => {
        const v = valeursBrutes(formulaire);
        document.getElementById('bloc-directx').hidden = v.simulateur !== '2020';
        document.getElementById('gpu-inconnu').hidden = !v.gpu || familleGpu(v.gpu, base.materiel) !== null;
        document.getElementById('vr-avertissement').hidden = v.affichage !== 'vr';
    };

    const memorise = stockage.lire();
    if (memorise) restaurer(formulaire, memorise);
    majDependances();

    formulaire.addEventListener('input', function memoriser() {
        majDependances();
        stockage.ecrire(valeursBrutes(formulaire));
    });

    formulaire.addEventListener('submit', function lancerAnalyse(e) {
        e.preventDefault();
        const saisie = versSaisie(valeursBrutes(formulaire));
        const erreur = document.getElementById('erreur-formulaire');
        if (!saisie.profil.simulateur || !saisie.profil.frequenceHz) {
            erreur.textContent = T.champsManquants;
            erreur.hidden = false;
            return;
        }
        erreur.hidden = true;
        afficherResultats(resultats, analyser(saisie, base), saisie.profil);
    });

    document.getElementById('effacer').addEventListener('click', function toutEffacer() {
        if (!window.confirm(T.effacerConfirmer)) return;
        stockage.effacer();
        formulaire.reset();
        resultats.hidden = true;
        majDependances();
    });

    // Réponses déjà complètes : résultats affichés d'emblée, sans voler le focus
    if (memorise?.simulateur && nb(memorise.frequenceHz)) {
        const saisie = versSaisie(memorise);
        afficherResultats(resultats, analyser(saisie, base), saisie.profil, false);
    }
}

demarrer();
