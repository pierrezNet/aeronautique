// Thème commun à toutes les pages d'Aero Hub.
// Chargé dans <head> (sans defer) pour poser data-theme sur <html> avant l'affichage
// et éviter un flash de thème clair au chargement.
(function () {
    const CLE = 'theme';
    const racine = document.documentElement;
    const prefereSombre = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    // localStorage peut lever une exception (navigation privée, stockage bloqué)
    function lireChoix() {
        try {
            // 'selcal-theme' : ancienne clé propre à la page SELCAL, reprise pour migration
            return localStorage.getItem(CLE) || localStorage.getItem('selcal-theme');
        } catch (e) {
            return null;
        }
    }

    function memoriserChoix(theme) {
        try {
            localStorage.setItem(CLE, theme);
            localStorage.removeItem('selcal-theme');
        } catch (e) {}
    }

    function themeParDefaut() {
        return lireChoix() || (prefereSombre && prefereSombre.matches ? 'dark' : 'light');
    }

    function majBouton(theme) {
        const bouton = document.getElementById('themeToggle');
        if (!bouton) return;
        bouton.textContent = theme === 'dark' ? '☀️' : '🌓';
        bouton.setAttribute('aria-label', theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre');
    }

    // Applique un thème ; « memoriser » = choix explicite de l'utilisateur
    function appliquerTheme(theme, memoriser) {
        racine.setAttribute('data-theme', theme);
        if (memoriser) memoriserChoix(theme);
        majBouton(theme);
    }

    appliquerTheme(themeParDefaut(), false);

    // Suit les changements de préférence système tant que l'utilisateur n'a rien choisi
    if (prefereSombre) {
        prefereSombre.addEventListener('change', function suivrePreferenceSysteme(e) {
            if (!lireChoix()) appliquerTheme(e.matches ? 'dark' : 'light', false);
        });
    }

    document.addEventListener('DOMContentLoaded', function brancherBouton() {
        const bouton = document.getElementById('themeToggle');
        if (!bouton) return;
        majBouton(racine.getAttribute('data-theme'));
        bouton.addEventListener('click', function basculerTheme() {
            appliquerTheme(racine.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
        });
    });

    // Exposé pour les pages qui pilotent le thème autrement (ex. capteur de lumière)
    window.aeroTheme = {
        appliquer: appliquerTheme,
        choixUtilisateur: lireChoix
    };
})();
