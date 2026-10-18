# Changelog

Les versions de Hype, de la plus récente à la plus ancienne. Chaque version a son tag `hype-vX.Y.Z` et sa GitHub
Release : la section de la version en est la description, telle quelle, et Æ Games Launcher l’affiche aux joueurs (le
format est décrit dans docs/DISTRIBUTION.md). Le numéro entre parenthèses (MAJEURE × 1 000 000 + MINEURE × 1 000 +
CORRECTIF) ne fait que monter.

## 0.27.7 — 18 octobre 2026 (build 27007)

**Des fenêtres qui se déplacent, se redimensionnent et se rangent, et des noms pour tes sauvegardes et tes parties.**

### ✨ Nouveautés

- **🪟 Des fenêtres libres** (sur ordi) : tire une fenêtre par sa barre de titre (publication, programmation, boutique, inventaire, messages…) et elle flotte au-dessus du jeu, là où tu la poses ; son coin la redimensionne. Le jeu reste utilisable derrière : tu changes d’onglet, tu lis un message, la fenêtre reste là. Chaque type de fenêtre retient sa place et sa taille, et un bouton la remet au centre.
- **➖ Réduire** : un bouton range n’importe quelle fenêtre dans une barre en bas de l’écran, avec tout ce que tu y as déjà rempli. Un clic la ramène telle quelle. Sur téléphone aussi.
- **💘 Les rendez-vous** : la fenêtre d’un rendez-vous se déplace et se redimensionne, mais elle ne se réduit pas, et le reste du jeu reste bloqué tant qu’il dure.
- **✏️ Renommer** : chaque sauvegarde (les tiennes comme les automatiques) se renomme d’un clic sur ✏️, et son nom reste quand tu y reviens. Tes parties se renomment aussi, sur l’écran d’accueil.
- **📝 Rien ne se perd** : ce que tu as tapé pour publier (titre, légende, accroche, sponsor…) ou pour préparer un tournage (le sujet, ce qui se passe, la difficulté) revient quand tu rouvres la fenêtre, même après l’avoir fermée.

### 💡 Bon à savoir

- Un mini-jeu chronométré qu’on réduit continue de tourner : son chrono ne s’arrête pas.

## 0.27.6 — 18 octobre 2026 (build 27006)

**Une grande passe de corrections sur tout ce qui est arrivé ces derniers jours : sorties programmées, contrats, devis, inventaire et mini-jeux.**

### ✨ Nouveautés

- **⏳ Le temps qui reste** : quand l’heure d’une sortie est passée, sa carte dit combien de temps il te reste pour la tourner ou la publier avant qu’elle soit abandonnée.

### 🛠️ Corrections

