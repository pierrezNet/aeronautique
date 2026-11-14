# Atelier réglages MSFS

*[English version](README.en.md)*

Outil pédagogique pour Microsoft Flight Simulator 2020 et 2024 : comprendre ce qui limite les images par seconde, choisir une cible adaptée à son écran ou à son casque de réalité virtuelle, puis tester un réglage à la fois. En ligne sur [aeronautique.xyz/reglages/](https://aeronautique.xyz/reglages/).

Outil indépendant, sans lien avec Microsoft ni Asobo Studio.

## Ce que fait l'outil

1. **Diagnostic du goulot** : processeur (et quel fil), carte graphique, mémoire vidéo ou chargement des données, d'après l'affichage FPS du mode développeur, une capture [PresentMon](https://github.com/GameTechDev/PresentMon) ou, à défaut, les symptômes décrits.
2. **Cible d'images par seconde** : valeurs qui divisent exactement la fréquence de l'écran (165 Hz → 82,5 ; 55 ; 41,25…), cas de la fréquence variable (VRR), limite qui « tombe juste » ou non. En **réalité virtuelle** (en bêta, vos retours sont bienvenus sur le [forum de l'Atelier](https://avrobb.org/forum/13-atelier-reglages-msfs)) : la fréquence du casque ou sa moitié avec reprojection (ASW, Motion Smoothing, SSW), le logiciel du casque, les réglages VR propres (rendu fovéal, génération d'images en VR) et la lecture des réglages VR de `UserCfg.opt`.
3. **Génération d'images** : disponibilité selon la carte (RTX 40 / 50), et rappel qu'elle multiplie les images affichées, pas la simulation.
4. **Tableau des réglages** trié selon le goulot : impact sur le processeur, la carte graphique et la mémoire vidéo, coût visuel, point de départ, test de vérification ; avec vos valeurs actuelles si vous importez votre `UserCfg.opt`.
5. **Mode challenge** : des questions sur les réglages que vous avez changés, à la lumière de votre diagnostic.
6. **Journal avant/après** avec un protocole de test reproductible, exportable en JSON et en CSV.
7. **IA facultative** : un texte résumant votre situation, à copier dans l'IA de votre choix, ou à envoyer à Claude, ChatGPT ou Gemini avec **votre propre clé**.

## Vie privée

Tout fonctionne dans le navigateur. Les réponses, le journal et les fichiers importés restent sur l'appareil (stockage local du navigateur) ; rien n'est envoyé à aeronautique.xyz. Le seul envoi possible est celui que vous déclenchez vers le fournisseur d'IA de votre choix, avec votre clé, et le texte exact est affiché avant. La mesure d'audience du site (Cloudflare Web Analytics) ne pose pas de cookie.

## Une base de connaissances ouverte et sourcée

Les réglages, règles et questions sont dans [`donnees/`](donnees/), séparés du code. Chaque entrée indique le simulateur concerné, la mise à jour (Sim Update) testée, ses sources et un statut : **vérifié** (au moins une source officielle, constructeur ou mesure publiée) ou **à vérifier**, affiché comme tel dans l'outil. Rien n'est affirmé sans source.

## Structure

```
index.html, reglages.css       page (la version anglaise est ../en/reglages/)
js/app.js                      interface (formulaire, résultats)
js/interfaceJournal.js         journal ; js/interfaceIa.js : section IA
js/moteur/                     logique pure, sans accès à la page, testée
donnees/                       base de connaissances (JSON)
outils/                        contrôle du schéma, liste des entrées à revoir, essai en ligne de commande
tests/                         tests (node:test), captures et fichiers UserCfg.opt réels
```

Aucune dépendance, aucune étape de construction : le navigateur charge directement les modules JavaScript et les fichiers JSON.

## Développer

Il faut Node.js 20 ou plus, pour les tests seulement.

```bash
cd reglages
npm test                                  # tous les tests
npm run verifier                          # entrées à vérifier ou anciennes
npm run verifier -- --avant 2024:SU7      # entrées testées avant une Sim Update
npm run essai                             # le moteur sur le cas d'exemple, en ligne de commande
```

Pour voir la page, servez **la racine du dépôt** (la page utilise des chemins absolus) : `npx serve .` puis ouvrez `http://localhost:3000/reglages/`.

Pour contribuer (ajouter un réglage, une règle, un matériel, signaler une règle obsolète) : voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licences

Code sous licence [MIT](../LICENSE) ; textes de la base de connaissances sous licence [CC BY 4.0](../LICENSE-CC-BY-4.0). Les captures PresentMon de `tests/captures/` (Intel) et les fichiers de `tests/usercfg/` restent sous leur licence MIT d'origine (voir les fichiers `LISEZMOI.txt`).
