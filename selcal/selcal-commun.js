// Noyau SELCAL partagé entre la page principale (selcal.js) et le widget intégrable (embed.js) :
// lettres, fréquences, validation d'un code, lecture depuis l'URL et synthèse audio.

// 16 tonalités (A à S sans I, N, O), index-alignées avec leurs fréquences en Hz
const car = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'P', 'Q', 'R', 'S'];
const frq = [312.6, 346.7, 384.6, 426.6, 473.2, 524.8, 582.1, 645.7, 716.1, 794.3, 881.0, 977.2, 1083.9, 1202.3, 1333.5, 1479.1];

// AudioContext unique partagé (les navigateurs limitent le nombre de contextes simultanés)
let _audioCtx = null;
function getAudioContext() {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window['webkitAudioContext'])();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

// === Source de vérité unique pour la validité d'un code SELCAL ===
// Fonction pure (aucune écriture DOM) : reçoit les 4 lettres saisies, retourne un diagnostic complet.
// - indices : index dans `car` pour chaque lettre (-1 si vide ou lettre interdite)
// - champsInvalides : booléen par lettre
// - raisons : messages expliquant pourquoi le code est invalide
// Règles : 4 lettres distinctes + ordre alphabétique strict dans chaque paire.
// Aucune contrainte entre les paires (AB-CD et CD-AB sont tous deux valides).
function analyserLettres(lettres) {
    const valeurs = lettres.map(v => v.trim().toUpperCase());
    const indices = valeurs.map(v => car.indexOf(v)); // -1 si vide ou hors des 16
    const champsInvalides = [false, false, false, false];
    const raisons = [];

    // 1. Champ vide ou lettre hors des 16 tonalités
    valeurs.forEach((v, i) => {
        if (v === '') {
            champsInvalides[i] = true;
        } else if (indices[i] === -1) {
            champsInvalides[i] = true;
            raisons.push(`La lettre « ${v} » n'est pas une tonalité SELCAL (A à S, sans I, N ni O).`);
        }
    });
    if (valeurs.some(v => v === '')) raisons.unshift('Le code doit comporter 4 lettres.');

    // Les contrôles d'ordre/doublons n'ont de sens que sur des lettres valides.
    if (indices.every(idx => idx !== -1)) {
        // 2. Doublons sur les 4 lettres
        if (indices.some((idx, i) => indices.some((a, j) => j !== i && a === idx))) {
            indices.forEach((idx, i) => {
                if (indices.some((a, j) => j !== i && a === idx)) champsInvalides[i] = true;
            });
            raisons.push('Les 4 lettres doivent être différentes.');
        }
        // 3. Ordre alphabétique strict dans chaque paire
        if (indices[0] >= indices[1]) {
            champsInvalides[0] = champsInvalides[1] = true;
            raisons.push("Dans la 1re paire, la lettre 1 doit précéder la lettre 2 (ordre alphabétique).");
        }
        if (indices[2] >= indices[3]) {
            champsInvalides[2] = champsInvalides[3] = true;
            raisons.push("Dans la 2e paire, la lettre 3 doit précéder la lettre 4 (ordre alphabétique).");
        }
    }

    const valide = champsInvalides.every(c => !c) && raisons.length === 0;
    return { valide, indices, champsInvalides, raisons };
}

// Lit le paramètre ?code= de l'URL (« AB-CD » ou « ABCD », casse indifférente).
// Retourne les 4 index si le code est valide, sinon null.
function lireCodeUrl() {
    const brut = new URLSearchParams(window.location.search).get('code');
    if (!brut) return null;
    const lettres = brut.toUpperCase().replace(/[^A-Z]/g, '').split('');
    if (lettres.length !== 4) return null;
    const { valide, indices } = analyserLettres(lettres);
    return valide ? indices : null;
}

// Format d'affichage officiel : « AB-CD »
function formaterCode(indices) {
    return car[indices[0]] + car[indices[1]] + '-' + car[indices[2]] + car[indices[3]];
}

// Joue les deux bitonalités d'un code valide : 0 → 1 s, pause, 1,2 → 2,2 s.
// Retourne la durée totale en secondes.
function jouerCode(indices) {
    const audioCtx = getAudioContext();
    const playPair = (f1, f2, start) => {
        [f1, f2].forEach(f => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.value = f;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + start);
            osc.stop(audioCtx.currentTime + start + 1);
        });
    };

    playPair(frq[indices[0]], frq[indices[1]], 0);
    playPair(frq[indices[2]], frq[indices[3]], 1.2);
    return 2.2;
}