- **📅 Les défis gardent leur heure** : « Plus tôt » ne s’applique plus aux épisodes d’un défi Daily Upload. Comme pour « Repousser », ils sortent à heure fixe.
- **⏱️ Chacune son tour** : une sortie prévue juste derrière une autre a maintenant son propre délai, qui commence quand vient son tour. Elle n’est plus abandonnée d’office pendant que tu publies la première.
- **🎬 Jamais en plein jeu** : une sortie ou un rendez-vous en retard n’est plus abandonné pendant que tu es en train de le jouer.
- **📣 Deux annonces, deux sorties** : deux contenus annoncés le même jour sur deux sujets différents donnent bien deux sorties, et une vidéo annoncée à côté d’un live aussi. Un simple rappel (« plus que 30 minutes ! ») reste la même sortie.
- **💌 Une question, une vidéo** : la question d’un abonné ne peut plus être programmée deux fois, et ne compte qu’une fois.
- **🗣️ Tout le monde est au courant** : les personnages connaissent toutes tes sorties prévues, jusqu’à 6 (4 avant).
- **🤝 Les contrats** : quand un acompte est remboursé, ton agent te rend aussi sa commission dessus. Une marque qui paie en produits et ajoute un cachet t’envoie bien les deux, et le contrat affiche les deux. Les montants négociés sont ceux écrits dans la discussion, sans arrondi, et un avenant ne fait plus passer l’acompte au-dessus du prix.
- **💔 Les ruptures** : un contrat rompu te facture aussi les produits que la marque t’avait envoyés, comme le matos offert. Une marque qui rompt parce que tu as revendu son cadeau te facture ce qu’elle t’avait donné.
- **🔒 L’exclusivité** : elle ne bloque plus la signature. Le jeu te dit ce que ça va te coûter (contrat rompu, pénalité, réputation), puis c’est toi qui décides.
- **🧾 Le devis** : il tient compte de ce que tu as écrit dans « Ce qui se passe » avant de le demander. Un objet de l’inventaire qui couvre une ligne est utilisé (et consommé si le tournage le consomme) au lieu d’être gratuit à chaque devis. Un objet compté « déjà là » puis vendu ou mis en vente bloque le paiement. Un prix écrit en texte (« 4,50 € ») compte enfin.
- **📑 Plusieurs devis** : deux sorties ne partagent plus le même devis, et un sponsor déjà prévu pour une sortie n’est plus proposé pour une autre.
- **📦 L’inventaire** : un prix trois fois trop élevé ne part plus (avant, même dix millions finissait par se vendre). Du matos en panne ou chez le réparateur qui part dans l’inventaire n’est plus perdu : sa réparation continue et tu peux le réutiliser. Les favoris s’accumulent vraiment, et un inventaire plein ne supprime plus jamais un objet en vente.
- **🎮 Ne rien faire ne paie plus** : la modération du chat, le mixage, le recadrage et la remise en ordre donnaient un résultat moyen sans toucher à rien. La modération compte maintenant les messages que tu supprimes à raison et les fans que tu épargnes, avec un chat plus lent et des messages qui restent plus longtemps.
- **🤖 Sans réponse de l’IA** : le tournage passe une épreuve d’adresse au lieu du même jeu trop facile à chaque fois. En Cauchemar, le jeu te le dit, et tu peux réessayer ou changer de difficulté.
- **⌨️ Le clavier** : les touches vont au mini-jeu au premier plan, et plus du tout pendant que tu écris un message.
- **🔕 Pas de pop-up pendant un mini-jeu** : plus de notification ni de fenêtre par-dessus un mini-jeu en cours, sauf ce que tu as demandé toi-même.
- **🐞 Divers** : un rendez-vous ne plante plus quand l’IA change de format en cours de route, et « l’ancien est dans ton inventaire » ne s’affiche que quand c’est vrai.

### 💡 Bon à savoir

- La modération du chat a été réglée avec les mêmes joueurs simulés que les autres mini-jeux : en Mythique, un joueur moyen arrive surtout à des tournages moyens, un joueur rapide réussit souvent.

## 0.27.5 — 18 octobre 2026 (build 27005)

**Des mini-jeux enfin à taille humaine, même en Mythique.**

### 🛠️ Corrections

- **⏱️ Le temps de lire** : le chrono du quiz, du vrai ou faux, du tri, de l’ordre et de l’intrus suit maintenant la longueur de ce qu’il y a à lire. Une question de trois lignes a plus de temps qu’une question de trois mots, et jamais moins qu’avant.
- **🎯 Mythique jouable** : une question de quiz typique a maintenant environ 12 secondes (8 avant), une série de l’intrus 9 (7 avant), et les affirmations longues du vrai ou faux ont le temps d’être lues. C’est toujours très dur, mais faisable.
- **🎚️ Le mixage** : à partir d’Expert, la bande verte est plus large et les pistes dérivent moins vite.
- **🧮 Le quiz et l’intrus en Facile** : 4 questions au lieu de 3, pour qu’une seule erreur ne te prive plus d’un tournage réussi.
- **🧾 Le devis** : un partenariat ne paie plus ce qui n’a rien à voir avec lui. Une marque ne fournit que son propre produit, et seulement si ton contenu s’en sert vraiment : la bêta d’un jeu ne couvre plus les livres d’une vidéo sur le droit.

### 💡 Bon à savoir

