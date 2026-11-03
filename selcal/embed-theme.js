// Thème et langue du widget SELCAL, chargé dans <head> pour éviter un flash.
// Thème : paramètre ?theme=dark|light (choisi par le site hôte), sinon réglage de l'appareil.
// Langue : paramètre ?lang=fr|en, sinon langue du navigateur (anglais si elle n'est ni fr ni en).
// Pas de localStorage : le widget vit dans le site hôte, les choix du visiteur sur aeronautique.xyz ne s'y appliquent pas.
(function () {
    const params = new URLSearchParams(window.location.search);
    const demande = params.get('theme');
    const sombre = demande
        ? demande === 'dark'
        : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', sombre ? 'dark' : 'light');

    const langueDemandee = params.get('lang');
    const preferees = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    const langueNavigateur = preferees.map(l => String(l).slice(0, 2).toLowerCase()).find(l => l === 'fr' || l === 'en') || 'en';
    document.documentElement.lang = langueDemandee === 'fr' || langueDemandee === 'en' ? langueDemandee : langueNavigateur;
})();
