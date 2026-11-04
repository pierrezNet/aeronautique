// Textes de l'interface, en français et en anglais. La langue est celle de la page (<html lang>).
// Les textes de la base de connaissances (donnees/*.json) portent leurs propres { fr, en }.

export const langue = document.documentElement.lang === 'en' ? 'en' : 'fr';

const TEXTES = {
    fr: {
        chargement: 'Chargement de la base de connaissances…',
        erreurChargement: 'Impossible de charger la base de connaissances. Rechargez la page.',
        intro: 'Tout reste dans votre navigateur : rien n\'est envoyé. Vos réponses sont gardées sur cet appareil pour la prochaine visite.',

        // 1. Configuration
        configuration: '1. Votre configuration',
        simulateur: 'Simulateur',
        directx: 'Version de DirectX (MSFS 2020)',
        gpu: 'Carte graphique',
        gpuAide: 'Le modèle, par exemple « RTX 5060 Ti » ou « RX 7800 XT ».',
        gpuInconnu: 'Modèle non reconnu : les conseils sur le DLSS et la génération d\'images seront limités.',
        vram: 'Mémoire vidéo de la carte (Go)',
        vramAide: 'Certains modèles existent en plusieurs versions (RTX 5060 Ti : 8 ou 16 Go). Elle figure dans le Gestionnaire des tâches, onglet Performances, GPU.',
        cpu: 'Processeur (facultatif)',
        ram: 'Mémoire vive (Go, facultatif)',
        resolution: 'Définition de l\'écran',
        frequence: 'Fréquence de l\'écran (Hz)',
        frequenceAide: 'Par exemple 60, 144 ou 165. Dans Windows : Paramètres, Affichage, Affichage avancé.',
        vrr: 'Fréquence variable (G-Sync, FreeSync) active ?',
        vrrAide: 'Si vous ne savez pas, répondez « Je ne sais pas » : l\'outil expliquera les deux cas.',
        oui: 'Oui', non: 'Non', nsp: 'Je ne sais pas',
        affichage: 'Affichage',
        moniteur: 'Écran', vr: 'Casque de réalité virtuelle',
        vrAvertissement: 'La réalité virtuelle a ses propres réglages et contraintes de cadence, pas encore couverts : les conseils ci-dessous concernent un écran.',
        avion: 'Avion principal (facultatif)',

        // 2. Mesures
        mesures: '2. Vos mesures (facultatives, mais décisives)',
        mesuresIntro: 'Sans mesure, l\'outil ne peut que deviner ce qui vous limite.',
        aideMesuresTitre: 'Comment lire l\'affichage FPS du simulateur ?',
        aideMesures: [
            'Activez le mode développeur dans les options générales du simulateur.',
            'Dans la barre du mode développeur, ouvrez Debug puis cochez Display FPS.',
            'Volez dans une situation habituelle et notez ce que l\'affichage indique comme limite (par exemple « Limited by MainThread » ou « Limited by GPU »), et les temps en millisecondes.',
            'Les libellés exacts peuvent varier selon la version : ils sont relevés sur les forums, pas dans une documentation officielle.'
        ],
        limite: 'Ce qui limite, selon l\'affichage',
        limiteMain: 'Thread principal (MainThread)',
        limiteRendu: 'Thread de rendu (RdrThread)',
        limiteGpu: 'Carte graphique (GPU)',
        limiteNsp: 'Je n\'ai pas regardé',
        msPrincipal: 'Temps du thread principal (ms)',
        msRendu: 'Temps du thread de rendu (ms)',
        msGpu: 'Temps de la carte graphique (ms)',
        vramUtilisee: 'Mémoire vidéo utilisée (Go)',
        fpsReels: 'FPS réels, sans génération d\'images ni limite',
        fpsReelsAide: 'Mesurez sans verrou ni génération d\'images : sinon on mesure le verrou, pas la machine.',
        verrou: 'Limite d\'images actuelle (FPS, si vous en avez une)',
        verrouAide: 'Panneau NVIDIA, application NVIDIA ou simulateur. Laissez vide s\'il n\'y en a pas.',

        // 3. Symptômes
        symptomes: '3. Ce que vous constatez',

        analyser: 'Analyser',
        effacer: 'Tout effacer',
        effacerConfirmer: 'Effacer toutes vos réponses enregistrées sur cet appareil ?',
        champsManquants: 'Indiquez au moins le simulateur et la fréquence de l\'écran.',

        // Résultats
        resultats: 'Résultats',
        diagnostic: 'Ce qui vous limite',
        goulots: {
            cpu: 'Le processeur',
            gpu: 'La carte graphique',
            vram: 'La mémoire vidéo (pleine)',
            streaming: 'Le chargement des données',
            indetermine: 'Indéterminé'
        },
        fils: { principal: 'thread principal', rendu: 'thread de rendu', gpu: 'carte graphique' },
        confiances: {
            mesure: 'D\'après vos mesures.',
            symptomes: 'D\'après vos symptômes seulement : à confirmer par une mesure.',
            aucune: 'Ni mesure ni symptôme suffisant pour conclure.'
        },
        vramTaux: taux => `Mémoire vidéo utilisée : ${taux} % de la carte.`,

        cadence: 'Cible d\'images par seconde',
        sousMultiples: hz => `Valeurs qui divisent exactement ${hz} Hz :`,
        verrouExact: v => `Votre limite à ${v} FPS divise exactement la fréquence de l'écran.`,
        verrouInexact: (v, voisins) => `Votre limite à ${v} FPS ne divise pas exactement la fréquence de l'écran. Valeurs exactes les plus proches : ${voisins}.`,
        verrouVrr: v => `Votre limite à ${v} FPS ne divise pas la fréquence, mais avec la fréquence variable active, ce n'est pas un problème.`,
        vrrInconnu: 'Vous ne savez pas si la fréquence variable est active : si elle l\'est, n\'importe quelle cible dans sa plage convient ; sinon, choisissez une des valeurs ci-dessus.',
        cibleConseillee: (fps, diviseur) => `Cible conseillée : ${fps} FPS (fréquence ÷ ${diviseur}), la plus haute que vous tenez réellement.`,
        cibleSansMesure: 'Indiquez vos FPS réels (sans limite) pour obtenir une cible conseillée.',
        mesureBloquee: 'Vos FPS mesurés sont égaux à votre limite : c\'est elle qui les bloque. Retirez-la le temps d\'une mesure pour connaître ce que la machine tient vraiment.',

        generation: 'Génération d\'images',
        avisGeneration: {
            'gpu-inconnu': 'Carte graphique non reconnue : impossible de dire si la génération d\'images est disponible.',
            indisponible: 'Votre carte ne propose pas la génération d\'images DLSS (réservée aux RTX 40 et 50).',
            dx11: 'En DirectX 11, la génération d\'images ne serait pas proposée dans MSFS 2020 (prérequis DirectX 12 rapporté par les utilisateurs, à vérifier).',
            'mesure-requise': 'Disponible. Pour savoir si elle vous sera utile, indiquez vos FPS réels sans elle et sans limite.',
            'deconseillee-vram': 'Disponible, mais déconseillée : elle utilise de la mémoire vidéo, déjà pleine chez vous.',
            deconseillee: 'Disponible, mais vos FPS réels sont trop bas : la base irrégulière se verrait davantage.',
            'juste-sous-seuil': 'Disponible, mais vous êtes juste sous le seuil d\'environ 40 FPS réels.',
            possible: 'Disponible, et vos FPS réels sont suffisants pour l\'essayer.'
        },
        multiDisponible: 'Votre carte permet aussi la multi-génération (3X, 4X, dynamique).',

        messages: 'Explications',
        aVerifier: 'À vérifier',
        aVerifierAide: 'Aucune source officielle ou mesure publiée ne confirme encore ce point.',
        sources: 'Sources',
        rang: r => ['', 'officielle', 'NVIDIA', 'mesure publiée', 'forum ou guide'][r],
        gravites: { important: 'Important', attention: 'Attention', info: 'Info' },

        tableau: 'Réglages, du plus utile au moins utile pour votre cas',
        tableauIntro: 'Changez un seul réglage à la fois, puis refaites le même test : c\'est la seule façon de savoir ce qui a agi.',
        colReglage: 'Réglage',
        colImpact: 'Impact (0 à 3)',
        colDepart: 'Point de départ conseillé',
        colCout: 'Ce que vous perdez',
        colTest: 'Comment vérifier',
        impactCpu: 'Processeur', impactGpu: 'Carte graphique', impactVram: 'Mémoire vidéo',
        impact: (axe, valeur) => `${axe} : ${valeur}`,

        noscript: 'Cet outil a besoin de JavaScript.'
    },
    en: {
        chargement: 'Loading the knowledge base…',
        erreurChargement: 'Unable to load the knowledge base. Please reload the page.',
        intro: 'Everything stays in your browser: nothing is sent. Your answers are kept on this device for your next visit.',

        configuration: '1. Your setup',
        simulateur: 'Simulator',
        directx: 'DirectX version (MSFS 2020)',
        gpu: 'Graphics card',
        gpuAide: 'The model, for example “RTX 5060 Ti” or “RX 7800 XT”.',
        gpuInconnu: 'Model not recognised: advice on DLSS and Frame Generation will be limited.',
        vram: 'Graphics card video memory (GB)',
        vramAide: 'Some models come in several versions (RTX 5060 Ti: 8 or 16 GB). It is shown in Task Manager, Performance tab, GPU.',
        cpu: 'Processor (optional)',
        ram: 'System memory (GB, optional)',
        resolution: 'Display resolution',
        frequence: 'Display refresh rate (Hz)',
        frequenceAide: 'For example 60, 144 or 165. In Windows: Settings, Display, Advanced display.',
        vrr: 'Variable refresh (G-Sync, FreeSync) active?',
        vrrAide: 'If unsure, answer “I don\'t know”: the tool will explain both cases.',
        oui: 'Yes', non: 'No', nsp: 'I don\'t know',
        affichage: 'Display',
        moniteur: 'Monitor', vr: 'Virtual reality headset',
        vrAvertissement: 'Virtual reality has its own settings and frame pacing constraints, not covered yet: the advice below applies to a monitor.',
        avion: 'Main aircraft (optional)',

        mesures: '2. Your measurements (optional, but decisive)',
        mesuresIntro: 'Without measurements, the tool can only guess what limits you.',
        aideMesuresTitre: 'How to read the simulator\'s FPS display?',
        aideMesures: [
            'Turn on developer mode in the simulator\'s general options.',
            'In the developer mode bar, open Debug then tick Display FPS.',
            'Fly in a usual situation and note what the display shows as the limit (for example “Limited by MainThread” or “Limited by GPU”), and the times in milliseconds.',
            'Exact labels may vary between versions: they come from forums, not from official documentation.'
        ],
        limite: 'What limits, according to the display',
        limiteMain: 'Main thread (MainThread)',
        limiteRendu: 'Render thread (RdrThread)',
        limiteGpu: 'Graphics card (GPU)',
        limiteNsp: 'I did not check',
        msPrincipal: 'Main thread time (ms)',
        msRendu: 'Render thread time (ms)',
        msGpu: 'Graphics card time (ms)',
        vramUtilisee: 'Video memory in use (GB)',
        fpsReels: 'Real FPS, without Frame Generation or limit',
        fpsReelsAide: 'Measure without a cap or Frame Generation: otherwise you measure the cap, not the machine.',
        verrou: 'Current frame limit (FPS, if you have one)',
        verrouAide: 'NVIDIA control panel, NVIDIA app or simulator. Leave empty if there is none.',

        symptomes: '3. What you notice',

        analyser: 'Analyse',
        effacer: 'Clear everything',
        effacerConfirmer: 'Clear all your answers saved on this device?',
        champsManquants: 'Please give at least the simulator and the display refresh rate.',

        resultats: 'Results',
        diagnostic: 'What limits you',
        goulots: {
            cpu: 'The processor',
            gpu: 'The graphics card',
            vram: 'Video memory (full)',
            streaming: 'Data loading',
            indetermine: 'Undetermined'
        },
        fils: { principal: 'main thread', rendu: 'render thread', gpu: 'graphics card' },
        confiances: {
            mesure: 'Based on your measurements.',
            symptomes: 'Based on your symptoms only: to be confirmed by a measurement.',
            aucune: 'Not enough measurements or symptoms to conclude.'
        },
        vramTaux: taux => `Video memory in use: ${taux}% of the card.`,

        cadence: 'Frame rate target',
        sousMultiples: hz => `Values that divide ${hz} Hz exactly:`,
        verrouExact: v => `Your ${v} FPS limit divides the display refresh rate exactly.`,
        verrouInexact: (v, voisins) => `Your ${v} FPS limit does not divide the display refresh rate exactly. Nearest exact values: ${voisins}.`,
        verrouVrr: v => `Your ${v} FPS limit does not divide the refresh rate, but with variable refresh active, that is not a problem.`,
        vrrInconnu: 'You don\'t know whether variable refresh is active: if it is, any target within its range works; otherwise, pick one of the values above.',
        cibleConseillee: (fps, diviseur) => `Suggested target: ${fps} FPS (refresh rate ÷ ${diviseur}), the highest you really hold.`,
        cibleSansMesure: 'Enter your real FPS (without a limit) to get a suggested target.',
        mesureBloquee: 'Your measured FPS equal your limit: the limit is holding them. Remove it for one measurement to find out what the machine really holds.',

        generation: 'Frame Generation',
        avisGeneration: {
            'gpu-inconnu': 'Graphics card not recognised: unable to say whether Frame Generation is available.',
            indisponible: 'Your card does not offer DLSS Frame Generation (RTX 40 and 50 only).',
            dx11: 'In DirectX 11, Frame Generation reportedly is not offered in MSFS 2020 (DirectX 12 prerequisite reported by users, to be checked).',
            'mesure-requise': 'Available. To know whether it will help, enter your real FPS without it and without a limit.',
            'deconseillee-vram': 'Available, but not advised: it uses video memory, which is already full.',
            deconseillee: 'Available, but your real FPS are too low: the uneven base would show more.',
            'juste-sous-seuil': 'Available, but you are just under the threshold of about 40 real FPS.',
            possible: 'Available, and your real FPS are high enough to try it.'
        },
        multiDisponible: 'Your card also supports Multi Frame Generation (3X, 4X, dynamic).',

        messages: 'Explanations',
        aVerifier: 'To be checked',
        aVerifierAide: 'No official source or published measurement confirms this point yet.',
        sources: 'Sources',
        rang: r => ['', 'official', 'NVIDIA', 'published measurement', 'forum or guide'][r],
        gravites: { important: 'Important', attention: 'Caution', info: 'Info' },

        tableau: 'Settings, from most to least useful for your case',
        tableauIntro: 'Change one setting at a time, then run the same test again: that is the only way to know what made the difference.',
        colReglage: 'Setting',
        colImpact: 'Impact (0 to 3)',
        colDepart: 'Suggested starting point',
        colCout: 'What you lose',
        colTest: 'How to check',
        impactCpu: 'Processor', impactGpu: 'Graphics card', impactVram: 'Video memory',
        impact: (axe, valeur) => `${axe}: ${valeur}`,

        noscript: 'This tool needs JavaScript.'
    }
};

export const T = TEXTES[langue];

/** Texte bilingue de la base ({ fr, en }) dans la langue de la page */
export const tr = texte => (texte ? texte[langue] ?? texte.fr : '');

/** Nombre au format de la langue (41,25 en français, 41.25 en anglais) */
export const nombre = n => n.toLocaleString(langue === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: 2 });