- Chaque difficulté a été réglée en faisant jouer des joueurs simulés, un lecteur moyen et un lecteur rapide : en Mythique, le premier réussit rarement, le second souvent.
- Pendant un quiz, la barre de temps de chaque question montre son propre chrono.
- Cauchemar ne change pas : ses vraies questions de connaisseur gardent leur chrono.

## 0.27.4 — 18 octobre 2026 (build 27004)

**Plusieurs sorties programmées d’un coup, des acomptes qui tombent vraiment, et des mini-jeux enfin jouables.**

### ✨ Nouveautés

- **📅 Plusieurs sorties à la fois** : tu peux programmer jusqu’à 6 sorties d’avance (vidéos, shorts, lives…), même pendant un défi Daily Upload. La plus proche passe en premier, les autres attendent leur tour, et tu les retrouves toutes dans le Programme du Studio.
- **⏩ Sortir plus tôt** : une sortie prévue peut être avancée à l’heure de ton choix avant la date annoncée, ou tout de suite. Aucun malus : ton public l’a juste plus vite.

### 🛠️ Corrections

- **💸 L’acompte** : quand une marque accepte de te verser un acompte en message, il est maintenant inscrit dans le contrat et versé à la signature. Sur un contrat déjà signé, si elle accepte de l’augmenter, la différence tombe tout de suite. La carte du contrat affiche l’acompte prévu.
- **🎨 Adieu l’étalonnage** : ce mini-jeu était bien trop dur, il est retiré du tournage comme du montage.
- **⏱️ Plus de temps pour répondre** : 2 secondes de plus pour chaque réponse dans les mini-jeux, quelle que soit la difficulté. Chaque élément à trier, chaque question, chaque série, chaque image à retrouver, chaque message du chat et chaque coupe en profitent.
- **🗓️ Fin de mois** : si l’horloge du jeu revient en arrière, la paie de la plateforme, les abonnements de tes membres et les factures du mois ne tombent plus deux fois.

### 💡 Bon à savoir

- Par défaut, l’acompte reste de 30 % à la signature à partir de 500 €. En dessous, tout est payé à la livraison, sauf si tu en négocies un.
- Sans l’étalonnage, une vidéo ou un clip tire son mini-jeu parmi 7 au tournage, soit 1 chance sur 7 chacun (1 sur 6 avec un monteur dans ton équipe).
- Un post qui reparle d’une sortie déjà programmée ne crée pas de doublon : c’est la même sortie.

## 0.27.3 — 18 octobre 2026 (build 27003)

**Fini le quiz à chaque tournage : tous les mini-jeux ont enfin la même chance de tomber.**

### 🛠️ Corrections

- **🎲 Le mini-jeu du tournage** : jusqu’ici, l’IA choisissait le plus souvent le quiz, et les épreuves comme la coupe au rythme ne tombaient qu’une fois sur dix. Désormais, c’est le jeu qui tire au sort : chacun des 8 mini-jeux de ton format a 1 chance sur 8, quelle que soit la difficulté, et jamais le même deux fois de suite.

### 💡 Bon à savoir

- Pour une vidéo, les 8 mini-jeux sont : trier, remettre dans l’ordre, quiz, vrai ou faux, trouve l’intrus, le montage au rythme, la mémoire et l’étalonnage. Le short a le recadrage, le live la modération du chat, le podcast le mixage.
- Avec un monteur dans ton équipe, la coupe au rythme est pour lui : il reste 7 mini-jeux, 1 chance sur 7 chacun.
- Au montage, le mini-jeu change aussi à chaque fois : environ 1 chance sur 3 pour chacun, jamais celui du tournage.
- Le niveau Cauchemar garde son quiz de vraies questions de connaisseur : c’est tout son principe.

## 0.27.2 — 18 octobre 2026 (build 27002)

**Le recadrage vertical répond enfin au quart de tour.**

### 🛠️ Corrections

