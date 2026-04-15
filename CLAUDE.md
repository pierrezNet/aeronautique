# CLAUDE.md - Aero Hub (aeronautique.xyz)

## Projet

Suite d'outils aéronautiques interactifs, site statique pur (HTML/CSS/JS vanilla, aucune dépendance externe).

## Structure

```
index.html          # Landing page (hub) avec grille de cartes vers les 3 apps
watch/index.html    # Horloge UTC avec effets gyroscope (SVG + DeviceOrientation API)
watch/watch.svg     # Cadran SVG avec JS embarqué (animation aiguilles, capteur lumière)
selcal/index.html   # Simulateur SELCAL (Web Audio API, 16 fréquences normalisées)
images/             # Visuels de preview des apps
CNAME               # Domaine custom GitHub Pages : aeronautique.xyz
```

La **Phraséologie** (phraseo.aeronautique.xyz) est hébergée dans un repo séparé.

## Stack et conventions

- **Zéro dépendance** : pas de framework, pas de build, pas de package.json
- CSS : variables custom, Flexbox/Grid, media queries, transitions/animations
- JS : ES6+, Web Audio API (SELCAL), Generic Sensor API (gyroscope, lumière ambiante)
- Polices : Google Fonts (Orbitron pour les titres, Roboto/Inter pour le corps)
- Thème sombre/clair : toggle + `prefers-color-scheme` + persistence localStorage

## Deploiement

- Hébergé sur **GitHub Pages** (repo: pierrezNet/aeronautique)
- Aucun pipeline CI/CD, aucun build step
- Servir localement : `npx serve .`

## Langue

- Le contenu du site est en **français**
- Les commentaires dans le code sont en français
- Toute contribution ou modification doit respecter cette langue

## Licence

GNU GPL v3
