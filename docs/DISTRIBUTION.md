# Publier Hype pour Æ Games Launcher

Hype se publie en **GitHub Release**. Le launcher ne clone rien : il lit le manifeste de la dernière release, télécharge
l’archive, la vérifie, l’extrait et lance `Hype.exe`. Ce document suit la demande de l’équipe du launcher
(« Publication de Hype pour Æ Games Launcher »).

## Le principe

| Élément | Pour Hype |
| --- | --- |
| Dépôt | `aemp4prod/aegames-hype`, public : les sources et les Releases au même endroit |
| Tag | `hype-vX.Y.Z` (ex. `hype-v0.26.0`) : un tag poussé déclenche la publication |
| Assets de chaque Release | `Hype-X.Y.Z-windows-x64.zip` et `manifest.json` |
| Manifeste « latest » | `https://github.com/aemp4prod/aegames-hype/releases/latest/download/manifest.json` |
| Exécutable | `Hype.exe`, à la racine de l’archive |
| Données du joueur | `%APPDATA%\Hype` (parties, réglages, connexion ChatGPT), jamais dans le dossier du jeu |

Le tag, la version de `desktop/package.json`, celle de `src/core.js` (`APP_VERSION`), le nom du ZIP et l’URL de
l’archive désignent toujours la même version : le workflow refuse de publier sinon.

## Les deux manifestes

- **Le manifeste local**, `manifest.json` à la racine du build et donc de l’archive : identité, version, canal,
  plateforme, exécutable et la liste de tous les fichiers du jeu, chacun avec sa taille exacte et son SHA-256 (hexadécimal
  en minuscules). Pas d’objet `archive` : l’archive le contient, ce serait circulaire. Il ne se décrit pas lui-même.
- **Le manifeste distant**, `manifest.json` joint à la Release : le même, plus `archive` (l’URL immuable du ZIP de cette
  release, jamais `latest`, sa taille et son SHA-256).

Les chemins sont relatifs à la racine du dossier d’installation, séparés par `/`, sans `..` ni lecteur.

```json
{
  "schemaVersion": 1,
  "game": { "id": "hype", "name": "Hype" },
  "version": "0.26.0",
  "channel": "stable",
  "platform": "windows-x86_64",
  "executable": "Hype.exe",
  "archive": {
    "url": "https://github.com/aemp4prod/aegames-hype/releases/download/hype-v0.26.0/Hype-0.26.0-windows-x64.zip",
    "size": 156221675,
    "sha256": "d6bd3401896658ca6c62c03c343600a5a8d601a30c0fd8da866b7d42aa4d00ce"
  },
  "files": [
    { "path": "Hype.exe", "size": 245589504, "sha256": "700e44b6450055608c80c64351c13c6efe584530ecef8fd2016eccad38a27632" },
    { "path": "resources/app.asar", "size": 26768669, "sha256": "3f3aa8f773dc126802e9fd8ff59aee119ff9570812c11d20958cceff0e0d29f3" }
  ]
}
```

L’archive contient le dossier du jeu directement à sa racine (pas de dossier `Hype/` englobant) :

```text
Hype-0.26.0-windows-x64.zip
├── Hype.exe
├── manifest.json
├── resources/ (app.asar, licences)
├── locales/
└── les DLL et fichiers d’Electron
```

Pour les mêmes fichiers, le ZIP est identique octet pour octet (chemins triés, dates fixes).

## Publier une version

1. Monter la version dans `desktop/package.json` et `src/core.js` (`APP_VERSION`), ajouter sa section en tête de
   `CHANGELOG.md` (titre `## X.Y.Z — date`, puis les notes décrites plus bas) : ce sera la description de la Release,
   affichée dans le launcher.
2. Puis :

```powershell
git add .
git commit -m "Prépare Hype 0.26.0"
git push origin main
git tag hype-v0.26.0
git push origin hype-v0.26.0
```

