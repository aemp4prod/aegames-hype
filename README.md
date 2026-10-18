# Hype

**Ta vie en ligne, version jeu.** Un jeu de réseau social où tout le monde est une IA, sauf toi :
tu postes, on te répond, on s’abonne, on s’attache… ou on te cancel. Gratuit, sans pub, open source.

Le jeu ne paie aucune IA lui-même : chaque joueur le fait tourner avec **son propre abonnement**.

| Version | Pour qui | Comment on joue |
| --- | --- | --- |
| **Hype pour Claude** | Tout compte Claude, même gratuit | Un artefact Claude : on ouvre le lien, on joue. L’usage compte sur le quota du joueur. |
| **Hype pour ChatGPT** | Abonnés ChatGPT Go, Plus ou Pro | Une appli pour ordinateur (Windows pour l’instant). On se connecte avec « Continuer avec ChatGPT », l’usage compte sur l’abonnement du joueur. |

ChatGPT gratuit ne peut pas encore servir à une appli extérieure : c’est une règle d’OpenAI, pas du jeu.

**Version 0.27.8 · alpha.** Réservé aux 18 ans et plus (chaque nouvelle partie le demande). Le jeu évolue vite et des sauvegardes de cette version pourraient ne pas suivre à 100 %.

## Dans le jeu

- **Ton fil** : tu postes, les personnages réagissent selon leur caractère (et ils ne sont pas toujours gentils : clashs,
  indignation, rumeurs à démentir, alliés qui te défendent, ennemis qui montent les autres contre toi). Les commentaires
  se répondent entre eux, et **« Voir plus de commentaires »** écrit ceux que le compteur annonce.
- **L’intensité du jeu** (à la création et dans les réglages) : **Calme**, **Normal**, **Vivant** ou **Ultime**. Chaque
  niveau garde toutes les fonctions : il règle la vie du monde (les persos qui t’écrivent, débarquent chez toi, lancent
  des drames ou fouillent ton passé, plus ou moins souvent), la mémoire envoyée à l’IA et le volume du fil, et affiche ce
  que coûte une heure de jeu (mesuré, en cafés). Deux réglages en quatre crans pour ce qui coûte le plus (0.23.1) :
  **« Les commentaires »** (Peu, Normal, Beaucoup, Énorme : plus de réactions sous tes posts, qui continuent d’arriver
  après coup ; à Énorme, en deux vagues, et les commentaires se chargent tout seuls), et dans l’appli ChatGPT **« Le
  réseau vit tout seul »** (Coupé, Doux, Normal, À fond : de nouveaux posts toutes les 15, 8 ou 5 minutes). Chaque cran
  dit ce qu’il coûte par heure. Le réseau se met en pause dès que Hype n’est plus devant toi (une autre appli, la
  fenêtre réduite) ou que tu ne touches plus à rien depuis 3 minutes, et repart quand tu reviens ; au-dessus du fil,
  une ligne dit s’il vit ou s’il est en pause. Depuis la 0.19, chaque demande n’envoie à l’IA que ce qui la concerne :
  15 à 30 % de moins pour un message privé ou un rendez-vous, et les vagues de réactions s’écrivent avec le post au lieu
  d’un appel à part.
- **Ta réputation, sur 1000** : quatre piliers (image, crédibilité, fiabilité pro, comportement), lente à gagner (de plus
  en plus lente vers le sommet, avec un plafond par jour de jeu), rapide à perdre, et un journal « Pourquoi elle bouge ».
  Presque tout la fait bouger : l’accueil de tes posts et ta façon de traiter les gens, tes promesses de vidéos tenues ou
  repoussées, tes contrats, tes salaires, les rumeurs, les captures, les lapins…
- **Les messages privés** : on négocie, on drague, on se confie… et une capture est vite partie. Les persos proches
  prennent aussi l’initiative : une sortie, une activité, une vidéo à tourner ensemble (acceptée, elle devient ta
  prochaine sortie dans le Studio, avec ce perso dedans : son public la voit aussi).
- **Les rendez-vous** : le premier avec quelqu’un est un mini-jeu écrit d’après où vous en êtes (vos messages, vos
  échanges publics, une dispute, un bad buzz) ; **les suivants se jouent pour de vrai** : une conversation de cinq
  échanges où tu réponds avec tes mots, jugée d’après qui tu as été avec ce perso en privé et en public (taquin en
  messages, taquin au rendez-vous : ça plaît), avec des **gestes à oser** au bon moment (payer, lui prendre la main,
  tenter un bisou, une photo ensemble, la demande en fiançailles…). Aucune note à l’écran : tu vois ses réactions, et
  ses messages après la soirée disent le reste, et c’est toi qui termines la soirée (sa dernière réplique reste à l’écran).
  À partir du deuxième rendez-vous, l’exigence ne dépend plus des abonnés mais de ce que vous vivez : votre relation et sa
  confiance, son cœur, ce qui pèse (un froid, une rumeur sur toi, son bad buzz, quelqu’un d’autre dans ta vie), l’enjeu
  du soir (un verre entre potes, un dîner en tête-à-tête, un grand soir), ce qu’il ou elle attend de la soirée (né de vos
  messages, jamais dit) et la célébrité pour de vrai (connu, on vous reconnaît en public, et une photo volée peut
  circuler ; chez l’un ou l’autre, la paix). Les gains suivent. Un perso peut annuler s’il ne veut plus te voir. Quand un perso te propose de vous voir, une
  **invitation** arrive dans vos messages : « Accepter » la met dans ton agenda (même dans plusieurs jours), « Décliner »
  répond poliment, et un « oui » écrit de ta main compte aussi. Option **Rendez-vous soignés** (à la création de la
  partie et dans les réglages, ≈ +1 café par rendez-vous) : la soirée se prépare dès que tu y vas et l’IA la relit.
  Depuis la 0.22.1, l’IA lit chaque rendez-vous avec son jour, son heure et le temps qui reste (et le jour de chaque
  message privé) : avancer le temps jusqu’à un premier rendez-vous ne lui fait plus croire que le suivant est passé. De
  temps en temps (un rendez-vous sur dix environ, et c’est l’IA qui choisit de le jouer), quelqu’un s’emmêle les
  pinceaux sur l’heure ou le jour et te met un petit coup de pression : le rendez-vous tient toujours, et il ou elle
  s’excuse dès que tu le relèves.
  Depuis la 0.22.3, la soirée ne s’arrête plus net au cinquième échange : tu as **un dernier mot** avant de vous
  quitter (le raccompagner, rentrer ensemble, rester dormir, se revoir vite… avec tes mots), ou tu te dis juste au
  revoir. Il ou elle accepte ou refuse selon son cœur, son rythme et la soirée ; si c’est oui, la scène s’arrête à la
  porte, pudiquement.
  Depuis la 0.22.4, chaque soirée se garde : **« Tes rendez-vous »** (dans ton profil, sur la fiche de la personne, ou
  « Relire la soirée » sous son récit dans vos messages) la redonne en entier, le lieu, vos mots, tes gestes, le dernier
  mot, la fin et le récit, avec un bouton pour la copier et la montrer. Ce que la personne a pensé reste secret.
