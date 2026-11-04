# Contribuer à l'Atelier réglages

Merci ! La qualité de l'outil tient surtout à sa base de connaissances : une contribution utile est souvent une source, une mesure ou une correction, plus qu'une ligne de code.

Avant de proposer une modification : `cd reglages && npm test` doit passer.

## Règle d'or : rien sans source

Chaque entrée porte des `sources` classées par **rang** :

| Rang | Type de source | Exemple |
|---|---|---|
| 1 | Officielle Asobo / Microsoft | notes de version, documentation du SDK, réponse d'un employé |
| 2 | Constructeur | NVIDIA, Intel, AMD |
| 3 | Mesure publiée et reproductible | guide avec machine, version et méthode décrites |
| 4 | Forum, guide, fichier d'exemple | à citer en complément seulement |

Le statut `verifie` exige au moins une source de rang 1 à 3 (le test de schéma le refuse sinon). Sans elle, le statut est `a-verifier` : l'outil l'affiche avec un badge « À vérifier ». Les pages du type « meilleurs réglages pour la RTX xxxx » qui semblent générées automatiquement ne suffisent pas.

Champs de suivi communs : `id` (minuscules-avec-tirets), `simulateur` (`2020`, `2024` ou `les-deux`), `miseAJourMin` (Sim Update testée ; pour `les-deux`, un objet `{ "2020": "SU12", "2024": "SU3" }`), `statut`, `remplacePar`, `sources` (`titre`, `url`, `consulte`, `rang`), `dateVerification`. Les textes sont bilingues : `{ "fr": "…", "en": "…" }`.

## Ajouter ou corriger un réglage

Fichier : [`donnees/parametres.json`](donnees/parametres.json). Si le réglage diffère entre 2020 et 2024 (nom, valeurs, effet), créez **deux entrées** (`tlod-2020`, `tlod-2024`).

Champs propres : `categorie`, `libelle`, `valeurs`, `impact` (`cpu`, `gpu`, `vram`, de 0 à 3), `explication`, `coutVisuel`, `departSelonGoulot` (un texte pour `cpu`, `gpu`, `vram`, `streaming`, `indetermine`), `testValidation`.

Si le réglage figure dans le fichier `UserCfg.opt` du simulateur, ajoutez sa correspondance dans [`donnees/usercfg.json`](donnees/usercfg.json) (chemin de la clé, type, valeurs) et un cas dans `tests/usercfg.test.js`.

## Ajouter une règle (message affiché selon le diagnostic)

1. Dans [`donnees/regles.json`](donnees/regles.json) : l'entrée (texte bilingue, `type`, `gravite`, sources).
2. Dans [`js/moteur/regles.js`](js/moteur/regles.js) : la condition, une petite fonction sous le **même id**, qui reçoit le contexte calculé par le moteur.
3. Un test dans `tests/regles.test.js`. Un test vérifie aussi que chaque règle du JSON a sa fonction, et inversement.

## Ajouter une question du mode challenge

Fichier : [`donnees/challenges.json`](donnees/challenges.json). Une question s'affiche quand l'utilisateur a changé un des `reglages` (début d'id d'un paramètre) dans le `sens` indiqué (`baisse` ou `hausse`), avec un goulot de la liste `goulots` (vide : tous). Au moins un choix doit être correct ; chaque choix porte son explication. Ajoutez un cas dans `tests/challenge.test.js`.

## Ajouter un matériel

Fichier : [`donnees/materiel.json`](donnees/materiel.json). Les cartes sont décrites **par famille** (RTX 50, RTX 40…) avec une expression régulière `motif` qui reconnaît le modèle saisi, et leurs capacités (`dlssSR`, `generationImages`, `multiGeneration`). Ajoutez un cas dans `tests/moteur.test.js` (bloc « materiel »).

## Signaler ou marquer une règle obsolète (après une Sim Update)

- **Vous n'êtes pas développeur** : ouvrez une *issue* sur GitHub en indiquant l'entrée, la Sim Update et ce qui a changé (capture, note de version).
- **Pour marquer l'entrée** : passez son `statut` à `obsolete` et, si une nouvelle entrée la remplace, renseignez `remplacePar` avec son id. Une entrée obsolète n'est plus affichée.
- **Pour trouver ce qui doit être revu** après une mise à jour :

  ```bash
  npm run verifier -- --avant 2024:SU8
  ```

  liste les entrées testées avant cette Sim Update, celles « à vérifier » et celles vérifiées il y a plus de six mois.

## Code

- JavaScript sans dépendance ni construction ; logique dans `js/moteur/` (fonctions pures, testées), affichage dans `js/app.js`, `js/interfaceJournal.js`, `js/interfaceIa.js`.
- Commentaires en français, code lisible plutôt que court.
- Aucun script en ligne dans les pages (règle de sécurité du site) ; textes d'interface dans `js/textes.js`, en français et en anglais.
- Accessibilité : chaque champ a son libellé, les messages importants sont annoncés aux lecteurs d'écran.
