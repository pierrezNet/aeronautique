// Page de la montre UTC : aide iOS et capteur de lumière ambiante
// Le mouvement de l'appareil est géré à l'intérieur du SVG (horizon artificiel),
// afin de ne pas déformer toute l'image de la montre.

// iOS 13+ : l'autorisation des capteurs se demande par un toucher sur la montre (voir watch.svg).
// Chrome expose aussi requestPermission : on limite l'aide aux écrans tactiles.
const DOE = window['DeviceOrientationEvent'];
if (DOE && typeof DOE.requestPermission === 'function' && navigator.maxTouchPoints > 0) {
    document.getElementById('aide-ios').hidden = false;
}

// --- CAPTEUR DE LUMINOSITÉ (Ambient Light) ---
// Note : Cette API est très restreinte pour des raisons de sécurité.
const AmbientLight = window['AmbientLightSensor'];
if (AmbientLight) {
    try {
        const sensor = new AmbientLight();
        sensor.addEventListener('reading', () => {
            // Le choix explicite de l'utilisateur reste prioritaire sur le capteur
            if (window.aeroTheme.choixUtilisateur()) return;
            window.aeroTheme.appliquer(sensor.lux < 10 ? 'dark' : 'light', false);
        });
        sensor.start();
    } catch (err) {
        console.log("Capteur de lumière non accessible.");
    }
}