- **Le cœur des persos** : chacun vit l’amour à sa façon (serein, prudent, anxieux, impulsif, jaloux), et chaque partie
  a dès le début au moins un vrai défi : une **forteresse** (très méfiante, très dure à convaincre) ou une star
  **inaccessible** (qui ignore les inconnus tant que tu ne t’es pas fait remarquer). Rien n’est affiché : ça se devine.
  Aller trop vite a des conséquences selon le cœur : il freine, panique (et répond tard), trouve ça louche (du love
  bombing ?) et en parle à un ami… qui peut enquêter sur ta vie ou en parler, parfois jusqu’à un ennemi. Insister
  empire tout : silence, colère, blocage, ou il t’affiche en public. Les impulsifs adorent la vitesse, et leur flamme
  retombe aussi vite. **Brûler les étapes** reste possible (un rendez-vous dès le troisième message, une déclaration
  surprise) : le perso te met au défi, et seules des réponses convaincantes le font craquer.
- **Les grandes étapes** : avant de vous mettre en couple, une épreuve (son bad buzz à traverser avec ton soutien
  public, une rumeur sur toi, une photo volée à expliquer, un rival, son meilleur ami à conquérir, un départ où il
  faut garder le lien, son secret) : réussie, vous êtes ensemble ; ratée, ce sera pour plus tard. Avant le mariage, un
  doute à apaiser ou la liste des invités (celui que tu oublies le prend mal). En couple, tu l’annonces sur le réseau
  ou vous le gardez pour vous deux (jusqu’à ce que ça fuite) ; son bad buzz t’éclabousse ; sans nouvelles, ça
  s’éloigne jusqu’à la pause ; et une capture de tes messages à quelqu’un d’autre peut tout faire exploser. Un couple
  annoncé fait grandir les deux (le plus petit compte gagne le plus) et, pendant une semaine, tes vidéos sont plus
  regardées. En couple, une soirée peut devenir tendre (se blottir, rester dormir) : dès que ça irait plus loin, la
  scène s’arrête sur « La suite appartient à leur intimité ».
  **Depuis la 0.25.3, la nuit continue** : quand la soirée se termine à deux, l’horloge avance jusqu’au lendemain matin
  (sans appel IA en plus) et une carte « 🌅 Le lendemain matin » raconte le réveil, chez l’un ou chez l’autre, tendre et
  pudique (elle se garde aussi dans « Tes rendez-vous »). Tu es encore là : un bandeau le dit au-dessus du fil et dans
  vos messages, et la personne te parle comme quelqu’un qui est avec toi. Le reste du jeu le sait aussi, mais seuls ceux
  qui sont au courant de votre histoire y font allusion. « Rentrer chez toi » y met fin, sinon la matinée finit d’elle-même.
- **Le bouche-à-oreille** : les persos vivent aussi entre eux. Chacun a ses proches et ceux qu’il ne supporte pas, et ça
  bouge avec l’histoire ; rien ne l’affiche, à toi de deviner qui est proche de qui. Ce qu’ils apprennent sur toi passe
  de l’un à l’autre, selon leurs amitiés et leur caractère : les bavards répètent, les fidèles gardent ça pour eux… et
  te préviennent.
  Un lapin, une méchanceté écrite en privé (et capturée), un rendez-vous avec quelqu’un d’autre quand tu es en couple,
  une insistance de trop : ça finit par se savoir. Tout dépend d’où ça arrive : la personne concernée le prend très mal,
  un ennemi en fait une rumeur (en grossissant le trait) ou une pique, un fiasco fait rire tout le monde, et le bien
  qu’on dit de toi t’ouvre des portes.
  Depuis la 0.22.2, ce qui se passe en privé (un crush, un flirt, un rendez-vous, un bisou, un couple gardé secret, ce
  qui se dit en messages) reste entre vous deux. Les autres ne le savent que si ça se voit (un couple annoncé, des
  fiançailles, une soirée où on vous a reconnus, une photo qui circule) ou si on le leur raconte : c’est le
  bouche-à-oreille, qui prend des heures et dépend de qui parle (un bavard raconte vite son bisou à son meilleur ami,
  un discret le garde). Et ce qu’un perso ne peut pas savoir, l’IA ne le lit pas quand elle écrit pour lui.
  Même les gentils ont des histoires : te rapprocher de quelqu’un (un ami proche, un couple annoncé, une vidéo à deux,
  le défendre en public) agace ceux qui ne le supportent pas. Ils refroidissent, lancent une pique ou, s’ils t’aiment
  bien, te le disent en privé, et ils se méfient de toi tant que tu restes proche de leur ennemi.
  Comme dans la vraie vie, tu ne sais pas qui a répété quoi, sauf si la personne le dit.
- **Les persos voient ce que tu fais en public** : draguer quelqu’un dans les commentaires, être tout le temps chez la
  même personne, clasher un de leurs proches, oublier le post d’un ami… Les persos concernés le voient, d’autant plus
  que c’est répété et que tu es connu. Quand ça devient flagrant, chacun réagit à sa façon : une question, une pique,
  une taquinerie, bouder, ou laisser couler.
- **L’âge des persos** : chacun a un âge (18 ans et plus, toujours) et une maturité qui va avec. À 19 ans on est souvent
  immature (trolls, blagues bêtes, tacles), parfois très mûr. Une partie sur deux, un ou deux persos plus âgés, dans
  des rôles à part (mentor, patron, prof…), sans romance.