- **📱 Le recadrage vertical** : le cadre bouge dès que tu appuies sur ◀ ▶ ou sur les flèches du clavier, puis glisse plus vite tant que tu restes appuyé. Passer d’une flèche à l’autre ne le fige plus, et un bouton maintenu continue même si ta souris glisse à côté.
- **✨ Plus fluide** : le cadre et le sujet se déplacent sans à-coups, même sur un grand écran, et le bouton s’allume tant que le cadre bouge dans sa direction.

## 0.27.1 — 18 octobre 2026 (build 27001)

**Les nouvelles photos arrivent enfin chez tout le monde, même si tu as un Atelier photos, et plus aucune limite de photos par visage.**

### 🛠️ Corrections

- **📸 Les photos livrées avec le jeu** : si tu avais déjà travaillé dans l’Atelier photos, tes anciennes copies passaient devant elles (la streameuse aux mèches roses restait à ses anciennes photos, la DJ techno manquait à l’atelier). Désormais, à chaque mise à jour, ton atelier récupère tout seul les nouvelles photos, profils et visages du jeu, et garde tout ce qui vient de toi.
- **📦 Exporter le pack** emporte maintenant aussi les photos livrées avec le jeu, images comprises.

### 💡 Bon à savoir

- **♾️ Plus de limite de photos** : l’atelier ne compte plus tes photos sur un objectif de 135, et chaque visage peut en avoir des centaines.
- Tu n’as jamais ouvert l’Atelier photos ? Rien ne change pour toi : toutes les photos étaient déjà dans ton jeu.

## 0.27.0 — 18 octobre 2026 (build 27000)

**57 nouveaux autocollants, un étalonnage enfin juste, un devis qui connaît tes partenariats… et 86 nouvelles photos pour la streameuse aux mèches roses.**

### ✨ Nouveautés

- **😄 57 nouveaux autocollants** : ton téléphone, ton café, ta manette, le clap, les cœurs de toutes les couleurs, le cœur avec les mains, l’argent qui s’envole… 124 emojis dessinés pour Hype en tout, et un onglet **Objets** dans le clavier.
- **📸 La streameuse aux mèches roses** se dévoile : 86 nouvelles photos de sa vie de gameuse et de pâtissière (bureau gaming, labo de pâtisserie, métro, soirées pizza…), rangées en séries comme de vrais shootings, et une nouvelle photo de profil. Son prénom change toujours d’une partie à l’autre.
- **🧾 Un devis qui sait ce que tu as** : ce qu’une marque t’a envoyé, un cadeau, ce que tu t’es offert… tout ce qui sert déjà ton tournage s’affiche dans « Déjà là, rien à payer ». Ce que le tournage consomme quitte ensuite ton inventaire.

### 🛠️ Corrections

- **🎨 L’étalonnage** juge enfin ce que tu vois : deux plans qui se ressemblent à l’œil sont raccord, même avec des réglages différents. Après chaque plan, le jeu te dit ce qui clochait (« un peu trop chaud », « trop sombre »…).
- **📱 Le recadrage vertical** : les boutons ◀ ▶ vont maintenant plus vite que le sujet, même aux plus hautes difficultés. Les autres épreuves du tournage et du montage ont été passées au crible : elles restent jouables à toutes les difficultés.

## 0.26.0 — 17 octobre 2026 (build 26000)

**Nouveau : ton inventaire, et Occaz, l’appli de seconde main. Tout ce que tu reçois, tu le gardes… ou tu le revends.**

### ✨ Nouveautés

- **🎒 Ton inventaire**, dans ton studio : ton ancien matos quand tu en achètes un meilleur, ce que les marques t’envoient, ce que tu t’offres et les cadeaux qu’on te fait, en messages comme en rendez-vous. Un matos se remet en service d’un geste.
- **🏷️ Occaz**, pour revendre : tu fixes le prix, le jeu te dit ce que ça vaut et à quelle vitesse ça partira. Plus ta commu est chaleureuse et plus tu es suivi, plus tes abonnés paient cher ce qui vient de toi. Les ventes se font au fil du temps du jeu, sans rien consommer de ton usage ChatGPT.

### 💡 Bon à savoir

