# CLAUDE.md - Aero Hub (aeronautique.xyz)

## Projet

Suite d'outils aéronautiques interactifs, site statique pur (HTML/CSS/JS vanilla, aucune dépendance externe).

## Structure

```
index.html          # Landing page (hub) avec grille de cartes vers les 3 apps
phraseologie/index.html # Présentation détaillée de la Phraséologie ; boutons vers l'application (phraseo.aeronautique.xyz)
theme.css           # Commun : polices locales (@font-face), variables de couleur, bouton de thème
theme.js            # Commun : thème clair/sombre (clé localStorage 'theme', data-theme sur <html>)
lang.js             # Commun : langue FR/EN (clé localStorage 'lang', sinon langue du navigateur), redirection d'après les liens hreflang
en/                 # Version anglaise : même arborescence (en/index.html, en/watch/, en/selcal/, en/phraseologie/)
retour.js / .css    # Formulaire « J'ai un retour » (horloge UTC, SELCAL) : <dialog> bilingue, POST /api/retour
relais/             # Worker Cloudflare (JS sans build) sur la route aeronautique.xyz/api/retour → forum AvroBB
fonts/              # Polices woff2 auto-hébergées (Orbitron, Roboto, Inter) + licences OFL
watch/index.html    # Horloge UTC avec effets gyroscope (SVG + DeviceOrientation API)
watch/watch.js      # Aide iOS + capteur de lumière ambiante
watch/watch.svg     # Cadran SVG autonome avec JS embarqué (aiguilles, horizon, permission iOS au toucher)
selcal/index.html   # Simulateur SELCAL (Web Audio API, 16 fréquences normalisées)
selcal/selcal-commun.js # Noyau SELCAL partagé : lettres, fréquences, validation, ?code=, audio
selcal/selcal.js    # Page SELCAL : interface, partage de lien (?code=AB-CD)
selcal/embed.html   # Widget SELCAL intégrable en iframe (noindex) + embed.js / embed-theme.js
images/             # Visuels : PNG 1024 px (sources), WebP 300 px (cartes), og-*.jpg 1200×630 (Open Graph)
404.html            # Page d'erreur GitHub Pages (noindex, chemins absolus)
robots.txt          # Autorise tout, pointe vers le sitemap
sitemap.xml         # Mettre à jour <lastmod> quand une page change
CNAME               # Domaine custom GitHub Pages : aeronautique.xyz
```

L'application **Phraséologie** (phraseo.aeronautique.xyz) est hébergée dans un repo séparé ; sa page de présentation est `phraseologie/` ici (à garder alignée avec les fonctionnalités de l'application).

## Stack et conventions

- **Zéro dépendance** : pas de framework, pas de build, pas de package.json
- CSS : variables custom, Flexbox/Grid, media queries, transitions/animations
- JS : ES6+, Web Audio API (SELCAL), Generic Sensor API (gyroscope, lumière ambiante)
- Polices : auto-hébergées dans `fonts/` (Orbitron pour les titres, Roboto/Inter pour le corps), pas de Google Fonts
- Thème sombre/clair : toggle + `prefers-color-scheme` + persistence localStorage, via `theme.js`
- CSP en `<meta>` sur chaque page : **aucun script inline ni attribut `onclick`** (scripts en fichiers externes) ; seul tiers autorisé : Cloudflare Web Analytics

## Retours « J'ai un retour »

- Bouton `#boutonRetour` (`data-app="horlogeUtc"` ou `"selcal"`) en fin de bloc d'informations des pages montre et SELCAL (FR et EN) ; `retour.js` construit la boîte de dialogue dans la langue de la page. Une page peut joindre du contexte via `window.contexteRetour()` (SELCAL : code affiché).
- `relais/worker.js` : origine vérifiée (`ALLOWED_ORIGINS`), 5 envois/min/IP, validation, puis liaison de service vers AvroBB (`HorlogeUtcFeedback`, `SelcalFeedback`). Les clés de type (`bug`, `suggestion`, `question`, `autre`) sont traduites en libellés qui doivent rester identiques à `FEEDBACK_SOURCES` d'AvroBB (`services/appFeedback.ts`).
- Côté forum : sujets dans les forums privés « Retours Horloge UTC / SELCAL (à trier) » (migration 0012), bouton « Accepter » vers les forums publics n° 8 et n° 9.
- Déploiement : AvroBB d'abord (migration 0012 + points d'entrée), puis `cd relais && npx wrangler deploy`. Sans relais (serveur local), le formulaire affiche l'erreur avec le lien du forum.

## Deploiement

- Hébergé sur **GitHub Pages** (repo: pierrezNet/aeronautique)
- Aucun pipeline CI/CD, aucun build step
- Servir localement : `npx serve .`

## Langue

- Le site est **bilingue** : français à la racine (`/watch/`…), anglais sous `/en/` (`/en/watch/`…). Toute modification de texte d'une page se reporte dans sa version anglaise.
- Chaque page déclare `<link rel="alternate" hreflang="fr|en|x-default">` (x-default = anglais) **avant** `<script src="/lang.js">`, et un lien `#langToggle` vers l'autre version. Les pages anglaises reprennent les scripts et le SVG par chemins absolus (`/selcal/selcal.js`, `/watch/watch.svg`).
- `lang.js` redirige vers la langue voulue (choix mémorisé, sinon navigateur ; anglais si ni fr ni en), sauf pour les robots d'indexation. `404.html` est une page unique bilingue (blocs `lang="fr"` / `lang="en"`).
- Textes générés en JS (SELCAL) : dictionnaire `TEXTES` de `selcal/selcal-commun.js`, selon l'attribut `lang` de `<html>`. Le widget `embed.html` prend `?lang=fr|en`, sinon la langue du navigateur.
- `sitemap.xml` liste les deux versions de chaque page avec leurs `xhtml:link` alternates.
- La langue de travail reste le **français**
- Les commentaires dans le code sont en français
- Toute contribution ou modification doit respecter cette langue

## Licence

Double licence :
- **Code** (HTML, CSS, JS, scripts du SVG) : MIT (`LICENSE`)
- **Contenus** (textes, images, graphisme du cadran) : CC BY 4.0 (`LICENSE-CC-BY-4.0`)

Exceptions : les polices de `fonts/` restent sous SIL OFL 1.1 (licences tierces).