Le workflow `.github/workflows/release.yml` fait le reste, sur un runner Windows : sources, `npm ci`, build portable
Windows x64 (`npm run release:launcher`), manifeste local, ZIP, manifeste distant, vérification complète, Release non
brouillon marquée « latest » avec les deux fichiers, puis il relit le manifeste « latest » en ligne et refait toutes les
vérifications depuis Internet.

Si le code est déjà sur `main` (poussé par quelqu’un d’autre, Claude par exemple), il ne reste que le tag : `git pull`,
puis `git tag hype-vX.Y.Z` et `git push origin hype-vX.Y.Z`.

### Les notes de version

Æ Games Launcher affiche la description de chaque Release, en Markdown : c’est la section de la version dans
`CHANGELOG.md`, sans son titre. Elle s’adresse aux joueurs :

- une première ligne en gras qui dit l’essentiel de la mise à jour ;
- des sous-titres `###` : `✨ Nouveautés`, puis au besoin `💡 Bon à savoir` et `🛠️ Corrections` ;
- une puce par changement : son nom en gras, avec un emoji qui le résume, puis une ou deux phrases au tutoiement, sans
  détail technique ni révélation sur les pièges du jeu ;
- une ligne par puce ou par paragraphe, sans retour à la ligne au milieu d’une phrase : GitHub et le launcher
  afficheraient la coupure ;
- jamais de titre `##` dans la section : il ouvrirait la version suivante.

### Si un jour les sources deviennent privées

Une Release d’un dépôt privé n’est pas téléchargeable sans authentification, et le launcher ne contient aucun jeton. Il
faudrait alors un dépôt public de distribution (avec au moins un commit), puis, dans ce dépôt-ci, Settings → Secrets and
variables → Actions : la variable `HYPE_BUILDS_REPO` (ce dépôt public) et le secret `HYPE_BUILDS_TOKEN` (un jeton GitHub
à accès fin, limité à ce dépôt public, droit « Contents : Read and write »). Le workflow y publierait les Releases. Tant
que la variable n’existe pas, il publie dans ce dépôt-ci, avec le jeton automatique de GitHub Actions : rien à régler.

## Sur un ordinateur, sans GitHub Actions

Dans `desktop` (Node 22) :

- `npm run release:launcher` : build portable (`dist/win-unpacked`, avec son `manifest.json`), puis dans
  `dist/release` le ZIP et le manifeste distant, et la vérification. Le dépôt visé se règle avec
  `HYPE_BUILDS_REPO=propriétaire/dépôt` (par défaut `aemp4prod/aegames-hype`).
- `npm run release:win` : la même chose, plus l’installateur classique `dist/Hype-Setup-X.Y.Z.exe`, fait à partir du
  même dossier : une installation faite avec lui a donc aussi son `manifest.json`.
- `node scripts/verify-release.mjs` rejoue le contrat du launcher sur `dist/release` : taille et SHA-256 de l’archive,
  extraction en refusant tout chemin dangereux, manifeste local identique au distant (sans `archive`), chaque fichier
  vérifié, rien en trop. Avec `--manifest <URL>`, il le fait sur une release publiée (le ZIP est alors téléchargé).

## À transmettre à l’équipe du launcher

- URL du dépôt de distribution : `https://github.com/aemp4prod/aegames-hype` (sources publiques et Releases)
- Manifeste « latest » : `https://github.com/aemp4prod/aegames-hype/releases/latest/download/manifest.json`
- Tag et version de test : `hype-v0.26.0`, version `0.26.0`, canal `stable`
- Exécutable : `Hype.exe`
- Exemple de manifeste : celui de la Release `hype-v0.26.0` (ci-dessus, la liste `files` abrégée à deux fichiers sur 21)
- Sauvegardes : `%APPDATA%\Hype` (le dossier d’installation peut être supprimé ou remplacé sans rien perdre)