- Le jeu ne revend plus rien à ta place : un cadeau de marque meilleur que ton matos se met en service, sinon il t’attend dans ton inventaire.
- Revendre trop vite un cadeau, ça peut se voir : la marque ou la personne qui te l’a offert peut tomber sur ton annonce… et c’est elle qui décide comment elle le prend.

### 🛠️ Corrections

- On écrit enfin « Anneau lumineux acheté », et non plus « achetée ».

## 0.25.3 — 17 octobre 2026 (build 25003)

- La nuit continue : quand une soirée se termine à deux, l’horloge avance jusqu’au lendemain matin (sans appel IA en
  plus) et une carte « 🌅 Le lendemain matin » raconte le réveil, chez l’un ou chez l’autre, tendre et pudique. Elle se
  garde aussi dans « Tes rendez-vous ». Tu es encore là : un bandeau le dit au-dessus du fil et dans vos messages, et la
  personne te parle comme quelqu’un qui est avec toi. Le reste du jeu le sait, mais seuls ceux qui sont au courant de
  votre histoire y font allusion. « Rentrer chez toi » y met fin, sinon la matinée finit d’elle-même.

## 0.25.2 — 17 octobre 2026 (build 25002)

- Les montages qu’on te commande : tu choisis la difficulté (de Facile à Mythique), comme pour tes vidéos. Elle fixe
  jusqu’où le montage peut monter : même sans faute, Facile reste « bon », Moyen va jusqu’à « très bon », Difficile
  jusqu’à « excellent », et « légendaire » demande Expert ou plus. Le client dit ce qu’il attend selon son audience et
  s’il paie ; un montage légendaire cartonne sur sa chaîne. Le jeu retient ta dernière difficulté.
- Correction : les marques disaient que leur proposition était clôturée dès que tu négociais (depuis la 0.20, le jeu
  leur disait à tort que le partenariat était fini). Une offre ouverte se négocie de nouveau, et un contrat signé
  accepte de nouveau un avenant.

## 0.25.1 — 17 octobre 2026 (build 25001)

- Ta photo de profil : l’appareil photo sur ton avatar la change. Tu dis ce qu’on y voit si tu veux, puis tu choisis :
  l’annoncer en post (tout le monde a un avis : compliments, vannes de potes, piques des rivaux, inconnus qui trollent ;
  la photo s’affiche ronde dans le fil) ou juste la changer (quelqu’un pourra la remarquer au prochain échange, sans
  appel en plus). Les persos connaissent ta photo par sa description et peuvent la ressortir quand ils veulent.

## 0.25.0 — 17 octobre 2026 (build 25000)

- Quatre nouveaux mini-jeux, joués sans l’IA : modérer le chat d’un live, le mixage d’un podcast, le recadrage vertical
  d’un short, l’étalonnage d’une vidéo. Ils arrivent au tournage selon le format, et le montage tourne lui aussi (la
  coupe au rythme, le dérushage, l’étalonnage, le recadrage, le mixage), jamais le même jeu qu’au tournage. Plus la
  difficulté monte, plus c’est rapide, serré et chargé.

## 0.24.0 — 17 octobre 2026 (build 24000)

- Les compétences revues : charisme, humour, audace et créativité montent de 0 à 50 en jouant, lentement (chaque post,
  message, rendez-vous, vidéo ou service entraîne celle qu’il montre), avec un palier tous les cinq niveaux. Elles
  servent les échanges (relations, confiance, likes, viralité, réputation, vues, merch, services), jamais les mini-jeux.
  Le profil dit ce que chacune apporte en chiffres, et son arbre montre les paliers. Les niveaux du joueur ne donnent
  plus de points à placer ; les parties en cours gardent leur progression.
- Ce que tu paies dans les échanges (des roses, l’addition, une tournée, un cadeau…) se paie pour de vrai : l’IA dit
  quoi et combien, le jeu le prend sur ton argent, et un ticket le montre. Le charisme fait baisser les cadeaux et les
  sorties, parfois jusqu’à les rendre offerts ; l’audace fait négocier. Pas assez d’argent : carte refusée.

## 0.23.1 — 17 octobre 2026 (build 23001)