- **Tes secrets** : à la création (ou plus tard, depuis ton profil), jusqu’à trois secrets sur ton perso, chacun avec sa
  gravité : gênant, grave ou explosif. Personne ne les connaît… jusqu’à ce qu’ils sortent comme dans la vraie vie : tu en
  confies un en privé (le bouton **« Confier un secret »**, ou tes propres mots), un ennemi fouille dans ton passé, un
  confident le laisse échapper, un ami qui enquête sur toi tombe dessus. Celui qui le tient et t’en veut peut le balancer
  en public. Tu réponds comme tu veux : démentir (un mensonge, que celui qui sait peut prouver plus tard), assumer,
  t’excuser ou te taire ; ce sont les IA qui décident si elles te croient. Avouer en premier, dans un post, coûte bien
  moins cher que de te faire griller. Une pub cachée devient aussi un secret (ton contact chez la marque le sait).
- **Les dilemmes** : ce sont les persos qui te tentent, en privé, quand la situation s’y prête (un tous les trois jours
  de jeu au plus). Un contrat signé alors que deux proches traînent autour : il y a des chances que les deux veuillent
  la seule place, et celui que tu écartes peut mal le prendre (selon son caractère, et si ça lui arrive souvent). Un ami
  t’apporte un dossier sur quelqu’un qu’il ne supporte pas ; une marque te propose bien plus pour cacher la pub ; une
  collab avec quelqu’un que ton partenaire déteste. Chaque choix laisse une trace (une capture, un témoin).
- **Les visites surprises** : un perso peut débarquer chez toi sans prévenir, parce que quelque chose le travaille (une
  drague vue en public, une rumeur, une trahison) ou pour une bonne raison. C’est son IA qui le décide. Ça s’ouvre
  par-dessus le jeu, et il faut lui parler, avec tes mots. Tu peux dire **« Pas maintenant »**, mais ça a un prix selon son
  caractère et surtout le sujet : une visite tranquille passe le plus souvent, un sujet urgent est presque toujours mal pris.
- **Les bad buzz des autres** : de temps en temps, l’IA fait tomber un perso dans un bad buzz tout seul (un vieux post
  qui ressort, une fuite, une promesse pas tenue…), sans toi. À toi de voir : le défendre en public (il s’en souvient,
  ça se sait, et ses ennemis le notent), en rajouter (ses ennemis apprécient), ou te taire (un proche laissé seul s’en
  souvient aussi).
- **Tout le monde peut compter** : la personne d’une marque qui négocie tes contrats, quelqu’un de ton équipe, un
  candidat… Dès que ça devient perso entre vous (il ou elle se confie, flirte, veut te voir en dehors du travail, ou
  vous devenez vraiment proches), il ou elle rejoint les persos principaux, et garde son travail : rendez-vous,
  couple, confiance, jalousies, rumeurs, tout marche comme avec les autres.
- **Les ponts coupés** : quelqu’un qui t’a bloqué une deuxième fois coupe les ponts. Tes messages ne lui parviennent
  plus (et ne coûtent rien) ; seul un geste fort, en public, peut le faire revenir.
- **La confiance** : à côté de la relation, chaque personnage a une confiance en toi, plus ou moins dure à gagner
  (son caractère, sa célébrité). Elle monte quand tu tiens parole et que tes conseils marchent ; à 40, 70 puis 90, il suit
  tes conseils (un post, une vidéo, sa réponse à un clash…) et peut te confier son secret. Un mauvais conseil lui vaut un
  bad buzz… et s’il comprend que tu l’as piégé, il te balance, et tout le monde se méfie de toi.
- **Le train de la hyyype** : deux vidéos virales d’affilée (un Moment viral acheté ne compte pas) lancent le train,
  annoncé par le Minotaure. Tant que tes posts marchent, il avance du niveau 1 au niveau 5 (plus il y a de Y, plus ça
  va vite) et tes posts portent plus loin ; à l’arrivée, de l’XP, et dès le niveau 3 les marques te remarquent. Quelques
  jours de pause entre deux trains.
- **Les emojis du jeu** : 124 autocollants dessinés pour Hype (67 depuis la 0.17, 57 de plus dans la 0.27 : objets du
  quotidien de créateur, visages, mains, cœurs), partout où un emoji s’affiche (ceux du téléphone quand il en manque
  un), et un bouton **Emojis** comme sur un clavier de téléphone : catégories, recherche par mot (joyeux, triste,
  drague…), les derniers utilisés en premier.
- **Ta cote** : un scandale, une mauvaise passe, le vent en poupe ou le sommet (affichée sous la barre du haut).
  Chaque personnage y réagit selon son **tempérament**, écrit par l’IA quand elle le crée : les fidèles restent, les
  intègres prennent leurs distances, les opportunistes suivent le vent, les envieux savourent ta chute ou jalousent ton
  succès, et certains se rapprochent quand tu es au plus bas… avec ou sans arrière-pensée. Ça touche aussi les marques
  (moins payées et plus rares dans un scandale, plus généreuses au sommet), tes recrues et ton équipe, et certains
  moments reviennent des jours plus tard (effets papillon), en bien ou en mal.
