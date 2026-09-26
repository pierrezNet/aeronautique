# CLAUDE.md - Aero Hub (aeronautique.xyz)

## Projet

Suite d'outils aéronautiques interactifs, site statique pur (HTML/CSS/JS vanilla, aucune dépendance externe).

## Structure

```
index.html          # Landing page (hub) avec grille de cartes vers les 3 apps
theme.css           # Commun : polices locales (@font-face), variables de couleur, bouton de thème
theme.js            # Commun : thème clair/sombre (clé localStorage 'theme', data-theme sur <html>)
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

La **Phraséologie** (phraseo.aeronautique.xyz) est hébergée dans un repo séparé.

## Stack et conventions

- **Zéro dépendance** : pas de framework, pas de build, pas de package.json
- CSS : variables custom, Flexbox/Grid, media queries, transitions/animations
- JS : ES6+, Web Audio API (SELCAL), Generic Sensor API (gyroscope, lumière ambiante)
- Polices : auto-hébergées dans `fonts/` (Orbitron pour les titres, Roboto/Inter pour le corps), pas de Google Fonts
- Thème sombre/clair : toggle + `prefers-color-scheme` + persistence localStorage, via `theme.js`
- CSP en `<meta>` sur chaque page : **aucun script inline ni attribut `onclick`** (scripts en fichiers externes) ; seul tiers autorisé : Cloudflare Web Analytics

## Deploiement

- Hébergé sur **GitHub Pages** (repo: pierrezNet/aeronautique)
- Aucun pipeline CI/CD, aucun build step
- Servir localement : `npx serve .`

## Langue

- Le contenu du site est en **français**
- Les commentaires dans le code sont en français
- Toute contribution ou modification doit respecter cette langue

## Licence

Double licence :
- **Code** (HTML, CSS, JS, scripts du SVG) : MIT (`LICENSE`)
- **Contenus** (textes, images, graphisme du cadran) : CC BY 4.0 (`LICENSE-CC-BY-4.0`)

Exceptions : les polices de `fonts/` restent sous SIL OFL 1.1 (licences tierces).
