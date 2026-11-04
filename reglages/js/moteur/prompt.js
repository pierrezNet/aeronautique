// Texte « prompt » à donner à une IA (copié, ou envoyé avec la clé de l'utilisateur).
// Il reprend le profil, les mesures, le diagnostic, les règles affichées et les derniers essais du
// journal, et demande à l'IA de rester prudente. Fonction pure : la langue et les textes de la base
// sont passés en paramètres. Rien d'identifiant n'y figure (pas de clé, pas de chemin de fichier).

const INSTRUCTIONS = {
    fr: [
        'Tu aides un utilisateur de Microsoft Flight Simulator à comprendre et régler ses paramètres graphiques.',
        'Appuie-toi sur le diagnostic ci-dessous ; si tu le contredis, explique pourquoi.',
        'Propose au plus trois changements, un à la fois, du plus utile au moins utile, avec pour chacun le test qui permettra de vérifier son effet.',
        'Distingue ce qui est établi de ce qui est incertain, et ne présente pas comme un fait ce que tu supposes.',
        'Rappelle que la génération d\'images augmente les images affichées, pas la simulation.',
        'Réponds en français, sans jargon non expliqué.'
    ],
    en: [
        'You help a Microsoft Flight Simulator user understand and tune their graphics settings.',
        'Build on the diagnosis below; if you disagree with it, explain why.',
        'Suggest at most three changes, one at a time, from most to least useful, each with the test that will check its effect.',
        'Separate what is established from what is uncertain, and do not present assumptions as facts.',
        'Remember that Frame Generation raises displayed frames, not the simulation.',
        'Answer in English, without unexplained jargon.'
    ]
};

const TITRES = {
    fr: { profil: 'Configuration', mesures: 'Mesures', reglages: 'Réglages actuels (UserCfg.opt)', symptomes: 'Symptômes', changements: 'Réglages déjà changés', diagnostic: 'Diagnostic de l\'outil', messages: 'Explications de l\'outil', journal: 'Derniers essais du journal', question: 'Ma question' },
    en: { profil: 'Setup', mesures: 'Measurements', reglages: 'Current settings (UserCfg.opt)', symptomes: 'Symptoms', changements: 'Settings already changed', diagnostic: 'Tool diagnosis', messages: 'Tool explanations', journal: 'Latest journal tests', question: 'My question' }
};

// Noms des champs dans la langue du prompt
const CHAMPS = {
    fr: { simulateur: 'Simulateur', gpu: 'Carte graphique', vram: 'Mémoire vidéo (Go)', cpu: 'Processeur', ram: 'Mémoire vive (Go)', definition: 'Définition', frequence: 'Fréquence de l\'écran (Hz)', vrr: 'Fréquence variable (VRR)', affichage: 'Affichage', avion: 'Avion', limite: 'Limite affichée par le simulateur', msPrincipal: 'Thread principal (ms)', msRendu: 'Thread de rendu (ms)', msGpu: 'Carte graphique (ms)', vramUtilisee: 'Mémoire vidéo utilisée (Go)', fpsReels: 'FPS réels (sans génération d\'images ni limite)', verrou: 'Limite d\'images actuelle', capture: 'Capture PresentMon', goulot: 'Goulot', fil: 'Fil limitant', confiance: 'Confiance', sousMultiples: 'Sous-multiples de la fréquence', cible: 'Cible FPS conseillée', generation: 'Génération d\'images', oui: 'oui', non: 'non', reference: 'mesure de référence', generationActive: 'génération d\'images active', unPourcent: '1 % bas', gpuOccupe: 'carte graphique occupée', synchro: 'synchro verticale', aVerifier: '[à vérifier]', baisse: 'baissé ou désactivé', hausse: 'augmenté ou activé' },
    en: { simulateur: 'Simulator', gpu: 'Graphics card', vram: 'Video memory (GB)', cpu: 'Processor', ram: 'System memory (GB)', definition: 'Resolution', frequence: 'Display refresh rate (Hz)', vrr: 'Variable refresh (VRR)', affichage: 'Display', avion: 'Aircraft', limite: 'Limit shown by the simulator', msPrincipal: 'Main thread (ms)', msRendu: 'Render thread (ms)', msGpu: 'Graphics card (ms)', vramUtilisee: 'Video memory in use (GB)', fpsReels: 'Real FPS (without Frame Generation or limit)', verrou: 'Current frame limit', capture: 'PresentMon capture', goulot: 'Bottleneck', fil: 'Limiting thread', confiance: 'Confidence', sousMultiples: 'Refresh rate divisors', cible: 'Suggested FPS target', generation: 'Frame Generation', oui: 'yes', non: 'no', reference: 'reference measurement', generationActive: 'Frame Generation on', unPourcent: '1% low', gpuOccupe: 'graphics card busy', synchro: 'vertical sync', aVerifier: '[to be checked]', baisse: 'lowered or turned off', hausse: 'raised or turned on' }
};