- **Le Studio** : ta chaîne (YouTube, TikTok, Instagram, Twitch ou Spotify), avec un écran de publication propre à
  chaque plateforme, les tendances du moment, l’argent qui suit les vraies règles (seuils de monétisation, partage des
  revenus, saisons : les pubs paient plus en fin d’année, moins en janvier et l’été), les sponsors à négocier
  (le prix, la mention « Collaboration commerciale », l’exclusivité, le délai, l’acompte : tout se discute en privé, et
  le contrat suit ce que vous décidez ; à toi de repérer les pièges ; par défaut, un cachet se paie 30 % à la signature
  dès 500 €, le reste à la publication ; depuis la 0.27.4, l’acompte négocié est inscrit au contrat, et une hausse
  acceptée sur un contrat signé est versée tout de suite ; les petites marques paient souvent en produits, pas en
  argent : c’est écrit sur l’offre, sur le contrat et à la livraison depuis la 0.22.3), une équipe à recruter
  (monteuse, graphiste, scénariste, community manager, agent, attachée de presse, avocate) et le défi **Daily Upload**
  (pas de report possible pendant un défi : le jeu le dit à la place du bouton « Repousser »).
  Depuis la 0.27.4, tu peux **programmer jusqu’à 6 sorties d’avance**, même pendant un défi : la plus proche passe en
  premier, les autres attendent leur tour dans le Programme du Studio, et chacune peut **sortir plus tôt** (maintenant,
  bientôt ou à une heure de ton choix avant la date prévue), sans aucun malus. Depuis la 0.27.6, un épisode de défi
  garde son heure (pas de « Plus tôt »), une sortie qui attendait derrière une autre a son propre délai quand vient son
  tour, et la carte d’une sortie en retard dit combien de temps il reste pour la tourner. Une exclusivité ne bloque
  plus une signature : le jeu dit ce qu’elle coûtera (contrat rompu, pénalité, réputation), puis c’est toi qui décides ;
  et une marque qui paie en produits peut ajouter un cachet : les deux sont versés.
  Depuis la 0.20, programmer une sortie commence par **le devis** : ce qu’il faut acheter, louer ou payer pour ce
  contenu-là (un jeu, une location, un circuit, des ingrédients…), à prix réalistes, jamais ton matos ni ce que tu as déjà
  acheté pour une ancienne vidéo. Il se paie pour programmer (un contenu sans rien à acheter reste gratuit) ; pour une
  vidéo annoncée dans un post, il arrive au tournage. C’est là qu’on associe une marque déjà signée, ou qu’on en démarche une.
  Depuis la 0.27, il connaît ton inventaire et tes partenariats : ce qu’une marque t’a envoyé, un cadeau, ce que tu t’es
  offert couvre un besoin sans rien payer (« Déjà là »), et ce que le tournage consomme quitte l’inventaire.
  Avant chaque tournage, tu peux raconter **ce qui se passe dans ta vidéo** : le mini-jeu, les réactions et la suite de
  la partie s’en servent. Après le tournage, **le montage** (couper au rythme, ou trier les rushes) fait gagner ou
  perdre jusqu’à 15 points à ta vidéo, puis **la miniature** des vidéos longues : tu la composes (fond, tête, texte,
  un détail) ou tu la dessines au doigt. Dans l’appli ChatGPT, en budget « Sans limite », l’IA peut finaliser ton
  croquis (si ta connexion ChatGPT permet de créer des images). Un monteur ou un graphiste dans ton équipe s’en charge.
  Une partie commence avec tes économies (de 0 à 1 000 €) : l’argent se gagne.
- **Le matos et ton point de départ** (0.20) : chaque partie démarre autrement (un vieux téléphone ou un récent,
  l’ADSL, une box 4G ou la fibre, des économies, parfois un atout ou un handicap), résumé sur la carte « Ton point de
  départ ». Au début, ton téléphone suffit pour les formats verticaux ; il faut un ordinateur pour les vidéos longues et
  une connexion qui tient pour les lives. Dans **la boutique** (Studio → Ton matos), téléphone, ordinateur, caméra,
  micro et lumière existent en quatre gammes, à acheter directement à la gamme voulue : le bas de gamme coûte quelque
  chose (un vieux téléphone filme moins bien, un PC d’occasion rame au montage et plante parfois au rendu : le montage
  est perdu, sauf avec le logiciel pro), le haut de gamme est très cher. Le matos s’use, tombe en panne, se casse ou
  se fait voler (l’assurance aide) ; la connexion a ses coupures, ses orages, un voisin qui pirate ton wifi (un live
  tombé pendant une coupure se décale sans perte). Les abonnements (box 5G, fibre avec frais d’installation, logiciel
  de montage pro, banque de sons libres de droits, assurance) sont prélevés chaque mois de jeu ; impayés, ils sont
  suspendus. Tous les six mois de jeu (le 1er mars et le 1er septembre), une nouveauté sort avec un bonus jamais vu,
  à un prix qui fait mal. Les parties commencées avant la 0.20 gardent leur argent et repartent avec un téléphone et
  une box 4G.
- **Les arnaques, les agents et les marques** (0.20) : comme en vrai, beaucoup d’offres ne sont pas honnêtes, et rien
  ne le signale : un « programme ambassadeur » où tu paies des frais, un faux « brief » à télécharger (un virus, ton
  compte piraté), une marque qui promet gros sans acompte et « paie à 60 jours »… jamais, un produit miracle rappelé
  ensuite (bad buzz), de la camelote (tes abonnés se plaignent), une clause piège au milieu des autres. Chaque marque a
  sa fiche (création, avis clients, partenariats), neutre pour toutes ; tes amis savent peut-être des choses (c’est leur
  IA qui décide), la marque n’avoue jamais. Quelques jours plus tard, un youtubeur critique, Le Démineur, démasque
  l’arnaque et cite ceux qui en ont fait la promo. Un agent lit les offres et te prévient en privé (mieux selon son
  niveau), mais un débutant peut t’amener une arnaque sans la voir ; au-dessus de son niveau, un gros contrat est un
  coup de poker (5 % de chances pour un débutant), et sans agent une grosse marque ne lâche presque rien. Une vidéo
  sponsorisée qui cartonne peut valoir une prime surprise, et la marque revient plus vite.
- **Ton audience** grandit de plus en plus lentement à mesure qu’elle grandit (0.20) : rien ne change jusqu’à 1 000
  abonnés, puis chaque nouvel abonné se mérite davantage.
- **Les pubs de tes vidéos** (0.21) : chaque contenu est jugé à sa sortie, d’après ce qu’on y voit vraiment (le sujet,
  ce que tu racontes, le titre, la miniature) : 🟢 toutes les pubs, 🟡 pubs limitées, 🔴 démonétisé. Sur YouTube,
  1 000 vues rapportent selon ce que vaut le sujet pour les annonceurs : moins d’1 € pour ce qu’ils fuient (le trash,
  l’horreur), environ 1,40 € pour le jeu vidéo ou l’humour, 5 € pour la cuisine, la nature ou le voyage, jusqu’à 11 €
  pour la finance ou la tech, ×1,5 en décembre ; ce prix ne baisse pas quand ton audience grandit. Avant de publier,
  tu peux déclarer ce que contient ta vidéo (violence, langage grossier, sujet sensible, contenu choquant) : déclarée,
  elle a au mieux des pubs limitées, sans sanction ; cachée et repérée, c’est un avertissement (trois en 90 jours :
  plus aucune pub pendant 30 jours). Une vidéo jaune ou rouge peut être réexaminée une fois, et ça ne marche pas
  toujours.
