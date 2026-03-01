# ✈️ Aero Hub - aeronautique.xyz

Une suite d'outils aéronautiques interactifs pour les pilotes (réels ou virtuels) et les passionnés d'aviation. Ce projet regroupe des simulateurs de communication et des outils de précision avec une interface moderne et réactive.

## 🚀 Applications incluses

### 🎙️ [Phraséologie](https://phraseo.aeronautique.xyz/)
Une web-app interactive pour apprendre et réviser la phraséologie aéronautique en français et en anglais. Idéal pour préparer ses examens ou rester à la page.

### ⌚ [Horloge UTC](https://aeronautique.xyz/watch/)
Une montre haute précision calée sur le temps universel. 
* **Immersif :** Utilise l'accéléromètre pour un effet de mouvement 3D.
* **Adaptatif :** Réagit à la luminosité ambiante (sur navigateurs compatibles).

### 📻 [Générateur SELCAL](https://aeronautique.xyz/selcal/)
Simulateur de système d'appel sélectif (SELCAL).
* **Réaliste :** Génère les bitonalités audio exactes via l'API Web Audio.
* **Intelligent :** Vérifie en temps réel les contraintes de codage (ordre alphabétique, unicité des lettres).
* **Interactif :** Feedback sonore et visuel lors de la modification des codes.

---

## 🛠️ Stack Technique

* **Langages :** HTML5, CSS3 (Variables, Flexbox, Grid), JavaScript (ES6+).
* **Audio :** API Web Audio pour la synthèse de fréquences SELCAL.
* **Capteurs :** API Generic Sensor (Orientation & Light).
* **Design :** Mode sombre natif, animations fluides et typographies "Orbitron".
* **Hébergement :** GitHub Pages.

---

## 📦 Installation locale

Pour lancer le projet sur votre machine :

1. Cloner le dépôt :
   ```bash
   git clone [https://github.com/pierrezNet/aeronautique.git](https://github.com/pierrezNet/aeronautique.git)
   ```

2. Lancer l'application en local :
   npx serve .