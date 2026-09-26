// Widget SELCAL intégrable : affiche le code passé dans l'URL (?code=AB-CD) et le joue au clic.
// Dépend de selcal-commun.js (lireCodeUrl, formaterCode, jouerCode), chargé avant.
const indicesWidget = lireCodeUrl();
const zoneCode = document.getElementById('code');
const boutonPlay = document.getElementById('play');

if (indicesWidget) {
    const code = formaterCode(indicesWidget);
    zoneCode.textContent = code;
    boutonPlay.disabled = false;
    boutonPlay.setAttribute('aria-label', `Écouter le code SELCAL ${code}`);
    // Le lien de crédit ouvre le simulateur complet sur le même code
    document.getElementById('credit').href = 'https://aeronautique.xyz/selcal/?code=' + code;

    boutonPlay.addEventListener('click', function ecouter() {
        const duree = jouerCode(indicesWidget);
        // Bouton désactivé pendant la lecture pour éviter les superpositions
        boutonPlay.disabled = true;
        boutonPlay.textContent = '♪ Lecture…';
        setTimeout(() => {
            boutonPlay.disabled = false;
            boutonPlay.textContent = '▶ Écouter';
        }, duree * 1000);
    });
} else {
    zoneCode.classList.add('code-invalide');
    zoneCode.textContent = 'Code SELCAL absent ou invalide (exemple : ?code=AB-CD).';
    boutonPlay.hidden = true;
}