- **Des marques qui te ressemblent** (0.21) : les offres viennent de marques logiques avec ce que tu publies (du jeu
  vidéo et de la tech pour une chaîne gaming, de la beauté ou de la mode pour une chaîne beauté). Une chaîne aux
  vidéos limitées ou démonétisées attire moins de marques,
  surtout les plus frileuses. Une marque paie le même prix par vue attendue quelle que soit ta taille (environ 14 € les
  1 000 vues, moins pour quelques secondes dans un format court). Dans une vidéo, une marque logique avec le sujet lui
  donne un petit coup de pouce (+6 % de vues, et la marque donne plus souvent sa prime) ; une marque hors sujet, jugée
  par l’IA, un petit malus (−6 %). Parfois, une marque offre du matos au lieu de payer : le
  contrat dit lequel, sa gamme et sa valeur ; il arrive à la signature et remplace le tien s’il est meilleur (sinon,
  tu le revends d’occasion). Les arnaques existent aussi en matos offert.
- **Ta commu** (0.21) : une jauge dit si ta communauté est glaciale, froide, tiède, chaleureuse ou soudée. Des
  abonnés (des IA, toujours majeurs, jamais un personnage principal) t’écrivent en privé ou te posent des questions ;
  leur répondre la réchauffe, les laisser sans réponse la refroidit, et un bad buzz la glace. Une question peut devenir
  une vidéo (depuis la question, ou au moment de programmer) : l’abonné devient un habitué, qui te défend quand ça
  chauffe et donne plus en live. Réclamer des dons ou des abonnements dans tes posts la refroidit aussi.
- **Les dons en live** (0.21) : à partir de 500 abonnés, sur YouTube, Twitch, TikTok et Instagram, tes abonnés donnent
  pendant tes lives, d’autant plus que ta commu t’aime et que tes habitués sont là ; la plateforme garde sa part (de
  20 % sur Instagram à 50 % sur Twitch et TikTok). Après le live, tu peux remercier ceux qui ont donné.
- **Les adhésions** (0.22) : sur YouTube (dans le Programme Partenaire, dès 1 000 abonnés), Instagram (10 000) et
  TikTok (1 000), tes fans peuvent payer chaque mois : 1,99 €, 4,99 € ou 9,99 €, pour un badge et ce que tu promets
  (des vidéos en avant-première, des lives réservés aux membres). Sur Twitch, les abonnés payants sont déjà dans tes
  lives. Le nombre de membres suit ton audience (environ 0,2 % pour une commu tiède), la chaleur de ta commu, le prix
  et tes promesses ; tes habitués adhèrent en premier. C’est payé chaque mois avec tes revenus, moins la part de la
  plateforme (30 % sur YouTube, 20 % sur Instagram, 50 % sur TikTok). Une promesse non tenue dans le mois fait partir
  des membres et refroidit la commu ; au moment de publier, l’écran te propose de la tenir.
- **Le merch** (0.22) : dans le Studio, « Ta boutique » s’ouvre à 10 000 abonnés. Jusqu’à trois pièces (t-shirt,
  sweat, casquette, mug, tote bag), tes prix et ton idée de design, fabriqués à la demande (rien à avancer, petite
  marge) ou en stock (payé d’avance, grosse marge, mais les invendus restent). Tu le lances avec un post : c’est l’IA
  qui juge à quel point ça donne envie, et les ventes durent environ cinq semaines, de moins en moins, payées chaque
  semaine. Un prix bien au-dessus de ce que tes fans attendent refroidit ta commu ; une rupture de stock se
  réassortit. Le fournisseur le moins cher n’est pas toujours fiable.
- **L’argent** (0.20, revu en 0.21 et 0.22) : un agent trouve un peu plus d’offres et négocie un peu mieux (+5 % par
  niveau), contre sa commission : il vaut surtout pour les arnaques et les gros contrats. L’assurance coûte selon la
  valeur de ton matos (franchise : 5 % du prix de ce qui casse). Le haut de gamme coûte le prix du vrai matos pro
  (jusqu’à 100 000 € la caméra cinéma) ; les nouveautés coûtent de 20 000 à 150 000 €, toujours plus que le haut de
  gamme qu’elles remplacent. Mesuré avec les bots du labo, qui jouent au vrai jeu (lab/balance/money.cjs, un barème
  de minutes par action ; depuis la 0.22, ils ouvrent les adhésions et lancent un merch de temps en temps) : premier
  ordinateur vers 5 h en partant de 0 € (tout de suite si tes économies suffisent), tout le matos en milieu de gamme
  vers 16 à 17 h sur YouTube et 21 h sur Twitch ; tout en haut de gamme vers 30 h pour un streamer Twitch (les dons de
  ses lives), 32 h pour un youtubeur qui signe tout en partant de 0 €, 36 h pour une créatrice TikTok et 45 h pour une
  youtubeuse prudente (en 0.21 : 57 h pour le youtubeur, jamais atteint en 63 h pour les deux autres). Le merch pèse
  lourd (de 130 000 à 270 000 € sur 240 jours de jeu), les adhésions moins (20 000 à 60 000 €). Un joueur qui prend
  son temps (les messages, les rendez-vous) mettra plus longtemps.
- **Tes compétences** (revues en 0.24) : charisme, humour, audace et créativité, de 0 à 50, montent en jouant, lentement
  (le premier palier vient après quelques heures pour ta compétence principale, le niveau 50 après plus d’une centaine
  ; tes niveaux de joueur ne donnent plus de points à placer). Chaque post, commentaire,
  vidéo, message qui touche, rendez-vous qui se passe bien ou service rendu entraîne la compétence qu’il montre (c’est
  l’IA qui le dit). Elles servent les échanges, jamais les mini-jeux : le charisme fait monter tes relations et ta
  confiance plus vite et rend tes cadeaux et tes sorties moins chers, voire offerts ; l’humour donne des likes et
  désamorce ; l’audace rend viral, adoucit les polémiques et fait négocier ; la créativité donne de l’XP, des vues, un
  merch qui se vend mieux et des services mieux payés. Dans ton profil, chaque compétence dit ce qu’elle t’apporte en
  chiffres ; touche-la pour voir son arbre, un palier tous les cinq niveaux. Les points de l’ancien système, s’il t’en
  reste, se placent encore (8 XP chacun).
