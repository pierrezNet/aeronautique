// Thème du widget SELCAL, chargé dans <head> pour éviter un flash.
// Priorité au paramètre ?theme=dark|light (choisi par le site hôte), sinon réglage de l'appareil.
// Pas de localStorage : le widget vit dans le site hôte, le choix du visiteur sur aeronautique.xyz ne s'y applique pas.
(function () {
    const demande = new URLSearchParams(window.location.search).get('theme');
    const sombre = demande
        ? demande === 'dark'
        : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', sombre ? 'dark' : 'light');
})();
