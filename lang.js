// Langue commune à toutes les pages d'Aero Hub (français / anglais).
// Chaque page existe en deux exemplaires : /chemin/ (français) et /en/chemin/ (anglais),
// reliés par des <link rel="alternate" hreflang="…"> placés AVANT ce script dans <head>.
// Chargé sans defer : la redirection vers la bonne langue a lieu avant l'affichage.
// Priorité : choix explicite (bouton FR/EN, clé localStorage 'lang') > langues du navigateur.
(function () {
    const CLE = 'lang';
    const LANGUES = ['fr', 'en'];
    const racine = document.documentElement;
    const actuelle = racine.lang === 'en' ? 'en' : 'fr';

    // localStorage peut lever une exception (navigation privée, stockage bloqué)
    function lireChoix() {
        try {
            const choix = localStorage.getItem(CLE);
            return LANGUES.includes(choix) ? choix : null;
        } catch (e) {
            return null;
        }
    }

    function memoriserChoix(langue) {
        try {
            localStorage.setItem(CLE, langue);
        } catch (e) {}
    }

    // Première langue reconnue dans les préférences du navigateur ; anglais par défaut
    // pour un visiteur dont aucune langue préférée n'est le français.
    function langueNavigateur() {
        const preferees = navigator.languages && navigator.languages.length
            ? navigator.languages
            : [navigator.language || ''];
        for (const l of preferees) {
            const code = String(l).slice(0, 2).toLowerCase();
            if (LANGUES.includes(code)) return code;
        }
        return 'en';
    }

    // Les robots d'indexation ne sont jamais redirigés : chaque version doit rester indexable
    function estUnRobot() {
        return /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent);
    }

    // Adresse de la page équivalente dans l'autre langue (d'après les liens hreflang)
    function adresseAlternative(langue) {
        const lien = document.querySelector('link[rel="alternate"][hreflang="' + langue + '"]');
        if (!lien) return null;
        const cible = new URL(lien.href, location.href);
        // Même origine que la page courante (serveur local compris), paramètres et ancre conservés
        return cible.pathname + location.search + location.hash;
    }

    const voulue = lireChoix() || langueNavigateur();

    // Page sans équivalent (404, servie à n'importe quelle adresse) : elle s'affiche dans
    // la langue de l'adresse demandée si elle commence par /en/, sinon dans la langue voulue
    if (!document.querySelector('link[rel="alternate"][hreflang]')) {
        racine.lang = location.pathname.startsWith('/en/') ? 'en' : voulue;
    }

    if (voulue !== actuelle && !estUnRobot()) {
        const adresse = adresseAlternative(voulue);
        if (adresse) {
            location.replace(adresse);
            return;
        }
    }

    // Bouton FR/EN : simple lien vers l'autre version (fonctionne sans JS) ;
    // le clic mémorise la langue choisie pour les visites suivantes.
    document.addEventListener('DOMContentLoaded', function brancherBoutonLangue() {
        const bouton = document.getElementById('langToggle');
        if (!bouton) return;
        bouton.addEventListener('click', function choisirLangue() {
            memoriserChoix(bouton.getAttribute('hreflang'));
        });
    });

    // Exposé pour les pages sans version alternative (ex. 404)
    window.aeroLangue = {
        voulue: voulue
    };
})();
