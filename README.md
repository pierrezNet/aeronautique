# ✈️ Aero Hub - aeronautique.xyz

Une suite d'outils aéronautiques interactifs pour les pilotes (réels ou virtuels) et les passionnés d'aviation : phraséologie radio, horloge UTC, générateur SELCAL et atelier de réglages pour Microsoft Flight Simulator. Le site est en français et en anglais (`/en/`) : la langue du navigateur est détectée à l'arrivée, et le bouton FR/EN permet d'en changer.

## 🚀 Applications incluses

### 🎙️ [Phraséologie](https://aeronautique.xyz/phraseologie/)
Une web-app interactive pour s'entraîner aux communications radio VFR et IFR, en français et en anglais : trois niveaux, quiz noté, vol complet guidé, voix de l'ATC et réponse à la voix. L'application elle-même est sur [phraseo.aeronautique.xyz](https://phraseo.aeronautique.xyz/) (dépôt séparé) ; ce dépôt contient sa page de présentation.

### ⌚ [Horloge UTC](https://aeronautique.xyz/watch/)
Une montre calée sur le temps universel, intégrable dans n'importe quel site.
* **Immersif :** le fond reprend l'horizon artificiel, piloté par les capteurs de mouvement.
* **Adaptatif :** mode nuit de 21 h à 6 h UTC ; réagit à la luminosité ambiante (sur navigateurs compatibles).

### 📻 [Générateur SELCAL](https://aeronautique.xyz/selcal/)
Simulateur de système d'appel sélectif (SELCAL).
* **Réaliste :** génère les bitonalités audio exactes via l'API Web Audio.
* **Pédagogique :** vérifie en temps réel les contraintes de codage (ordre alphabétique, unicité des lettres).
* **Partageable :** lien direct vers un code (`?code=AB-CD`) et lecteur intégrable en iframe.

### 🎛️ [Atelier réglages MSFS](https://aeronautique.xyz/reglages/)
Un outil pédagogique pour comprendre et optimiser les réglages graphiques de Microsoft Flight Simulator 2020 et 2024, en huit étapes.
* **Diagnostic :** ce qui limite les images par seconde (processeur, carte graphique, mémoire vidéo), d'après l'affichage du mode développeur ou une capture [PresentMon](https://github.com/GameTechDev/PresentMon).
* **Cadence :** cible d'images par seconde adaptée à la fréquence de l'écran, génération d'images expliquée.
* **Base ouverte et sourcée :** chaque réglage et chaque règle indique sa source et son statut (vérifié / à vérifier) ; import du fichier `UserCfg.opt` pour voir ses valeurs actuelles.
* **Mode challenge, journal de tests** exportable (JSON, CSV), et **IA facultative** avec la clé de l'utilisateur (Claude, ChatGPT, Gemini).
* Tout fonctionne dans le navigateur : voir [`reglages/README.md`](reglages/README.md) et le [guide de contribution](reglages/CONTRIBUTING.md).

### 💬 Communauté
* **[Forum AvroBB](https://avrobb.org/)** : questions, retours et discussions autour des outils du site et de la simulation de vol.
* **[Appel à projets](https://avrobb.org/forum/12-appel-a-projets)** : une idée d'outil, une règle ou une source à ajouter ? Proposez-la sur le forum.
* **« J'ai un retour »** : sur les pages de l'horloge UTC et du SELCAL, un formulaire sans compte transmet un message au forum.

---

## 🛠️ Stack Technique

* **Langages :** HTML5, CSS3 (variables, Flexbox, Grid), JavaScript (ES6+, modules natifs), sans framework ni étape de construction.
* **Audio :** API Web Audio pour la synthèse de fréquences SELCAL.
* **Capteurs :** API Generic Sensor (orientation et lumière ambiante).
* **Design :** thèmes clair et sombre, polices auto-hébergées (Space Grotesk, Space Mono, Roboto, Inter).
* **Sécurité :** politique de sécurité du contenu (CSP) sur chaque page, aucun script en ligne.
* **Hébergement :** GitHub Pages, derrière Cloudflare.
* **Formulaire « J'ai un retour » :** un Worker Cloudflare en JavaScript sans dépendance ([`relais/`](relais/)), sur la seule adresse `aeronautique.xyz/api/retour`, transmet les messages au forum AvroBB.

---

## 📦 Installation locale

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/pierrezNet/aeronautique.git
   cd aeronautique
   ```

2. Servir **la racine du dépôt** (les pages utilisent des chemins absolus) :
   ```bash
   npx serve .
   ```
   puis ouvrir http://localhost:3000/. En local, le formulaire « J'ai un retour » ne peut pas envoyer (le relais n'existe qu'en ligne) : il affiche alors le lien du forum.

3. Tests de l'Atelier réglages (Node.js 20 ou plus, aucune dépendance) :
   ```bash
   cd reglages
   npm test
   ```

---

## 📜 Licences

Le projet est sous double licence :

* **Code source** (HTML, CSS, JavaScript, y compris les scripts intégrés au SVG de la montre et le relais) : [licence MIT](LICENSE).
* **Contenus** (textes, images, favicons, graphisme du cadran de la montre, base de connaissances de l'Atelier réglages) : [Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE-CC-BY-4.0). Vous pouvez les réutiliser et les adapter librement, à condition de citer l'auteur (Emmanuel Pierrez, [aeronautique.xyz](https://aeronautique.xyz/)).

Exceptions :
* les polices Space Grotesk, Space Mono, Roboto et Inter (dossier `fonts/`) restent sous licence [SIL Open Font License 1.1](https://openfontlicense.org/) ;
* le logo du forum AvroBB (`images/avrobb.*`) appartient au projet AvroBB ;
* les fichiers d'exemple de `reglages/tests/captures/` et `reglages/tests/usercfg/` gardent leur licence MIT d'origine (voir leurs fichiers `LISEZMOI.txt`).