- **Ce que tu paies dans les échanges** (0.24) : « /me lui offre des roses », « je t’invite au resto », le geste « Payer
  l’addition »… L’IA dit ce que tu achètes et son vrai prix, le jeu le paie avec ton argent, et un ticket le montre
  dans la conversation. Le charisme fait baisser les cadeaux et les sorties (jusqu’à −20 %) et les rend parfois offerts ;
  l’audace fait négocier ce que tu achètes pour toi ou ton travail. Si tu n’as pas assez, ta carte est refusée.
  La personne se souvient de ton cadeau.
- **Tes services aux autres créateurs** (0.23) : propose en privé de monter la vidéo de quelqu’un ou de faire sa
  miniature. C’est le personnage qui décide : s’il accepte, la commande arrive dans vos messages (ce qu’il veut, payé
  ou entre amis, le délai) et il t’envoie ses rushs quand il l’a dit (des fichiers de jeu de rôle, juste leurs noms).
  Le montage se fait au mini-jeu du montage (plus dur pour un client connu ou payant), la miniature à l’outil des
  miniatures. La vidéo sort sur SA chaîne, il te mentionne, et tu gagnes des abonnés selon sa notoriété et la façon
  dont la vidéo marche. Bâclé, ça fait un flop : il est déçu, t’en veut un peu et ne paie que la moitié. En retard, il
  te relance, puis laisse tomber. Un client paie au plus selon sa propre audience.
  **Depuis la 0.25.2, tu choisis la difficulté du montage** (de Facile à Mythique), comme pour tes vidéos : elle fixe
  jusqu’où il peut monter. Même sans faute, un montage en Facile reste « bon » ; Moyen va jusqu’à « très bon »,
  Difficile jusqu’à « excellent », et « légendaire » demande Expert ou plus (dès 90 % de réussite en Expert, 84 % en
  Légendaire, 78 % en Mythique). Le client dit ce qu’il attend selon son audience et s’il paie. Un montage légendaire
  cartonne sur sa chaîne. Le jeu retient la dernière difficulté choisie.
- **Quatre nouveaux mini-jeux** (0.25), joués sans l’IA (aucun token) : **modérer le chat** d’un live (supprimer
  les insultes, les arnaques et le spam sans toucher aux fans, avec des pièges à partir de Difficile), **le mixage** d’un
  podcast (garder chaque piste dans la bande verte), **le recadrage vertical** d’un short (garder le sujet dans le
  cadre du téléphone) et **l’étalonnage** d’une vidéo (retiré en 0.27.4 : bien trop dur). Ils arrivent au tournage
  selon le format, et le montage tourne lui aussi (la coupe au rythme, le dérushage, le recadrage, le mixage), jamais
  le même jeu qu’au tournage. Plus la difficulté monte, plus c’est rapide, serré et chargé. Depuis la 0.27.3, au
  tournage, chaque mini-jeu du format a la même chance, quelle que soit la difficulté : les cinq que l’IA écrit sur ton
  sujet (trier, remettre dans l’ordre, quiz, vrai ou faux, trouve l’intrus) et les épreuves du format (la coupe au
  rythme, la mémoire, plus le recadrage pour un short, le chat pour un live, le mixage pour un podcast), soit 1 chance
  sur 8, et 1 sur 7 pour une vidéo ou un clip ; jamais le même deux fois de suite (une de moins avec un monteur dans
  l’équipe : pas de coupe au rythme pour toi). Cauchemar reste le quiz de vraies questions. Depuis la 0.27.4, chaque
  réponse a **2 secondes de plus**, quelle que soit la difficulté (chaque élément à trier, chaque question, chaque
  série, chaque image à retrouver, chaque message du chat, chaque coupe). Depuis la 0.27.5, le chrono des jeux écrits
  par l’IA suit **la longueur de ce qu’il y a à lire** (le texte et ses réponses, à un rythme de lecture qui monte avec
  la difficulté, plus le temps de choisir), jamais moins qu’en 0.27.4 ; chaque question du quiz a son propre chrono.
  Les difficultés ont été réglées avec des joueurs simulés (un lecteur moyen, un lecteur rapide) : Mythique est très
  dur pour le premier et jouable pour le second. Le mixage est plus doux à partir d’Expert, et le quiz et l’intrus ont
  4 questions au moins. Depuis la 0.27.6, **ne rien faire ne rapporte rien** : la modération du chat compte les messages
  supprimés à raison et les fans épargnés (avec un chat plus lent), les pistes du mixage et le sujet du recadrage
  partent hors de la zone, et les étapes jamais placées comptent comme fausses. Sans réponse de l’IA, le tournage passe
  une épreuve d’adresse du format (en Cauchemar, le jeu le dit et propose de réessayer).
- **Les mini-jeux** (tournages et rendez-vous) gardent ta progression à chaque réponse : si tu en sors, tu reprends où tu
  en étais, tes réponses restent données et le chrono ne s’arrête pas pour toi (une question restée à l’écran trop
  longtemps est ratée). Une sauvegarde ou un export ne garde jamais un mini-jeu à moitié joué : en le rechargeant, les
  questions sont nouvelles. Pas de notification par-dessus pendant que tu joues.
- **Les fenêtres** (0.27.7) : sur ordi, une fenêtre tirée par sa barre de titre flotte au-dessus du jeu, où tu veux, et
  son coin la redimensionne ; le jeu reste utilisable derrière (un autre onglet, un message), et chaque type de fenêtre
  retient sa place. Partout, « Réduire » range une fenêtre dans une barre en bas de l’écran avec ce que tu y as rempli,
  et un clic la ramène telle quelle. Un rendez-vous en cours se déplace mais ne se réduit pas, et bloque le reste.
  Ce que tu as tapé pour publier ou pour préparer un tournage revient même après avoir fermé la fenêtre.
- **Les noms** (0.27.7) : tes sauvegardes (✏️ dans la fenêtre Sauvegardes, les automatiques aussi) et tes parties (sur
  l’écran d’accueil) prennent le nom que tu leur donnes.
- **Les consignes** (0.27.8) : chaque mini-jeu dit ce qu’il faut pour réussir (75 % et plus) ou pour un résultat moyen
  (40 à 74 %), comment il compte tes points (la coupe au rythme : 1 point dans la zone, ½ juste à côté), et que son chrono
  ne s’arrête plus une fois lancé ; les compteurs affichent ce que compte le score. Le chiffre d’une difficulté multiplie
  les j’aime, les abonnés et l’XP de la sortie. Refuser une offre, fermer tes adhésions, un gros achat ou une demande en
  fiançailles demandent une confirmation, et un bouton grisé dit pourquoi.
