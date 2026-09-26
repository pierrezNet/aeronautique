// Simulateur SELCAL : génération, contrôle, écoute et partage des codes.
// Dépend de selcal-commun.js (car, frq, analyserLettres, jouerCode…), chargé avant.

let codes = [0, 1, 2, 3]; // Index des lettres

const inputs = [
    document.getElementById('selcal1'),
    document.getElementById('selcal2'),
    document.getElementById('selcal3'),
    document.getElementById('selcal4')
];

// Fonction pour un petit son de bouton "gentil" (Bip doux)
function playUISound(type = 'click') {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Fréquence plus haute et courte pour un clic, plus basse pour une "limite"
    osc.frequency.setValueAtTime(type === 'unique' ? 220 : 660, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime); // Très bas volume
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
}

// Lettres SELCAL valides pour ce champ : ordre alphabétique respecté avec la lettre
// partenaire de la paire, distinctes des 3 autres, et différentes de la lettre courante.
function lettresPossibles(index) {
    const premier = index % 2 === 0;                 // champs 0 et 2 = 1re lettre de la paire
    const partenaire = premier ? codes[index + 1] : codes[index - 1];
    const autres = codes.filter((_, j) => j !== index);
    const candidats = [];
    for (let i = 0; i < car.length; i++) {
        if (i === codes[index]) continue;                          // doit changer de lettre
        if (premier ? i >= partenaire : i <= partenaire) continue; // 1re < partenaire ; 2e > partenaire
        if (autres.includes(i)) continue;                          // 4 lettres distinctes
        candidats.push(i);
    }
    return candidats;
}

// Change une lettre via le bouton « Modifier », en ne proposant que des lettres valides.
const modifyChar = (index) => {
    const inputEl = inputs[index];
    const candidats = lettresPossibles(index);

    // Feedback visuel
    inputEl.classList.remove('shake');
    void inputEl.offsetWidth; // Force le repaint pour relancer l'animation
    inputEl.classList.add('shake');

    if (candidats.length === 0) {
        // Aucune autre lettre ne respecte l'ordre de la paire : choix unique
        playUISound('unique');
        inputEl.classList.add('unique-choice');
        setTimeout(() => inputEl.classList.remove('unique-choice'), 500);
        return;
    }
    playUISound('click');
    codes[index] = candidats[getNumber(0, candidats.length)];
    updateDisplay();
};

function getNumber(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

// Diagnostic du code saisi dans les 4 champs (voir analyserLettres dans selcal-commun.js)
function analyserCode() {
    return analyserLettres(inputs.map(i => i.value));
}

// Applique le diagnostic au DOM : bordures, aria-invalid, zone de message.
function testValide() {
    const { valide, champsInvalides, raisons } = analyserCode();
    inputs.forEach((input, i) => {
        input.classList.toggle('invalid', champsInvalides[i]);
        input.setAttribute('aria-invalid', champsInvalides[i] ? 'true' : 'false');
    });
    afficherErreurs(valide ? [] : raisons);
    return valide;
}

// Remplit/masque la région aria-live (textContent : pas d'innerHTML sur entrée utilisateur).
function afficherErreurs(raisons) {
    const zone = document.getElementById('erreurSelcal');
    zone.textContent = '';
    if (raisons.length === 0) { zone.hidden = true; return; }
    zone.hidden = false;
    raisons.forEach(r => {
        const li = document.createElement('li');
        li.textContent = r;
        zone.appendChild(li);
    });
}

function updateDisplay() {
    inputs.forEach((input, i) => input.value = car[codes[i]]);
    testValide();
    majCodeIntegration();
}

// Adresse de la page pour un code donné (?code=AB-CD)
function lienPartage(indices) {
    return window.location.origin + window.location.pathname + '?code=' + formaterCode(indices);
}

// Met à jour l'exemple d'intégration (iframe) avec le code courant, s'il est valide
function majCodeIntegration() {
    const zone = document.getElementById('codeIntegration');
    const { valide, indices } = analyserCode();
    if (!zone || !valide) return;
    const code = formaterCode(indices);
    zone.textContent = `<iframe src="https://aeronautique.xyz/selcal/embed.html?code=${code}" width="320" height="140" title="SELCAL ${code}" style="border:0"></iframe>`;
}

function genererCode() {
    codes[0] = getNumber(0, 13);
    codes[1] = getNumber(codes[0] + 1, 15);
    codes[2] = getNumber(0, 13);
    do { codes[2] = getNumber(0, 13); } while (codes[2] === codes[0] || codes[2] === codes[1]);
    do { codes[3] = getNumber(codes[2] + 1, 16); } while (codes[3] === codes[0] || codes[3] === codes[1]);
    updateDisplay();
}
document.getElementById('aleaAll').onclick = genererCode;

document.getElementById('reinit').onclick = () => {
    inputs.forEach(input => {
        input.value = "";
        input.classList.remove('invalid', 'shake', 'unique-choice');
        input.setAttribute('aria-invalid', 'false');
    });
    codes = [0, 0, 0, 0];
    afficherErreurs([]);
};

document.getElementById('play').onclick = () => {
    const { valide, indices, raisons } = analyserCode();
    testValide(); // synchronise l'affichage des erreurs

    if (!valide) {
        // Code invalide : aucune bitonalité, mais feedback visuel + sonore + annonce
        inputs.forEach(input => {
            input.classList.remove('shake');
            void input.offsetWidth; // force le repaint pour relancer l'animation
            input.classList.add('shake');
        });
        playUISound('unique');
        afficherErreurs(raisons.length ? raisons : ['Code SELCAL invalide.']);
        return;
    }

    jouerCode(indices);
};

// Boutons « Modifier » (pas d'attribut onclick : compatible avec la CSP)
document.querySelectorAll('[data-modifier]').forEach(bouton => {
    bouton.addEventListener('click', () => modifyChar(Number(bouton.dataset.modifier)));
});

// Copie le lien de partage du code courant (uniquement s'il est valide)
document.getElementById('partager').addEventListener('click', async () => {
    const { valide, indices, raisons } = analyserCode();
    testValide();
    if (!valide) {
        playUISound('unique');
        afficherErreurs(raisons.length ? raisons : ['Code SELCAL invalide.']);
        return;
    }
    const lien = lienPartage(indices);
    const statut = document.getElementById('statutPartage');
    try {
        await navigator.clipboard.writeText(lien);
        statut.textContent = `Lien copié : ${lien}`;
    } catch (e) {
        // Presse-papiers indisponible (contexte non sécurisé, refus) : on affiche le lien à copier
        statut.textContent = `Copiez ce lien : ${lien}`;
    }
    playUISound('click');
});

inputs.forEach(i => i.addEventListener('input', () => { testValide(); majCodeIntegration(); }));

// Code transmis dans l'URL (?code=AB-CD) : on l'affiche, sinon on en génère un
const codeUrl = lireCodeUrl();
if (codeUrl) {
    codes = codeUrl;
    updateDisplay();
} else {
    genererCode();
}
