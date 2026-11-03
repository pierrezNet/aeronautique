// Widget SELCAL intégrable : affiche le code passé dans l'URL (?code=AB-CD) et le joue au clic.
// Dépend de selcal-commun.js (lireCodeUrl, formaterCode, jouerCode), chargé avant.
const indicesWidget = lireCodeUrl();
const zoneCode = document.getElementById('code');
const boutonPlay = document.getElementById('play');
const adresseSimulateur = langue === 'en' ? 'https://aeronautique.xyz/en/selcal/' : 'https://aeronautique.xyz/selcal/';

// Textes statiques du widget dans la langue choisie (le HTML est en français)
boutonPlay.textContent = txt.ecouter;
document.getElementById('credit').href = adresseSimulateur;

if (indicesWidget) {
    const code = formaterCode(indicesWidget);
    zoneCode.textContent = code;
    boutonPlay.disabled = false;
    boutonPlay.setAttribute('aria-label', txt.ecouterCode(code));
    // Le lien de crédit ouvre le simulateur complet sur le même code, dans la langue du widget
    document.getElementById('credit').href = adresseSimulateur + '?code=' + code;

    boutonPlay.addEventListener('click', function ecouter() {
        const duree = jouerCode(indicesWidget);
        // Bouton désactivé pendant la lecture pour éviter les superpositions
        boutonPlay.disabled = true;
        boutonPlay.textContent = txt.lecture;
        setTimeout(() => {
            boutonPlay.disabled = false;
            boutonPlay.textContent = txt.ecouter;
        }, duree * 1000);
    });
} else {
    zoneCode.classList.add('code-invalide');
    zoneCode.textContent = txt.codeAbsent;
    boutonPlay.hidden = true;
}