- **L’heure du jeu** : une date et une heure visibles, une montre pour avancer le temps de 5 minutes à une semaine.
- **Les cafés** : ton budget IA du jour, réglable à chaque partie (Découverte, Léger, Normal, Intensif, Marathon, Sans
  limite), avec ce que chaque palier représente en posts et en messages, et lequel choisir selon ton abonnement (avec
  ChatGPT Plus : Intensif ou Marathon). Le jeu mesure ce que chaque réponse consomme vraiment et se met en pause avant de
  vider ton abonnement. **« Où passent tes cafés »** (0.23.1, dans les réglages et la fenêtre du budget) : ce que chaque
  chose a coûté aujourd’hui ou depuis le début de la partie (messages, rendez-vous, posts, le réseau tout seul…).
- **Les photos des persos** : les personnages principaux ont un vrai visage, une page façon Insta, des diaporamas façon
  TikTok, et postent leurs photos dans le fil. Le jeu les choisit sans IA (saison, fêtes, heure, humeur), les persos en
  écrivent la légende, et l’IA construit les persos de chaque partie autour des profils des visages (voir `PHOTOS.md`).
  Les photos d’un même shooting forment une série : un carrousel, ou une seule photo plus tard, jamais deux fois à
  quelques jours d’écart. Une photo ne revient pas tant que son post est encore visible, et leurs pages ne gardent
  qu’une semaine de jeu. Le pack livré avec le jeu a trois visages pour l’instant (trois femmes, dans les mondes
  d’aujourd’hui et l’académie de magie ; depuis la 0.21, une DJ techno et ses 43 photos ; depuis la 0.27, la streameuse
  aux mèches roses en a 103) ; les autres persos gardent
  leur emoji en attendant les suivants.
- **Tes photos à toi** : une photo, un carrousel ou un diapo façon TikTok (10 photos au plus), les tiennes ou celles de
  ton perso IA. Elles restent sur ton appareil ; les persos ne lisent que ce que tu dis qu’on y voit, et y réagissent.
  Ton profil a alors ta page Insta et ta page TikTok. Pour des images générées par IA (jamais de vraies personnes), la
  case **« Les persos voient ces images »** les envoie à l’IA avec le post : les persos réagissent à ce qu’ils voient
  vraiment (un peu plus de cafés, la description devient facultative).
- **Ta photo de profil** (0.25.1) : l’appareil photo sur ton avatar (ou la section « Photo de profil » de ton profil)
  la change. Tu dis ce qu’on y voit si tu veux, puis tu choisis : **l’annoncer en post** (tout le monde a un avis :
  compliments, vannes de potes, piques des rivaux, inconnus qui trollent ; la photo s’affiche ronde dans le fil, et la
  case « Les persos voient ces images » marche aussi) ou **juste la changer** (aucun appel : quelqu’un pourra la remarquer
  au prochain échange). Les persos connaissent ta photo par sa description, dans toutes les conversations : ils peuvent
  la ressortir quand ils veulent. Tu peux la modifier dans ton profil.
- **Ton inventaire et la seconde main** (0.26, dans ton studio) : tout ce que tu possèdes sans t’en servir y arrive :
  ton ancien matos quand tu en achètes un meilleur, le matos et les produits que les marques t’envoient, ce que tu
  t’achètes pour toi (un objet) et ce qu’on t’offre (en messages ou en rendez-vous). Le jeu ne revend plus rien à ta
  place : un cadeau de marque meilleur que ton matos se met en service (l’ancien va dans l’inventaire), sinon il
  t’attend. Tu peux réutiliser un matos, ou tout vendre sur **Occaz**, l’appli de seconde main du jeu (son nom change
  selon le monde) : tu fixes le prix, le jeu dit ce que ça vaut et à quelle vitesse ça partirait. Ta commu compte : plus
  elle est chaleureuse et plus tu es suivi, plus tes abonnés paient cher ce qui vient de toi. Ça se vend avec le temps
  du jeu, sans appel IA. Attention à ce que les marques t’ont offert : revendu trop tôt, la marque peut tomber sur
  l’annonce, et c’est son IA qui décide comment elle le prend (jusqu’à rompre un contrat pas encore livré). Pareil pour
  le cadeau d’un perso.
- **Les réglages** sont derrière la roue, en haut à droite.

---

## Installer Hype pour ChatGPT (Windows)

1. Télécharge `Hype-Setup-0.27.8.exe` et lance-le.
2. Windows peut afficher **« Windows a protégé votre ordinateur »** : l’appli n’est pas signée (un certificat coûte cher, le projet est gratuit).
   Clique sur **Informations complémentaires**, puis **Exécuter quand même**.
3. Choisis le dossier d’installation, termine. Un raccourci **Hype** apparaît sur le bureau.
4. Ouvre Hype, clique sur **Continuer avec ChatGPT** : ton navigateur s’ouvre sur la page de connexion d’OpenAI.
   Accepte que Hype utilise ton abonnement, puis reviens dans l’appli.

**Sans installeur (Æ Games Launcher, GitHub Releases)** : la même appli existe en archive portable,
`Hype-<version>-windows-x64.zip`, avec `manifest.json` à sa racine (chaque fichier, sa taille, son SHA-256) et un
`manifest.json` joint à chaque Release (le même, avec l’archive). Un tag `hype-vX.Y.Z` poussé sur GitHub la publie tout
seul (`.github/workflows/release.yml`) ; tout est expliqué dans [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md).

### Ce qu’il faut savoir

- **L’usage** : chaque réponse des personnages compte dans l’usage inclus dans ton abonnement ChatGPT.
  Les cafés du jeu (ton budget du jour) t’évitent de tout y passer ; pour une vraie limite côté OpenAI :
  ChatGPT → Réglages → Usage (lien « Gérer l’usage » dans le jeu).
- **Le modèle** : dans les réglages (la roue), tu choisis le modèle ChatGPT et l’« intelligence des personnages » (rapide, normale, maximale).
- **La taille** : Ctrl + molette, Ctrl + et Ctrl − (Ctrl 0 : taille auto, plus grande sur un écran 4K), ou Réglages → Taille de l’affichage.
- **Tes parties** restent sur ton ordinateur, dans `%APPDATA%\Hype\parties` (tes photos aussi, chacune dans son fichier). Rien n’est envoyé ailleurs qu’à OpenAI pour faire répondre les personnages, et tes photos seulement quand tu coches « Les persos voient ces images ».
- **Ta connexion ChatGPT** est chiffrée par Windows (`%APPDATA%\Hype\chatgpt`). Hype ne voit jamais ton mot de passe ni tes conversations ChatGPT.
- **Changer d’IA** : Réglages → **Exporter** crée un fichier de ta partie (avec tes photos) ; **Importer une partie** (accueil) la reprend, dans la version Claude ou ChatGPT.

