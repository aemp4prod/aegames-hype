# Les emojis du jeu (style « Autocollant »)

Chaque emoji de Hype est un petit dessin original, écrit en Python : aplats de deux tons au plus, épaisse bordure blanche
découpée, petite ombre. Le jeu les affiche partout où un emoji s’affiche ; ceux qu’on n’a pas dessinés restent ceux du
téléphone.

- `src/catalog.py` (0.17) et `src/catalog2.py` (0.27) : la liste des emojis, avec leur caractère exact, leur nom, leurs
  mots de recherche et leur catégorie (visages, mains, coeurs, objets, symboles).
- `src/faces.py`, `hands.py`, `symbols.py` (0.17), `faces2.py`, `objets.py`, `objets2.py` (0.27) : les dessins, sur une
  grille de 128 × 128 ; `parts.py`, `geom.py` et `stk.py` : la palette, les pièces communes et le peintre.
- `svg/` : les dessins produits ; `index.json` : la liste, telle que le jeu la reçoit.

Pour refaire les dessins puis `src/emoji-data.js` (à ne jamais modifier à la main) :

```bash
python3 tools/emoji/src/build.py      # les 67 de la 0.17 et le Minotaure du train
python3 tools/emoji/src/build2.py     # les 57 de la 0.27 (ou seulement certains : build2.py cafe pizza)
python3 tools/emoji/make_data.py
```

Pour en ajouter un : sa ligne dans `catalog2.py`, son dessin (une fonction dans le module de sa famille, ajoutée à la
liste en bas du fichier), puis les trois commandes. `tools/prev.cjs` fait une planche de contrôle (Playwright) aux tailles
96, 48 et 20 px, sur fond clair, blanc et sombre : `node tools/emoji/tools/prev.cjs planche.png cafe,pizza`.