const ligne = (cle, valeur) => (valeur === null || valeur === undefined || valeur === '' ? null : `- ${cle} : ${valeur}`);

/**
 * @param {object} p
 * @param {'fr'|'en'} p.langue
 * @param {object} p.saisie     saisie passée au moteur (profil, mesures, symptomes, changements, usercfg)
 * @param {object} p.resultat   résultat de analyser()
 * @param {object} p.base       base de connaissances (pour les libellés)
 * @param {object[]} [p.journal] entrées du journal (les 5 dernières du même simulateur sont reprises)
 * @param {string} [p.question] question libre de l'utilisateur
 */
export function construirePrompt({ langue = 'fr', saisie, resultat, base, journal = [], question = '' }) {
    const t = texte => (texte ? texte[langue] ?? texte.fr : '');
    const T = TITRES[langue];
    const C = CHAMPS[langue];
    const libelle = id => t(base.parametres.find(p => p.id === id)?.libelle) || id;
    const { profil, mesures } = saisie;
    const blocs = [INSTRUCTIONS[langue].join('\n')];
    const section = (titre, lignes) => {
        const utiles = lignes.filter(Boolean);
        if (utiles.length) blocs.push(`## ${titre}\n${utiles.join('\n')}`);
    };

    section(T.profil, [
        ligne(C.simulateur, profil.simulateur && `MSFS ${profil.simulateur}`),
        ligne('DirectX', profil.directx),
        ligne(C.gpu, profil.gpu),
        ligne(C.vram, profil.vramGo),
        ligne(C.cpu, profil.cpu),
        ligne(C.ram, profil.ramGo),
        ligne(C.definition, profil.resolution),
        ligne(C.frequence, profil.frequenceHz),
        ligne(C.vrr, profil.vrrInconnu ? '?' : profil.vrr ? C.oui : C.non),
        ligne(C.affichage, profil.affichage),
        ligne(C.avion, profil.avion)
    ]);

    const c = mesures.capture;
    section(T.mesures, [
        ligne(C.limite, mesures.limite),
        ligne(C.msPrincipal, mesures.msPrincipal),
        ligne(C.msRendu, mesures.msRendu),
        ligne(C.msGpu, mesures.msGpu),
        ligne(C.vramUtilisee, mesures.vramUtiliseeGo),
        ligne(C.fpsReels, mesures.fpsReels),
        ligne(C.verrou, mesures.verrouFps),
        c && ligne(C.capture, `${c.fpsMoyen} FPS, ${C.unPourcent} ${c.unPourcentBas}, ${C.gpuOccupe} ${c.partGpu === null ? '?' : Math.round(c.partGpu * 100) + ' %'}${c.synchro ? `, ${C.synchro}` : ''}`)
    ]);

    const u = saisie.usercfg;
    if (u && u.simulateur === profil.simulateur) {
        section(T.reglages, Object.entries(u.valeurs).map(([id, v]) => ligne(libelle(id), v.libelle ?? v.valeur)));
    }

    section(T.symptomes, saisie.symptomes.map(id => `- ${t(base.symptomes.find(s => s.id === id)?.libelle) || id}`));
    section(T.changements, saisie.changements.map(ch => `- ${libelle(ch.id)} : ${C[ch.sens] ?? ch.sens}`));

    const d = resultat.diagnostic;
    section(T.diagnostic, [
        ligne(C.goulot, d.goulot),
        ligne(C.fil, d.fil),
        ligne(C.confiance, d.confiance),
        resultat.cadence.valide && ligne(C.sousMultiples, resultat.cadence.cibles.map(x => x.fps).join(', ')),
        resultat.cadence.cibleConseillee && ligne(C.cible, resultat.cadence.cibleConseillee.fps),
        ligne(C.generation, resultat.generation.avis)
    ]);

    // Les règles portent leur statut : l'IA sait ce qui n'est pas confirmé
    section(T.messages, resultat.messages.map(m => `- ${t(m.message)}${m.statut === 'verifie' ? '' : ` ${C.aVerifier}`}`));

    const essais = journal.filter(e => e.simulateur === profil.simulateur).slice(-5);
    section(T.journal, essais.map(e => `- ${e.reglage.id ? `${libelle(e.reglage.id)} ${e.reglage.avant} → ${e.reglage.apres}` : C.reference} : ${e.fpsMoyen} FPS${e.unPourcentBas !== null ? `, ${C.unPourcent} ${e.unPourcentBas}` : ''}${e.generationActive ? `, ${C.generationActive}` : ''} (${e.scenario.aeroport || '?'}, ${e.scenario.meteo || '?'})`));

    if (question.trim()) blocs.push(`## ${T.question}\n${question.trim()}`);
    return blocs.join('\n\n');
}