---

## Pour les développeurs

```
src/                le jeu (commun aux deux versions) : core.js, ai.js, career.js (la carrière : argent,
                    plateformes, sponsors, équipe, rumeurs), trust.js (la confiance et les conseils),
                    standing.js (ta cote, le tempérament des persos, les effets papillon), hearts.js (le cœur des
                    persos, le rythme, les défis, les rendez-vous joués pour de vrai, les épreuves, le couple),
                    whispers.js (les liens entre persos, le bouche-à-oreille, ce que les persos voient passer),
                    train.js (le train de la hyyype), emoji-data.js et emojis.js (les emojis du jeu et leur clavier ;
                    emoji-data.js est fabriqué à partir des dessins), secrets.js (les secrets du joueur), dilemmas.js
                    (les dilemmes), visits.js (les visites surprises), gear.js (le matos, le départ, la connexion, les
                    abonnements, les pannes, les nouveautés), devis.js (le devis d’un contenu), scams.js (les arnaques,
                    les agents, les marques qui reviennent), commu.js (ta commu, les questions des abonnés, les
                    habitués, les dons en live, les adhésions), merch.js (le merch, « Ta boutique »), studio.js (ses
                    écrans), montage.js (le
                    montage, la miniature et le dessin, après le tournage), photos.js
                    (le pack photos, les séries, les pages façon Insta et TikTok, l’Atelier photos), media.js (les
                    photos du joueur, gardées sur l’appareil), ui.js, style.css
build.py            fabrique hype.html, la version Claude (artefact)
test/               tests de la version Claude (Playwright + une fausse IA : test/mock.js) : run.js, career.js, photos.js,
                    trust.js, media.js, dates.js, standing.js, ultime.js, minigames.js, hearts.js, couples.js, whispers.js,
                    save.js, studio.js, frictions.js, cast.js, v17.js, v18.js, v19.js, v20.js, v21.js, v22.js (fixtures/ :
                    les règles de ton de la 0.18, que la 0.19 garde mot pour mot ; les suites d’avant la 0.20 tournent
                    sans ses imprévus, window.__hypeEasyGear, v20.js, v21.js et le labo les remettent)
lab/                le labo : les règles du jeu pour des agents, un navigateur qu’un agent pilote (lab/play),
                    le banc d’essai des demandes à l’IA (lab/bench ; lab/bench/v19 : l’avant/après de la 0.19,
                    les mêmes situations répondues par le même modèle et jugées à l’aveugle), les simulations d’équilibrage
                    (lab/balance ; money.cjs : l’argent, le matos et les heures de jeu, depuis la 0.20)
assets/pack/        le pack photos livré avec le jeu (voir PHOTOS.md ; tools/pack.py le fabrique à partir de l’export
                    de l’Atelier photos)
desktop/            l’appli Hype pour ChatGPT (Electron)
  main.mjs          processus principal : connexion ChatGPT, fichiers, dialogues
  preload.cjs       le seul pont entre la page du jeu et l’appli
  lib/              host-adapter.js (le jeu croit parler à Claude), ai.mjs, store.mjs, chiffrement
  vendor/siwc-local le SDK « Sign in with ChatGPT » d’OpenAI (licence non commerciale, voir plus bas)
  test/             test de bout en bout avec un faux ChatGPT
```

Le jeu a été écrit pour l’environnement des artefacts Claude (`window.claude.use('sample' | 'db' | 'user')`).
Dans l’appli, `lib/host-adapter.js` fournit la même chose au-dessus de l’appli : les demandes d’IA partent
vers l’API Responses d’OpenAI avec le jeton de connexion du joueur, et les parties deviennent des fichiers JSON.
Le jeu lui-même ne change pas d’une version à l’autre ; seuls quelques écrans propres à ChatGPT s’ajoutent
(`HOST` dans `src/core.js`).

### Lancer et tester l’appli ChatGPT

Il faut Node.js 22.12 ou plus.

```sh
cd desktop
npm install
npm start                                  # construit puis lance l’appli
OUT=/tmp/shots xvfb-run -a node test/e2e.mjs   # (Linux) le test complet avec un faux ChatGPT
npm run dist:win                           # l’installeur Windows (sous Linux : wine et wine32 nécessaires)
```

### La version Claude

```sh
python3 build.py      # → hype.html
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots node test/run.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-career node test/career.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-photos node test/photos.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-trust node test/trust.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-media node test/media.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-dates node test/dates.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-standing node test/standing.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-ultime node test/ultime.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-minigames node test/minigames.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-hearts node test/hearts.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-couples node test/couples.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-whispers node test/whispers.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-save node test/save.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-studio node test/studio.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-frictions node test/frictions.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-cast node test/cast.js
UMD=…/htm/preact/standalone.umd.js OUT=/tmp/shots-v17 node test/v17.js
```

`hype.html` se publie comme artefact Claude avec les capacités `sample`, `db` et `user`
(et, quand le pack existe, les images de `assets/pack/` publiées à côté, dans `pack/`).

### Sign in with ChatGPT

L’appli utilise [Sign in with ChatGPT](https://developers.openai.com/siwc) d’OpenAI, ouvert aux projets open source
qui tournent sur l’ordinateur du joueur : la connexion passe par le navigateur et revient sur `127.0.0.1`,
les demandes vont à `https://api.openai.com/v1/responses` avec `store: false`.
Une version web ou mobile demanderait l’accord d’OpenAI (formulaire pour les applis hébergées).

---

## Licences

- Le code de Hype : **MIT** (`LICENSE`).
- `desktop/vendor/siwc-local` : **Sign-in with ChatGPT DevKit Noncommercial License v1.0** d’OpenAI, usage non commercial uniquement.
- Les marques ChatGPT appartiennent à OpenAI ; Hype n’est ni affilié à OpenAI ni à Anthropic.
- Le reste : voir `THIRD_PARTY_NOTICES.md`.