- « Le réseau vit tout seul » se met en pause dès que Hype n’est plus devant toi (une autre appli, la fenêtre réduite)
  ou que tu ne touches plus à rien depuis 3 minutes, et repart quand tu reviens. Une ligne au-dessus du fil dit s’il vit
  ou s’il est en pause.
- Ses quatre crans : Coupé, Doux (toutes les 15 minutes), Normal (8 minutes), À fond (5 minutes). Les commentaires aussi
  en quatre crans : Peu, Normal, Beaucoup, Énorme. Chaque cran dit ce qu’il coûte par heure.
- « Où passent tes cafés » : ce que chaque chose a coûté aujourd’hui ou depuis le début de la partie.

## 0.23.0 — 17 octobre 2026 (build 23000)

- Services aux autres créateurs : propose en privé de monter la vidéo de quelqu’un ou de faire sa miniature. Si le
  personnage accepte, la commande arrive dans vos messages (ce qu’il veut, payé ou entre amis, le délai) et il t’envoie
  ses rushs quand il l’a dit (des fichiers de jeu de rôle, juste leurs noms). La vidéo sort sur sa chaîne et te
  mentionne : tu gagnes des abonnés selon sa notoriété et la façon dont la vidéo marche. Bâclé, ça fait un flop : il
  t’en veut un peu et ne paie que la moitié.
- Rendez-vous : la conversation et l’historique « Tes rendez-vous » ne collent plus aux bords de l’écran.

## 0.22.4 — 17 octobre 2026 (build 22004)

- Rendez-vous : chaque soirée se garde et se relit en entier (« Tes rendez-vous » dans le profil, sur la fiche de la
  personne, ou « Relire la soirée » sous son récit), avec un bouton pour la copier et la montrer. Ce que la personne a
  pensé reste secret.

## 0.22.3 — 17 octobre 2026 (build 22003)

- Rendez-vous : la soirée ne s’arrête plus net au cinquième échange. Tu as un dernier mot avant de vous quitter (le
  raccompagner, rentrer ensemble, rester dormir, se revoir vite…), ou tu te dis juste au revoir. Le personnage accepte
  ou refuse selon son cœur, son rythme et la soirée ; si c’est oui, la scène s’arrête à la porte.
- Sponsors : un contrat payé en produits le dit clairement, de l’offre à la livraison : pas d’argent.
- Première version distribuée pour Æ Games Launcher (archive Windows et manifeste).

## 0.22.2 — 17 octobre 2026 (build 22002)

- Ce qui se passe en privé (un crush, un flirt, un rendez-vous, un bisou, un couple gardé secret, les messages) reste
  entre les deux personnes. Les autres ne l’apprennent que si ça se voit (couple annoncé, perso connu reconnu, photo qui
  circule) ou par le bouche-à-oreille, qui prend des heures et dépend de qui est bavard.

## 0.22.1 — 16 octobre 2026 (build 22001)

- Avancer le temps jusqu’à un rendez-vous ne fait plus croire aux personnages que le suivant est passé : ils lisent
  chaque rendez-vous avec son jour, son heure et le temps qui reste.
- De temps en temps, quelqu’un s’emmêle sur l’heure ou le jour d’un rendez-vous et te met un petit coup de pression ;
  le rendez-vous tient toujours, et il ou elle s’excuse dès que tu le relèves.

## 0.22.0 — 16 octobre 2026 (build 22000)

- Les adhésions : un abonnement payant pour ta communauté (YouTube, Instagram, TikTok), avec ses promesses (vidéos en
  avant-première, lives réservés aux membres), payé chaque mois.
- Le merch : jusqu’à trois pièces, fabriquées à la demande ou en stock, lancées par un post et vendues quelques semaines.
- Sponsors : une marque logique avec ta vidéo lui donne un peu plus de vues, une marque hors sujet un peu moins.
- Une vidéo à deux proposée par un ami se tourne au téléphone quand tu n’as pas d’ordinateur.
- Une sortie programmée pour l’heure qui vient sort bien aujourd’hui.
