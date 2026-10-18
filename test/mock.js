// Mock of the claude.ai artifact runtime: sample (streamed canned JSONL), db (localStorage-backed), user, permissions.
window.__HYPE_TEST__ = true;
// 0.20: the suites written before the gear run without its friction (a full kit, nothing breaks); test/v20.js and the
// balance lab set it back to false before the game loads.
if (window.__hypeEasyGear === undefined) window.__hypeEasyGear = true;
(function () {
  const L = (...lines) => lines.map((o) => JSON.stringify(o)).join('\n');
  const WORLD = L(
    { t: 'world', name: 'Académie Lumen', in: 'à l’Académie Lumen', emoji: '🔮', tagline: 'Quatre maisons, un secret, zéro intimité.', description: 'Une école de magie perchée dans les Alpes où les maisons Aube, Brasier, Marée et Ombre se disputent la Coupe des Astres. Depuis la réouverture de la bibliothèque interdite, des élèves disparaissent de leurs cours.', tone: 'posts courts, piques entre maisons, hashtags de maison, second degré' },
    { t: 'char', name: 'Zara Vey', handle: 'zara.vey', emoji: '🦊', g: 'f', role: 'Duelliste star de Brasier', bio: 'invaincue en duel depuis deux ans. pas d’autographes.', personality: 'arrogante mais loyale, veut rester la meilleure, voit le joueur comme une menace', voice: 'phrases sèches, minuscules, ironie', followers: 48200, rel: -12, garde: 3, mefiance: 'trahie par son ancienne partenaire de duel', temper: 'envieux', temperWhy: 'ne supporte pas qu’on brille plus qu’elle', secret: 'a gagné son dernier duel grâce à une potion de force interdite', hook: 'je suis mes rivaux de près. très près.', hello: 'je te suis pour garder un œil sur toi. t’as peur ?' },
    { t: 'char', name: 'Théo Marlin', handle: 'theo.marlin', emoji: '🐙', g: 'm', role: 'Délégué de Marée', bio: 'potions, jeux de plateau et mauvaises blagues', personality: 'chaleureux, curieux du joueur, cherche des alliés pour le tournoi', voice: 'enthousiaste, points d’exclamation', followers: 3100, rel: 18, garde: 1, mefiance: 'croit en tout le monde, même trop', temper: 'fidele', temperWhy: 'a déjà tout perdu pour un ami : ne lâche jamais les siens', hook: 'une nouvelle à Lumen ?? je veux être le premier à te guider !!', hello: 'salut !! moi c’est Théo, délégué de Marée. t’as déjà choisi ta maison ou je peux encore te convaincre ?' },
    { t: 'char', name: 'Iris Gallant', handle: 'prof.gallant', emoji: '🦉', g: 'f', role: 'Professeure d’astromancie', bio: 'Les étoiles ne mentent jamais. Les élèves, si.', personality: 'sévère, mystérieuse, sait des choses sur le pouvoir du joueur', voice: 'phrases soignées, vouvoiement', followers: 12900, rel: 0, temper: 'integre', temperWhy: 'n’a jamais toléré la moindre triche', hook: 'Votre pouvoir m’intrigue. Je préfère observer.', hello: 'Bonsoir. Je vous suis désormais. Vous savez pourquoi, n’est-ce pas ?' },
    { t: 'char', name: 'Nox', handle: 'nox.ombre', emoji: '🌑', g: 'x', role: 'Compte anonyme d’Ombre', bio: 'je vois tout. je dis presque tout.', personality: 'imprévisible, balance des rumeurs, fasciné par le joueur', voice: 'énigmatique, phrases coupées', followers: 8700, rel: 5, garde: 2, temper: 'trouble', temperWhy: 'aime les gens quand ils tombent', secret: 'Nox est en réalité la fille de la directrice', hook: 'tu caches quelque chose. j’aime ça.', hello: 'je sais ce que tu as fait au réfectoire. tu veux qu’on en parle ?' },
    { t: 'char', name: 'Léandre Aube', handle: 'leandre.aube', emoji: '👑', g: 'm', role: 'Héritier de la maison Aube', bio: 'futur directeur. retenez le nom.', personality: 'snob, manipulateur, veut recruter le joueur', voice: 'condescendant, poli en surface', followers: 22400, rel: -5, temper: 'opportuniste', temperWhy: 'ne fréquente que ceux qui montent', hook: 'Aube garde un œil sur les talents. Même bruts.', hello: 'Je t’offre une chance : rejoins Aube avant qu’il soit trop tard. Intéressée ?' },
    { t: 'char', name: 'Maëlle Fen', handle: 'maelle.fen', emoji: '🌿', g: 'f', role: 'Soigneuse et créatrice', bio: 'tisanes magiques et zéro drama (presque)', personality: 'douce, influente', voice: 'bienveillante', followers: 15100, rel: 0, temper: 'detache' },
    { t: 'char', name: 'Oskar Brume', handle: 'oskar.brume', emoji: '🐺', g: 'm', role: 'Gardien de la forêt', bio: 'la forêt parle. j’écoute.', personality: 'taiseux, protecteur', voice: 'peu de mots', followers: 2100, rel: 0 },
    { t: 'char', name: 'Lou Cendre', handle: 'lou.cendre', emoji: '🔥', g: 'x', role: 'Rival·e de Zara', bio: 'deuxième. pour l’instant.', personality: 'revanchard', voice: 'piquant', followers: 9900, rel: 0 },
    { t: 'char', name: 'Ada Quill', handle: 'ada.quill', emoji: '🪶', g: 'f', role: 'Bibliothécaire', bio: 'silence.', personality: 'gardienne de secrets', voice: 'formelle', followers: 1200, rel: 0 },
    { t: 'char', name: 'Rémi Sol', handle: 'remi.sol', emoji: '☀️', g: 'm', role: 'Capitaine d’Aube', bio: 'sport, soleil, victoire', personality: 'compétitif', voice: 'cri de guerre', followers: 6400, rel: 0 },
    { t: 'media', name: 'La Gazette de Lumen', handle: 'gazette_lumen', emoji: '📰', role: 'Journal très officieux', bio: 'Toutes les rumeurs, parfois vraies.', followers: 56000 },
    { t: 'media', name: 'Coupe des Astres', handle: 'coupe.astres', emoji: '🏆', role: 'Compte officiel du tournoi', bio: 'Classement des maisons en direct.', followers: 31000 },
    { t: 'npc', name: 'Lilou des Cuisines', handle: 'lilou_cuisines', emoji: '🍩', bio: 'commis aux cuisines, sait tout avant tout le monde' },
    { t: 'npc', name: 'Le Vieux Gargouille', handle: 'gargouille_ronchon', emoji: '🗿', bio: 'ancien élève aigri, trouve tout nul' },
    { t: 'npc', name: 'Tess Astrale', handle: 'tess.astrale', emoji: '🔭', bio: 'fan de Zara, défend sa reine coûte que coûte' },
    { t: 'quest', title: 'Défier Zara', desc: 'Provoque Zara publiquement et gagne le respect de la maison Brasier.', char: 'zara.vey' },
    { t: 'quest', title: 'Découvrir qui est Nox', desc: 'Gagne la confiance de Nox en privé pour qu’il te révèle son identité.', char: 'nox.ombre' },
    { t: 'quest', title: 'Choisir une maison', desc: 'Convaincs un délégué de te recruter avant la cérémonie du Cristal.', char: '' },
    { t: 'post', by: 'gazette_lumen', text: 'EXCLU : une nouvelle élève débarque en plein trimestre. @mila.flux, on veut savoir d’où tu viens 👀 #Lumen' },
    { t: 'post', by: 'zara.vey', text: 'une nouvelle. super. encore quelqu’un à battre avant le tournoi.' },
    { t: 'post', by: 'theo.marlin', text: 'bienvenue @mila.flux !! Marée t’accueille quand tu veux, on a des cookies !!' },
    { t: 'post', by: 'nox.ombre', text: 'la bibliothèque interdite a encore clignoté cette nuit… personne n’a rien vu ?', photo: 'la porte de la bibliothèque interdite entrouverte, une lueur violette au fond' },
    { t: 'post', by: 'leandre.aube', text: 'Aube ne recrute que l’excellence. on verra si la nouvelle en fait partie.' },
    { t: 'post', by: 'coupe.astres', text: 'Classement : 1. Brasier 2. Aube 3. Marée 4. Ombre #CoupeDesAstres' },
    { t: 'post', by: 'prof.gallant', text: 'Rappel : le cours d’astromancie de demain commence à 7h précises. Les retardataires nettoieront les télescopes.' },
    { t: 'post', by: 'maelle.fen', text: 'tisane camomille-lune dispo à l’infirmerie pour les nerveux du tournoi 🌿' },
    { t: 'dm', by: 'theo.marlin', text: 'salut ! moi c’est Théo, délégué de Marée. si t’as besoin d’un guide (ou d’un allié pour le tournoi), je suis là !' }
  );
  const ACT_EVAL = { t: 'eval', quality: 7, humor: 6, bold: 8, controversy: 3, reception: 6, virality: 8, skills: ['audace', 'humour'], verdict: 'Ça buzz fort', memo: 'Mila a défié Zara publiquement.' };
  const ACT = '```json\n' + L(
    { t: 'eval', quality: 7, humor: 6, bold: 8, controversy: 3, reception: 6, virality: 8, skills: ['audace', 'humour'], verdict: 'Ça buzz fort', memo: 'Mila a défié Zara publiquement.' },
    { t: 'reply', by: 'zara.vey', name: '', text: '8h c’est tôt pour perdre. mais d’accord.' },
    { t: 'reply', by: '@theo.marlin', name: '', text: 'JE RAMÈNE LE POP-CORN !!!' },
    { t: 'reply', by: 'fan_de_brasier', name: 'Inès de Brasier', text: 'personne ne défie Zara et repart entier' },
    { t: 'reply', by: 'oskar.brume', name: '', text: 'ce perso est verrouillé, cette ligne doit être ignorée' },
    { t: 'reply', by: 'tess.astrale', text: 'Zara va te ridiculiser, prépare tes mouchoirs' },
    { t: 'reply', by: 'curieux_du_hall', name: 'Un curieux du hall', bio: 'traîne dans le hall entre deux cours', to: 'tess.astrale', text: 'calme-toi Tess, personne a encore gagné' },
    { t: 'clue', about: 'zara.vey', text: 'Zara a glissé une fiole violette dans sa manche avant l’entraînement' },
    { t: 'rel', by: 'zara.vey', d: 6, why: 'respecte ton audace' },
    { t: 'likes', by: ['theo.marlin', 'nox.ombre', 'inconnu'] },
    { t: 'post', by: 'gazette_lumen', name: '', quote: true, text: 'DUEL CONFIRMÉ demain 8h, cour des Glycines. Les paris sont ouverts #DuelDesGlycines' },
    { t: 'post', by: 'nox.ombre', name: '', text: 'tout le monde regarde le duel… personne ne regarde la bibliothèque.' },
    { t: 'dm', by: 'nox.ombre', text: 'bien joué. mais fais gaffe à ce que Zara cache dans sa manche.' },
    { t: 'quest', id: '__Q__', done: true },
    { t: 'questprog', id: '__Q__', pct: 40, step: 'Zara a accepté le duel' },
    { t: 'mem', by: 'zara.vey', text: 'Mila l’a défiée en duel devant toute l’académie' },
    { t: 'vibe', by: 'zara.vey', vibe: 'rival', why: 'le duel est lancé' },
    { t: 'post', by: 'maelle.fen', text: 'je dis ça je dis rien mais le duel de demain va être légendaire', later: 1 },
    { t: 'event', kind: 'drama', title: 'Le défi au duel enflamme l’académie' }
  ) + '\n{"t":"reply","by":"broken","text":"ligne cassée\n' + '\n```';
  const REPLY = L(
    { t: 'eval', quality: 5, humor: 4, bold: 3, controversy: 1, reception: 3, virality: 2, skills: ['charisme'], verdict: 'Bien envoyé', memo: '' },
    { t: 'reply', by: 'zara.vey', name: '', text: 'on verra si tu parles autant demain.' },
    { t: 'rel', by: 'zara.vey', d: 2, why: 'amusée' }
  );
  const DM = L(
    { t: 'msg', text: 'tu veux vraiment savoir qui je suis ?' },
    { t: 'msg', text: 'alors rejoins-moi à la bibliothèque. minuit. viens seule.' },
    { t: 'rel', d: 4, why: 'intrigué par ta curiosité' },
    { t: 'mem', text: 'le joueur veut découvrir son identité' },
    { t: 'memo', text: 'Nox a donné rendez-vous au joueur à minuit à la bibliothèque.' }
  );
  const PLAIN = L(
    { t: 'eval', quality: 4, humor: 3, bold: 2, controversy: 0, reception: 2, virality: 2, skills: [], verdict: 'Ça passe', memo: '' },
    { t: 'reply', by: 'theo.marlin', text: 'trop bien la photo !!' },
    { t: 'reply', by: 'curieux_du_hall', name: 'Un curieux', text: 'c’est où ça ?' },
    { t: 'likes', by: ['theo.marlin'] },
    { t: 'post', by: 'gazette_lumen', text: 'Tendance du jour : #DuelDesGlycines et #CoupeDesAstres' }
  );
  const MEAN = L(
    { t: 'eval', quality: 2, humor: 0, bold: 6, controversy: 9, reception: -8, virality: 5, skills: [], verdict: 'Gros bad buzz', memo: 'Mila a insulté la maison Marée.' },
    { t: 'reply', by: 'theo.marlin', text: 'sérieux ?? on t’a accueillie avec des cookies…' },
    { t: 'rel', by: 'theo.marlin', d: -12, why: 'blessé par ton post' },
    { t: 'event', kind: 'cancel', title: 'Mila se met tout Lumen à dos' }
  );
  const ACCUSE = L(
    { t: 'eval', quality: 7, humor: 2, bold: 8, controversy: 6, reception: 5, virality: 7, credibility: 9, exposed: true, skills: ['audace'], verdict: 'Révélation explosive', memo: 'Mila accuse Zara d’avoir triché au duel.' },
    { t: 'reply', by: 'zara.vey', text: 'n’importe quoi. une fiole ça prouve rien.' },
    { t: 'reply', by: 'tess.astrale', text: 'non… pas ma reine… dites-moi que c’est faux' },
    { t: 'reply', by: 'lilou_cuisines', text: 'je l’ai vue sortir de la réserve des potions hier soir, je dis ça…' },
    { t: 'rel', by: 'zara.vey', d: -10, why: 'humiliée publiquement' }
  );
  const FAKE_PASS = L(
    { t: 'eval', quality: 7, humor: 2, bold: 8, controversy: 7, reception: 4, virality: 7, credibility: 8, exposed: false, fake: 8, busted: false, skills: ['audace'], verdict: 'Le réseau y croit', memo: 'Mila publie une capture accablante contre Nox.' },
    { t: 'debunk', by: 'tess.astrale', text: 'zoomez sur la capture de @mila.flux : l’heure affiche 25h12. ça n’existe pas. c’est un montage.' },
    { t: 'reply', by: 'nox.ombre', text: 'je n’ai jamais écrit ça. jamais.' },
    { t: 'reply', by: 'lilou_cuisines', text: 'la capture est claire pourtant…' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'de mon temps on balançait pas les gens comme ça. mais bon, c’est accablant' },
    { t: 'rel', by: 'nox.ombre', d: -12, why: 'sait que c’est faux' }
  );
  const FAKE_BUSTED = L(
    { t: 'eval', quality: 3, humor: 1, bold: 7, controversy: 9, reception: -8, virality: 6, credibility: 2, exposed: false, fake: 3, busted: true, skills: [], verdict: 'Fake grillé', memo: 'La fausse preuve de Mila contre Léandre a été démasquée.' },
    { t: 'reply', by: 'leandre.aube', text: 'Cette « photo » me montre à la bibliothèque le soir où j’étais au bal, devant cent témoins. Pathétique.' },
    { t: 'reply', by: 'tess.astrale', text: 'le montage le plus nul de l’histoire de Lumen' },
    { t: 'reply', by: 'lilou_cuisines', text: 'oh non… elle a vraiment inventé ça ?' },
    { t: 'rel', by: 'leandre.aube', d: -15, why: 'fausse accusation' }
  );
  const ANNOUNCE = L(
    { t: 'eval', quality: 6, humor: 3, bold: 7, controversy: 4, reception: 4, virality: 6, skills: ['audace'], verdict: 'Le suspense monte', memo: '' },
    { t: 'reply', by: 'tess.astrale', text: 'une vidéo sur Léandre ?? je mets une alarme' },
    { t: 'reply', by: 'leandre.aube', text: 'Une vidéo. Sur moi. J’ai hâte de rire.' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'encore une qui va faire pschitt' },
    { t: 'announce', what: 'vidéo', topic: 'Les magouilles de Léandre au conseil des maisons', in: 60, about: 'leandre.aube' }
  );
  const MG_ORDER = L(
    { t: 'game', kind: 'ordre', title: 'Le tournage, étape par étape', intro: 'Remets dans l’ordre ce que tu vas montrer : une étape de travers, et ta vidéo perd le fil.' },
    { t: 'step', text: 'Présenter le sujet en une phrase' },
    { t: 'step', text: 'Montrer la première preuve' },
    { t: 'step', text: 'Donner la parole à un témoin' },
    { t: 'step', text: 'Révéler le rebondissement' },
    { t: 'step', text: 'Conclure et demander l’avis des abonnés' }
  );
  const MG_QUIZ = L(
    { t: 'game', kind: 'quiz', title: 'Le quiz du sujet', intro: 'Avant de tourner, vérifie que tu maîtrises ton sujet.' },
    { t: 'q', text: 'Qui préside le conseil des maisons ?', a: ['Léandre', 'Zara', 'Théo'], ok: 0, why: 'il l’a annoncé lui-même' },
    { t: 'q', text: 'Où a disparu le chaudron ?', a: ['en salle 3', 'au réfectoire', 'à la bibliothèque'], ok: 0, why: 'tout Lumen en parle' },
    { t: 'q', text: 'Quelle maison organise le duel ?', a: ['Marée', 'Brasier', 'Aube'], ok: 1, why: 'c’est leur tradition' },
    { t: 'q', text: 'Quand a lieu le vote ?', a: ['vendredi', 'lundi', 'dimanche'], ok: 0, why: 'affiché au panneau' }
  );
  const MG_TRI = L(
    { t: 'game', kind: 'tri', title: 'Les preuves du conseil', intro: 'Garde ce qui prouve les magouilles de Léandre, jette les rumeurs et le hors-sujet.' },
    { t: 'item', text: 'Le procès-verbal du conseil signé deux fois par Léandre', good: true, why: 'une preuve écrite' },
    { t: 'item', text: 'Une rumeur entendue à la cantine', good: false, why: 'aucune source' },
    { t: 'item', text: 'Le vote truqué filmé par un élève de Marée', good: true, why: 'une vidéo datée' },
    { t: 'item', text: 'Un mème moqueur sur la maison Aube', good: false, why: 'hors sujet' },
    { t: 'item', text: 'Les messages de Léandre au trésorier', good: true, why: 'il y parle des voix achetées' },
    { t: 'item', text: 'L’horoscope de Léandre le jour du vote', good: false, why: 'aucun rapport' }
  );
  const MG_VF = L(
    { t: 'game', kind: 'vf', title: 'Vrai ou faux : les potions', intro: 'Démêle le vrai du faux avant de tourner : une erreur, et les commentaires te lynchent.' },
    { t: 'vf', text: 'Une potion de sommeil ne se prépare qu’à la pleine lune', good: false, why: 'n’importe quelle nuit fait l’affaire' },
    { t: 'vf', text: 'Le chaudron de la salle 3 a disparu cette semaine', good: true, why: 'tout Lumen en parle' },
    { t: 'vf', text: 'Les élèves de Marée ont inventé la potion de courage', good: false, why: 'c’est une recette de Brasier' },
    { t: 'vf', text: 'Zara s’entraîne à 6 h avant chaque duel', good: true, why: 'elle l’a posté elle-même' },
    { t: 'vf', text: 'Une potion ratée peut changer la couleur des cheveux', good: true, why: 'demande à Théo' },
    { t: 'vf', text: 'Le professeur Gallant interdit les potions le dimanche', good: false, why: 'aucune règle de ce genre' }
  );
  const MG_ODD = L(
    { t: 'game', kind: 'intrus', title: 'La playlist du duel', intro: 'Dans chaque série, un son casserait l’ambiance de ta vidéo : trouve-le.' },
    { t: 'odd', text: 'Pour monter en pression avant le duel', a: ['tambours de guerre', 'chœurs épiques', 'berceuse au piano'], ok: 2, why: 'ça endort tout le monde' },
    { t: 'odd', text: 'Les bruits de l’arène', a: ['la foule qui scande', 'la cloche du duel', 'un jingle de pub pour lessive'], ok: 2, why: 'aucun rapport' },
    { t: 'odd', text: 'Pour le ralenti final', a: ['violons lents', 'silence total', 'klaxon de camion'], ok: 2, why: 'ça casse l’émotion' }
  );
  const MG_REAL = L(
    { t: 'game', kind: 'quiz', title: 'Les échecs, pour de vrai', intro: 'Ton live parle d’échecs : prouve que tu connais vraiment le jeu.' },
    { t: 'q', text: 'Combien de cases compte un échiquier ?', a: ['64', '81', '49', '100'], ok: 0, why: '8 rangées de 8 cases' },
    { t: 'q', text: 'Avec quelle pièce le roi peut-il roquer ?', a: ['le fou', 'la tour', 'la dame', 'le cavalier'], ok: 1, why: 'le roque se fait avec une tour' },
    { t: 'q', text: 'Comment appelle-t-on la promotion d’un pion en autre chose qu’une dame ?', a: ['un gambit', 'un fianchetto', 'une sous-promotion', 'un zugzwang'], ok: 2, why: 'on choisit une pièce plus faible' },
    { t: 'q', text: 'Quelle pièce peut sauter par-dessus les autres ?', a: ['la tour', 'le fou', 'la dame', 'le cavalier'], ok: 3, why: 'son saut en L l’y autorise' }
  );
  const VIDEO_PUB = L(
    { t: 'eval', quality: 9, humor: 4, bold: 8, controversy: 6, reception: 8, virality: 8, exposed: false, skills: ['audace'], verdict: 'La vidéo cartonne', memo: 'La vidéo de Mila sur Léandre fait trembler la maison Aube.' },
    { t: 'reply', by: 'leandre.aube', text: 'Montage. Diffamation. Mes avocats arrivent.' },
    { t: 'reply', by: 'tess.astrale', text: 'LE PROCÈS-VERBAL. j’en reviens pas' },
    { t: 'reply', by: 'lilou_cuisines', text: 'je l’ai regardée trois fois, tout se tient' }
  );
  const REPLY_LIVE = L(
    { t: 'eval', quality: 6, humor: 3, bold: 6, controversy: 4, reception: 4, virality: 5, skills: [], verdict: 'Pression maximale', memo: '' },
    { t: 'reply', by: 'leandre.aube', text: 'Ce soir. En live. Je réponds à tout, et vous verrez qui ment.' },
    { t: 'plan', by: 'leandre.aube', kind: 'live', what: 'Léandre répond aux accusations en live', in: 300 },
    { t: 'reply', by: 'tess.astrale', text: 'je ramène le pop-corn pour ce soir' }
  );
  const EVENT_LIVE = L(
    { t: 'recap', text: 'Léandre ouvre le live en costume, nie tout, puis s’emmêle sur les dates du conseil. Un élève de Marée affiche le procès-verbal en direct : silence gênant, le chat explose.' },
    { t: 'outcome', success: false, badbuzz: 'ends', followers: -8, rel: -6, player_rep: 3, secret: false, why: 'il t’en veut encore plus' },
    { t: 'post', by: 'leandre.aube', text: 'Le live est terminé. Je n’ai rien à ajouter.' },
    { t: 'reply', by: 'tess.astrale', text: 'il a vraiment cru que personne n’avait le PV' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'de mon temps on démissionnait' },
    { t: 'post', by: 'gazette_lumen', text: 'LIVE : Léandre s’enlise, le PV du conseil apparaît en direct #LeandreAubeGate' }
  );
  const DM_DATE = L(
    { t: 'msg', text: 'un resto ? avec toi ? …ok. mais c’est toi qui choisis le dessert.' },
    { t: 'rel', d: 5, why: 'touché par l’invitation' },
    { t: 'plan', kind: 'rdv', what: 'dîner au resto du lac', in: 120 }
  );
  // a date read again and rewritten: she came anyway, to talk it through
  const DATE_FIXED = L(
    { t: 'game', kind: 'quiz', title: 'Mise au point au resto', intro: 'Elle est venue quand même, mais pour qu’on s’explique. À toi de trouver les mots.' },
    { t: 'q', text: '« tu crois vraiment qu’un dîner efface tout ? »', a: ['non, je te dois des excuses', 'bah oui, c’est moi qui paie', 'c’est toi qui exagères'], ok: 0, why: 'elle attend des excuses' },
    { t: 'q', text: '« pourquoi tu as dit ça ? »', a: ['j’ai eu tort, je le regrette', 'pour le buzz, évidemment', 'je ne m’en souviens plus'], ok: 0, why: 'la sincérité d’abord' },
    { t: 'q', text: '« et maintenant, on fait quoi ? »', a: ['on repart doucement, si tu veux bien', 'on oublie tout, comme si de rien n’était', 'chacun de son côté'], ok: 0, why: 'sans brusquer' }
  );
  const DATE_GAME = L(
    { t: 'game', kind: 'quiz', title: 'Dîner au bord du lac', intro: 'Trouve les bonnes répliques pour que la soirée se passe bien.' },
    { t: 'q', text: 'Nox arrive en retard : « tu m’as attendu longtemps ? »', a: ['pas du tout, j’admirais le lac', 'une heure, merci', 'tu es toujours en retard ?'], ok: 0, why: 'Nox déteste qu’on lui fasse la morale' },
    { t: 'q', text: 'Nox : « tu sais garder un secret ? »', a: ['ça dépend du secret', 'évidemment, je suis une tombe', 'je le dirai à Théo'], ok: 1, why: 'la confiance avant tout' },
    { t: 'q', text: 'Le serveur renverse de l’eau sur Nox.', a: ['éclater de rire', 'lui tendre ta serviette', 'filmer pour le réseau'], ok: 1, why: 'Nox apprécie la discrétion' }
  );
  const DATE_END = L(
    { t: 'recap', text: 'Une soirée au bord du lac : Nox rit pour la première fois, vous parlez jusqu’à la fermeture.' },
    { t: 'msg', text: 'merci pour ce soir. je n’ai pas l’habitude qu’on m’écoute.' },
    { t: 'mem', text: 'le joueur sait garder mes secrets' }
  );
  const REPOST = L(
    { t: 'react', feel: 'flatté', d: 4, why: 'flatté que tu partages son post' },
    { t: 'dm', text: 'merci pour le repost !! ça fait plaisir' }
  );
  const APOLOGY = L(
    { t: 'eval', quality: 6, humor: 1, bold: 4, controversy: 1, reception: 4, virality: 3, sincerity: 8, skills: ['charisme'], verdict: 'Excuses acceptées', memo: 'Mila s’est excusée publiquement.' },
    { t: 'reply', by: 'theo.marlin', text: 'ok… merci de l’avoir dit. on en reparle autour d’un cookie' },
    { t: 'rel', by: 'theo.marlin', d: 8, why: 'touché par tes excuses' }
  );
  const REFRESH = L(
    { t: 'arc', title: 'Qui a volé le chaudron de la salle 3 ?', tag: '#ChaudronGate' },
    { t: 'post', by: 'leandre.aube', name: '', text: 'la maison Aube recrute. seulement les meilleurs. @mila.flux, réfléchis bien.' },
    { t: 'post', by: 'maelle.fen', name: '', text: 'tisane anti-stress avant le duel ? j’en ai pour tout le monde 🌿' },
    { t: 'post', by: 'sacha_maree', name: 'Sacha de Marée', text: 'qui a encore volé le chaudron de la salle 3 ?? #Lumen' },
    { t: 'post', by: 'coupe.astres', name: '', text: 'Classement provisoire : 1. Brasier 2. Aube 3. Marée 4. Ombre #CoupeDesAstres' },
    { t: 'post', by: 'zara.vey', name: '', text: 'entraînement à 6h. je ne dors jamais avant un duel.', photo: 'une arène de duel sous la neige au lever du soleil' },
    { t: 'post', by: 'prof.gallant', text: 'Dans deux minutes, regardez la tour nord. Ceux qui ont des yeux comprendront.', later: 2 },
    { t: 'reply', to: 0, by: 'theo.marlin', name: '', text: 'ou alors… Marée ? on a des cookies' },
    { t: 'rel', by: 'leandre.aube', d: 3, why: 'te voit comme une recrue' },
    { t: 'npc', name: 'Sacha de Marée', handle: 'sacha_maree', emoji: '🐚', bio: 'élève de Marée, râle sur tout' },
    { t: 'secret', by: 'theo.marlin', text: 'Théo a volé le chaudron de la salle 3' },
    { t: 'newquest', title: 'Choisir son camp', desc: 'Réponds à Léandre ou à Théo pour annoncer quelle maison t’attire.', char: 'leandre.aube' }
  );
  // 0.10: a wave of reactions under the player's post, and the comments loaded by « Voir plus de commentaires »
  const WAVE = L(
    { t: 'reply', by: 'tess.astrale', text: 'je viens de voir ça, Zara va te détruire 😭' },
    { t: 'reply', by: 'curieux_du_hall', name: 'Un curieux du hall', bio: 'traîne dans le hall entre deux cours', text: 'attendez c’est quoi cette histoire de duel ?', to: 'tess.astrale' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'de mon temps on se battait pour de vrai' },
    { t: 'reply', by: 'lilou_cuisines', text: 'les cuisines parient déjà sur Mila 🍩' },
    { t: 'reply', by: 'fan_de_brasier', name: 'Inès de Brasier', text: 'Brasier ne perd jamais, retiens bien', to: 'lilou_cuisines' },
    { t: 'post', by: 'lilou_cuisines', text: 'le défi de @mila.flux fait le tour des cuisines 👀 #DuelDesGlycines', quote: true }
  );
  const MORE = L(
    { t: 'reply', by: 'tess.astrale', text: 'personne n’arrive à la cheville de Zara, point.' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'encore un post sur ce duel… je déménage', to: 'tess.astrale' },
    { t: 'reply', by: 'lilou_cuisines', text: 'les cuisines ont parié 3 tartes sur la nouvelle 🍩' },
    { t: 'reply', by: 'curieux_du_hall', name: 'Un curieux du hall', bio: 'traîne dans le hall entre deux cours', text: 'quelqu’un a un résumé ? je suis perdu', to: 'lilou_cuisines' },
    { t: 'reply', by: 'sacha_maree', name: 'Sacha de Marée', bio: 'élève de Marée, râle sur tout', text: 'Marée s’en fiche, on a piscine' },
    { t: 'reply', by: 'tess.astrale', text: 'les cuisines vont perdre leurs tartes', to: 'lilou_cuisines' },
    { t: 'reply', by: 'fan_de_brasier', name: 'Inès de Brasier', text: 'Brasier forever 🔥' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'de mon temps, les tartes, on les mangeait', to: 'tess.astrale' }
  );
  const IDEAS = L(
    { t: 'idea', angle: 'drôle', text: 'j’ai demandé aux étoiles si j’allais gagner demain. elles ont ri. moi aussi.' },
    { t: 'idea', angle: 'audacieux', text: '@zara.vey petit rappel : invaincue ne veut pas dire invincible' },
    { t: 'idea', angle: 'sincère', text: 'premier jour à Lumen et déjà trois ennemis. je crois que je vais aimer cet endroit' }
  );
  const NEWCHAR = L(
    { t: 'char', name: 'Cassiopée Rhune', handle: 'cassio.rhune', emoji: '🐍', g: 'f', role: 'Transférée de l’école rivale', bio: 'je ne suis pas là pour me faire des amis.', personality: 'froide, ambitieuse', voice: 'courte, tranchante', followers: 9100, rel: -8 },
    { t: 'post', by: 'cassio.rhune', text: 'Lumen est plus petite que dans mes souvenirs.' }
  );
  // 0.7: candidates, « écrire pour moi », a brand that negotiates, a candidate who lowers the price, intel kept from a DM,
  // a denial judged, and the refresh lines of the career (a rumor, an enemy at work, a leak, allies, a brand, a trend)
  const CANDS = L(
    { t: 'cand', name: 'Lou Ferrand', handle: 'lou.cut', emoji: '✂️', g: 'f', tier: 0, years: 2, pitch: 'monte les vlogs du club de théâtre de Lumen, rapide et pas chère', personality: 'enthousiaste, un peu anxieuse', voice: 'beaucoup de points d’exclamation', hello: 'Salut !! Je monte des vidéos depuis 2 ans, je suis dispo tout de suite !' },
    { t: 'cand', name: 'Bastien Roche', handle: 'bastien.monte', emoji: '🎞️', g: 'm', tier: 1, years: 4, pitch: 'a monté la chaîne de la Gazette de Lumen (80 k abonnés)', personality: 'carré, fiable, sans chichis', voice: 'phrases courtes', hello: 'Bonjour. 4 ans de montage, la Gazette c’est moi. On en parle ?' },
    { t: 'cand', name: 'Iris Vasquez', handle: 'iris.vfx', emoji: '🌌', g: 'f', tier: 2, years: 9, pitch: 'monteuse des plus gros formats de l’académie, effets spéciaux compris', personality: 'exigeante, sûre d’elle', voice: 'directe, un peu hautaine', hello: 'Je ne travaille qu’avec des gens ambitieux. Tu l’es ?' }
  );
  const WRITE_QUOTE = L({ t: 'write', text: 'Merci pour la proposition ! Voici mon devis détaillé : 1 vidéo avec intégration de 60 s (900 €), mention « Collaboration commerciale » incluse, mise en ligne permanente (offerte), exclusivité 30 jours (+150 €), droits d’utilisation 3 mois (+200 €). Total : 1 250 €.' });
  const WRITE_ANY = L({ t: 'write', text: 'honnêtement ? je m’attendais à pire. on en reparle demain, et cette fois je ramène les preuves' });
  const DEBUNK = L(
    { t: 'eval', quality: 7, humor: 2, bold: 5, controversy: 3, reception: 6, virality: 6, credibility: 8, skills: ['charisme'], verdict: 'Rumeur démontée', memo: 'Mila a démonté la rumeur de Zara.' },
    { t: 'reply', by: 'tess.astrale', text: 'les captures parlent d’elles-mêmes. @zara.vey t’es grillée' },
    { t: 'reply', by: 'zara.vey', text: 'CE N’EST PAS CE QUE VOUS CROYEZ. c’était une blague, voilà.' },
    { t: 'reply', by: 'gargouille_ronchon', text: 'la rumeur a duré moins longtemps qu’un sort de lévitation' }
  );
  function brandDM(p) {
    const said = (p.split('Nouveau message du joueur')[1] || '').split('\n')[1] || '';
    if (/je (la )?mets la mention|avec la mention/i.test(said)) { // 0.19.1: the player keeps the mention for a lower price: the brand agrees, the contract follows
      const lo = Number((/entre (\d+) et (\d+)/.exec(p.split('OBLIGATOIRE dès que')[1] || '') || [])[1] || 0);
      return L({ t: 'msg', text: 'Bon… va pour la mention. Mais du coup on baisse un peu, ok ?' }, { t: 'deal', mention: true, ...(lo ? { fee: lo } : {}) }, { t: 'rel', d: 1, why: 'a tenu à faire les choses bien' });
    }
    const ac = /acompte (?:de |à )?(\d+)\s?%/i.exec(said); // 0.27.4: the brand agrees to a down payment, the contract follows
    if (ac) return L({ t: 'msg', text: `Ça marche pour ${ac[1]} % d’acompte, je l’ajoute au contrat.` }, { t: 'deal', upfront: window.__mockUpRaw !== undefined ? window.__mockUpRaw : Number(ac[1]) }, { t: 'rel', d: 1, why: 'échange pro' });
    const ask = /je serais plutôt sur ([\d\s]+)/.exec(p.split('Nouveau message du joueur')[1] || '');
    const max = Number(((/monter jusqu’à ([\d\s]+)/.exec(p) || [])[1] || '0').replace(/\D/g, ''));
    const want = ask ? Number(ask[1].replace(/\D/g, '')) : 0;
    const fee = want && max ? Math.min(want, max) : 0;
    return L({ t: 'msg', text: fee ? `Ok, on peut faire un effort : ${fee} €, c’est notre maximum.` : 'Avec plaisir, dis-moi ce dont tu as besoin !' }, ...(fee ? [{ t: 'deal', fee }] : []), { t: 'rel', d: 2, why: 'échange pro agréable' });
  }
  function candDM(p) {
    const rate = Number(((/Tarif demandé : ([\d\s]+)/.exec(p) || [])[1] || '0').replace(/\D/g, ''));
    return L({ t: 'msg', text: 'Ok, pour toi je fais un geste : 10 % de moins.' }, ...(rate ? [{ t: 'rate', rate: Math.round(rate * 0.9) }] : []), { t: 'rel', d: 3, why: 'contente de bosser avec toi' });
  }
  function careerRefresh(p) {
    const extra = [];
    if (window.__mockTieLine && p.includes('{"t":"tie"')) extra.push(window.__mockTieLine); // 0.13: two characters fall out, or grow closer
    if (window.__mockSelfBuzz && p.includes('{"t":"badbuzz"')) extra.push({ t: 'post', by: 'gargouille_ronchon', text: `le vieux post de @${window.__mockSelfBuzz} refait surface et c’est gênant 💀 #VieuxPost` }, { t: 'badbuzz', by: window.__mockSelfBuzz, why: 'un vieux post gênant qui refait surface' }); // 0.15: the AI makes one of them fall on their own
    const src = /un ennemi du joueur \((@[\w.]+)/.exec(p);
    if (src && window.__mockRumor) {
      const h = src[1].slice(1);
      extra.push({ t: 'post', by: h, text: 'on m’a dit que @mila.flux paie des faux abonnés depuis le début. je dis ça, je dis rien.' }, { t: 'rumor', by: h, text: 'Mila paie des faux abonnés depuis le début', sev: 2 });
    }
    const en = /- Facultatif \(au plus 1\) : (@[\w.]+)(?:, @[\w.]+)* essaie de monter/.exec(p);
    if (en && window.__mockTurn) extra.push({ t: 'turn', by: en[1].slice(1), who: window.__mockTurn, d: 6, text: 'franchement, Mila se sert de toi' });
    const def = /Les alliés du joueur \((@[\w.]+)/.exec(p);
    if (def) extra.push({ t: 'post', by: def[1].slice(1), text: 'c’est faux et vous le savez. je connais @mila.flux.' }, { t: 'defend', by: def[1].slice(1) });
    const it = /- (in[\w]+) : « [^»]* » \([^)]*\) · détenu par (@[\w.]+)/.exec(p);
    if (it && window.__mockLeak) extra.push({ t: 'post', by: it[2].slice(1), text: 'puisque @mila.flux aime donner des leçons, voilà ce qu’elle m’écrit en privé 👇' }, { t: 'leak', id: it[1], by: it[2].slice(1), public: true });
    if (p.includes('"t":"fan"') && window.__mockFan) { window.__mockFanN = (window.__mockFanN || 0) + 1; extra.push(Object.assign({ t: 'fan', name: ['Jade Rivière', 'Malo Perrin', 'Inaya Costa', 'Basile Moulin'][window.__mockFanN % 4], handle: ['jade.riv', 'malo.prn', 'inaya.cst', 'basile.mln'][window.__mockFanN % 4], g: ['f', 'm', 'f', 'm'][window.__mockFanN % 4], bio: 'étudiante en 2e année, fan de la première heure', text: 'je regarde toutes tes vidéos ! comment tu choisis tes sujets ? tu pourrais faire une vidéo là-dessus ?', q: true }, typeof window.__mockFan === 'object' ? window.__mockFan : {})); }
    if (p.includes('"t":"sponsor"') && window.__mockSponsor) extra.push({ t: 'sponsor', brand: 'Potions Pétillantes', emoji: '🧪', sector: 'boisson', product: 'sa potion énergisante au citron', what: 'vidéo', contact: 'Inès Garnier', g: 'f', shady: window.__mockSponsorShady, /* undefined: 12 % hidden, as the game draws it */ text: 'Coucou ! Je gère les partenariats de Potions Pétillantes, on adore ton univers. Partante pour une collab ?' });
    if (p.includes('"t":"trend"')) extra.push({ t: 'trend', kind: 'son', name: 'Chaudron Funk (remix)', emoji: '🧪' });
    if (p.includes('"re":"handle"')) extra.push({ t: 'reply', to: 0, by: 'gargouille_ronchon', text: 'Marée, des cookies ? de mon temps c’était des biscottes', re: 'theo.marlin' }); // 0.10: they answer each other
    if (window.__mockRefreshInvite) { // 0.9.4: a DM that asks the player out (with the invitation line, or only in the words)
      const h = window.__mockRefreshInvite;
      extra.push({ t: 'dm', by: h, text: 'ça te tente une balade au lac après-demain à 17h ?' });
      if (window.__mockRefreshInviteLine) extra.push({ t: 'invite', by: h, what: 'balade au lac', day: 2, at: '17:00' });
    }
    const tq = /tempérament face à la réputation du joueur : choisis-en un[^\n]* pour ((?:@[\w.]+(?:, )?)+)/.exec(p);
    if (tq && window.__mockTemper) for (const h of tq[1].split(', ')) extra.push({ t: 'temper', by: h.slice(1), kind: window.__mockTemper, why: 'a toujours suivi le vent' });
    // the photos the game chose: their characters write the captions
    const caps = p.split('## PHOTOS QUI SORTENT')[1];
    if (caps) for (const m of caps.matchAll(/^- (q[\w]+) · @([\w.]+)/gm)) extra.push({ t: 'cap', id: m[1], text: `trop pressé·e de jouer à GTA 7 🎮 (${m[2]})` });
    return REFRESH + (extra.length ? '\n' + L(...extra) : '');
  }
  // 0.9: the character answers an advice by trust (window.__mockAdvice drives the line), confides their secret
  // (window.__mockConfide), and trust lines in a DM (window.__mockTrust) or after a post (window.__mockActTrust).
  function adviceDM(p) {
    const A = window.__mockAdvice || {};
    const tr = Number((/Confiance de .+? envers le joueur : (\d+)\/100/.exec(p) || [])[1] || 0);
    const risk = A.risk == null ? 1 : A.risk;
    const follow = A.follow != null ? A.follow : tr >= [40, 70, 90][risk];
    const line = follow ? { t: 'advice', risk, q: A.q == null ? 2 : A.q, follow: true, kind: A.kind || 'video', what: A.what || 'une vidéo sur ses entraînements secrets', text: A.text || 'nouvelle vidéo : mes entraînements secrets, enfin. 🎬', to: A.to || '', in: A.in || 60 } : { t: 'advice', risk, q: A.q == null ? 0 : A.q, follow: false };
    return L(line, { t: 'msg', text: follow ? 'ok. je le fais. t’as intérêt à avoir raison.' : 'lol. pourquoi je t’écouterais ?' }, { t: 'rel', d: 0, why: '' }, ...(A.trust ? [{ t: 'trust', d: A.trust, why: 'conseil sensé' }] : []));
  }
  function confideDM(p) {
    const secret = (/Son secret \([^\n]*?\) : ([^\n]+)/.exec(p) || [])[1] || 'un truc que personne ne sait';
    return L({ t: 'msg', text: 'je vais te dire un truc. personne ne doit le savoir.' }, { t: 'msg', text: 'la vérité : ' + secret }, { t: 'rel', d: 3, why: 'soulagé·e de l’avoir dit' }, { t: 'confide' });
  }
  const withTrust = (text, line) => (line ? text + '\n' + JSON.stringify(line) : text);
  // 0.9.4: a character asks the player out (window.__mockInvite: 'line' with the invitation line, 'text' only in the words,
  // 'plan' a date fixed four days away, 'yes-noplan' a « oui » answered without the plan line, 'no' the invitation turned down).
  function inviteDM(p) {
    const M = window.__mockInvite;
    if (M === 'yes-noplan' && p.includes('Invitation de')) return L({ t: 'msg', text: 'trop bien ! à samedi alors 😊' }, { t: 'rel', d: 2, why: 'contente' });
    if (M === 'no' && p.includes('Invitation de')) return L({ t: 'msg', text: 'ok… dommage.' }, { t: 'noinvite' }, { t: 'rel', d: -1, why: 'déçue' });
    if (M === 'line') return L({ t: 'msg', text: 'dis… ça te dit un verre samedi soir au Café des Astres ?' }, { t: 'invite', what: 'un verre au Café des Astres', day: window.__mockInviteDay || 3, at: '20:30' }, { t: 'rel', d: 2, why: 'a envie de te voir' });
    if (M === 'text') return L({ t: 'msg', text: 'au fait, on se voit demain à 19h au Café des Astres ?' }, { t: 'rel', d: 2, why: 'a envie de te voir' });
    if (M === 'plan') return L({ t: 'msg', text: 'deal : dîner au Lac, dans quatre jours, 20h. je réserve.' }, { t: 'plan', kind: 'rdv', what: 'dîner au Lac', day: 4, at: '20:00' }, { t: 'rel', d: 3, why: 'rendez-vous fixé' });
    return null;
  }
  // The faces listed in a prompt (« - f03 (femme) : … »), by gender; the mock gives each character the last free one of its gender.
  function facesIn(p) {
    const by = { f: [], m: [], x: [] }, G = { femme: 'f', homme: 'm', 'look androgyne': 'x' };
    for (const m of (p.split('LES VISAGES DU JEU')[1] || '').matchAll(/^- ([a-z0-9-]+) \((femme|homme|look androgyne)\)/gm)) by[G[m[2]]].push(m[1]);
    return by;
  }
  // 0.11: their hearts (window.__mockCoeurs: { handle: heart } for a test), Iris the fortress of the first five
  function withHearts(text) {
    const want = window.__mockCoeurs || {};
    return text.split('\n').map((line) => { const o = JSON.parse(line); if (o.t === 'char') { o.coeur = want[o.handle] || (o.handle === 'prof.gallant' ? 'forteresse' : 'serein'); if (window.__mockAmis && window.__mockAmis[o.handle]) o.ami = window.__mockAmis[o.handle]; if (window.__mockTies && window.__mockTies[o.handle]) Object.assign(o, window.__mockTies[o.handle]); } return JSON.stringify(o); }).join('\n');
  }
  // 0.11: the reaction the AI picks (window.__mockReacts: a queue for a test), from the player's words otherwise
  function reactFor(said) {
    if (Array.isArray(window.__mockReacts) && window.__mockReacts.length) return window.__mockReacts.shift();
    return /😏|haha|taquin|mdr/i.test(said) ? 'charme' : /nul|ennui|bof/i.test(said) ? 'refroidi' : 'amuse';
  }
  const TALK_OPEN = L(
    { t: 'scene', text: 'Le Café des Astres, une table près de la fenêtre. Nox arrive en retard, capuche relevée, et s’assoit en face de toi.' },
    { t: 'say', text: 'alors. tu voulais me voir. je t’écoute.', seen: 'un demi-sourire, les bras croisés' });
  function talkTurnReply(p) {
    const lastW = p.includes('## LE DERNIER MOT DU JOUEUR'); // 0.22.3: the last word, as they part
    const said = (p.split(lastW ? '## LE DERNIER MOT DU JOUEUR' : '## LA RÉPLIQUE DU JOUEUR')[1] || '').split('##')[0];
    const r = reactFor(said);
    const end = p.includes('C’est la fin de la soirée') || lastW;
    const say = r === 'charme' ? 'ok, là tu m’as eu·e.' : r === 'refroidi' ? 'hm. si tu le dis.' : r === 'gene' ? 'euh… ok.' : 'pas mal.';
    const met = window.__mockExpect && p.includes('"met":false') && /tour nord/i.test(said); // 0.16: the player met what they hoped for
    const stay = lastW && p.includes('{"t":"stay"}') && window.__mockStay !== false && /rentrer|dormir|chez moi/i.test(said) && (r === 'charme' || r === 'amuse');
    const buy = window.__mockBuy && p.includes('{"t":"buy"') ? Object.assign({ t: 'buy' }, window.__mockBuy) : null; // 0.24
    if (buy) window.__mockBuy = null;
    const gift = window.__mockGift && p.includes('{"t":"gift"') ? Object.assign({ t: 'gift' }, window.__mockGift) : null; // 0.26
    if (gift) window.__mockGift = null;
    return L(Object.assign({ t: 'judge', react: r }, met ? { met: true } : {}), { t: 'say', text: stay ? say + ' allez… viens.' : end ? say + ' bon. il est tard. merci pour ce soir.' : say + ' et toi, t’en penses quoi ?', seen: r === 'charme' ? 'les yeux qui brillent' : r === 'refroidi' ? 'regarde son téléphone' : 'un sourire en coin' }, ...(stay ? [{ t: 'stay' }] : []), ...(buy ? [buy] : []), ...(gift ? [gift] : []));
  }
  function withFaces(text, p) {
    const by = facesIn(p);
    return text.split('\n').map((line) => { const o = JSON.parse(line); if (o.t === 'char' && by[o.g] && by[o.g].length) o.face = by[o.g].pop(); return JSON.stringify(o); }).join('\n');
  }
  // 0.18: a confession, the answer to a secret out in public (window.__mockSincerity, window.__mockSecCred), a surprise visit
  // played (the reactions from window.__mockReacts; window.__mockLeaveNow ends it at once), and the lines an act or a refresh
  // may add (a visit, two friends asking for the same spot, someone digging, throwing a secret out, letting it slip, proving
  // a lie, a dossier), each when the game offers it and the test asks for it.
  const CONFESS = () => L({ t: 'eval', quality: 6, humor: 1, bold: 6, controversy: 4, reception: 4, virality: 5, sincerity: window.__mockSincerity == null ? 8 : window.__mockSincerity, skills: ['charisme'], verdict: 'Un aveu qui marque', memo: '' }, { t: 'reply', by: 'theo.marlin', text: 'respect pour l’avoir dit toi-même' }, { t: 'reply', by: 'tess.astrale', text: 'attends QUOI' });
  const SECRET_ANS = () => L({ t: 'eval', quality: 6, humor: 1, bold: 5, controversy: 5, reception: 3, virality: 5, credibility: window.__mockSecCred == null ? 8 : window.__mockSecCred, skills: [], verdict: 'Le réseau juge', memo: '' }, { t: 'reply', by: 'tess.astrale', text: 'bon… on verra bien' }, { t: 'reply', by: 'gargouille_ronchon', text: 'de mon temps on avouait tout de suite' });
  function visitReply(p) {
    const said = (p.split('## LA RÉPLIQUE DU JOUEUR')[1] || '').split('##')[0];
    const r = reactFor(said);
    const end = p.includes('C’est la fin de la visite') || !!window.__mockLeaveNow;
    const say = r === 'charme' ? 'ok… merci de me l’avoir dit en face.' : r === 'refroidi' ? 'sérieusement ? c’est tout ce que t’as à dire ?' : r === 'gene' ? 'euh… ok.' : 'hm. d’accord.';
    const lines = [{ t: 'judge', react: r }, { t: 'say', text: end ? say + ' bon, j’y vais.' : say + ' et maintenant ?', seen: r === 'charme' ? 'les épaules qui se relâchent' : r === 'refroidi' ? 'les bras croisés' : 'un regard en coin' }];
    if (end) lines.push({ t: 'leave', mood: window.__mockLeaveMood || (r === 'charme' ? 'apaise' : r === 'refroidi' ? 'fache' : 'pareil'), why: 'reparti après avoir parlé' });
    if (window.__mockVisitMem) lines.push({ t: 'mem', text: window.__mockVisitMem });
    return L(...lines);
  }
  // 0.19 (Vivant, Ultime): the replies that come later, written with the post itself (window.__mockNoLate: the model forgot them)
  const LATE = [
    { t: 'reply', by: 'tess.astrale', text: 'je viens de voir ça, Zara va te détruire 😭', late: 2 },
    { t: 'reply', by: 'curieux_du_hall', name: 'Un curieux du hall', bio: 'traîne dans le hall entre deux cours', text: 'attendez c’est quoi cette histoire de duel ?', to: 'tess.astrale', late: 2 },
    { t: 'reply', by: 'gargouille_ronchon', text: 'de mon temps on se battait pour de vrai', late: 3 },
    { t: 'reply', by: 'lilou_cuisines', text: 'les cuisines parient déjà sur Mila 🍩', late: 3 },
    { t: 'reply', by: 'fan_de_brasier', name: 'Inès de Brasier', text: 'Brasier ne perd jamais, retiens bien', to: 'lilou_cuisines', late: 4 },
    { t: 'reply', by: 'sacha_maree', name: 'Sacha de Marée', bio: 'élève de Marée, râle sur tout', text: 'encore ce duel ? Marée s’en fiche, on a piscine', late: 6 },
    { t: 'reply', by: 'tess.astrale', text: 'les paris sont ouverts, je mise tout sur Zara', to: 'lilou_cuisines', late: 7 },
    { t: 'reply', by: 'curieux_du_hall', name: 'Un curieux du hall', text: 'ok j’ai compris, c’est demain 8h. j’apporte du pop-corn', late: 8 },
    { t: 'reply', by: 'gargouille_ronchon', text: 'du pop-corn. à mon époque on apportait des boucliers', to: 'curieux_du_hall', late: 9 },
  ];
  function extras18(p) {
    const out = [];
    if (!p.includes('## TA MISSION') || p.includes('TÂCHE :')) return out;
    const late = /(\d+) à (\d+) réponses qui arriveront PLUS TARD/.exec(p);
    if (late && !window.__mockNoLate) out.push(...LATE.slice(0, +late[1] >= 9 ? 9 : 5), { t: 'post', by: 'lilou_cuisines', text: 'le défi de @mila.flux fait le tour des cuisines 👀 #DuelDesGlycines', quote: true, later: 4 });
    if (window.__mockVisit && p.includes('{"t":"visit"')) { const V = window.__mockVisit; window.__mockVisit = null; out.push({ t: 'visit', by: V.by, why: V.why || 'ce qu’il a vu en public', urge: V.urge || 'urgent', first: V.first || 'on peut parler ? maintenant.', seen: 'la mâchoire serrée' }); }
    const ask = /OBLIGATOIRE cette fois : (@[\w.]+)(?: et (@[\w.]+))?/.exec(p);
    if (ask && window.__mockAsk !== false) for (const h of [ask[1], ask[2]].filter(Boolean)) out.push({ t: 'dm', by: h.slice(1), text: 'dis… pour ton partenariat, tu me prends ? je serais parfait dessus' });
    if (window.__mockDig && p.includes('{"t":"dig"')) out.push({ t: 'dig', by: window.__mockDig });
    const sid = (/\[(sc[\w]+)\]/.exec(p) || [])[1];
    if (window.__mockExpose && p.includes('{"t":"expose"') && sid) out.push({ t: 'post', by: window.__mockExpose, text: 'petite révélation sur @mila.flux. accrochez-vous.' }, { t: 'expose', by: window.__mockExpose, id: sid });
    if (window.__mockSlip && p.includes('{"t":"slip"') && sid) out.push({ t: 'slip', by: window.__mockSlip.by, to: window.__mockSlip.to, id: sid });
    const pid = (/\{"t":"proof","by":"handle","id":"(sc[\w]+)"\}/.exec(p) || [])[1];
    if (window.__mockProof && pid) out.push({ t: 'post', by: window.__mockProof, text: 'elle a juré que c’était faux. voilà la preuve.' }, { t: 'proof', by: window.__mockProof, id: pid });
    if (window.__mockDossier && p.includes('{"t":"dossier"')) { const D = window.__mockDossier; out.push({ t: 'dm', by: D.by, text: 'j’ai un dossier sur @' + D.about + '. tu en fais ce que tu veux.' }, { t: 'dossier', by: D.by, about: D.about, text: D.text }); }
    return out;
  }
  // in a private conversation: the player says who gets the spot (window.__mockChoice), a brand offers the hidden ad (window.__mockShady)
  function extrasDM(p) {
    const out = [];
    if (window.__mockChoice != null && p.includes('{"t":"choice"')) out.push({ t: 'choice', to: window.__mockChoice });
    if (window.__mockShady && p.includes('{"t":"shady"}')) out.push({ t: 'msg', text: 'entre nous : on double presque si tu ne mets pas la mention. personne ne vérifie.' }, { t: 'shady' });
    if (window.__mockBuy && p.includes('{"t":"buy"')) { out.push(Object.assign({ t: 'buy' }, window.__mockBuy)); window.__mockBuy = null; } // 0.24: something bought
    if (window.__mockGift && p.includes('{"t":"gift"')) { out.push(Object.assign({ t: 'gift' }, window.__mockGift)); window.__mockGift = null; } // 0.26: a present for the player
    return out;
  }
  window.__prompts = [];
  window.__sampleMode = 'ok';
  window.__actN = 0;
  function choose(p) {
    function devisReply(p) {
      if (window.__mockDevis) return L(...window.__mockDevis);
      const topic = (/« ([^»]+) »/.exec(p.split('## TÂCHE')[0]) || [])[1] || '';
      const short = /format court vertical/.test(p), live = /prépare un live/.test(p), days = /un défi de (\d+) jours/.exec(p);
      if (live || (short && !/voiture|resto|restaurant|recette|jeu|costume|voyage|potion/i.test(topic))) return L({ t: 'free' });
      const out = [];
      if (/voiture|ami\b|circuit/i.test(topic)) out.push({ t: 'cost', item: 'location d’une voiturette électrique (1 jour)', price: 90, kind: 'location', keep: false, per: 'once' }, { t: 'cost', item: 'circuit privé (une heure)', price: 250, kind: 'service', keep: false, per: 'once' });
      else if (/recette|resto|restaurant|cuisine|potion/i.test(topic)) out.push({ t: 'cost', item: 'ingrédients', price: days ? 12 : 25, kind: 'conso', keep: false, per: days ? 'episode' : 'once' });
      else if (/jeu/i.test(topic)) out.push({ t: 'cost', item: 'le jeu (édition standard)', price: 60, kind: 'achat', keep: true, per: 'once' });
      else out.push({ t: 'cost', item: 'accessoires pour le décor', price: 30, kind: 'achat', keep: true, per: 'once' }, { t: 'cost', item: 'snacks pour le tournage', price: 12, kind: 'conso', keep: false, per: days ? 'episode' : 'once' });
      out.push({ t: 'sponsor', sector: /voiture|voyage/i.test(topic) ? 'voyage' : /jeu/i.test(topic) ? 'jeu' : 'food', why: 'une marque du secteur pourrait payer une partie' });
      return L(...out);
    }
    if (p.includes('CRÉER L’UNIVERS')) return withHearts(p.includes('LES VISAGES DU JEU') ? withFaces(WORLD, p) : WORLD);
    if (p.includes('TÂCHE : UNE VISITE SURPRISE')) return visitReply(p); // 0.18
    if (p.includes('RÉPOND à la révélation de son secret')) return SECRET_ANS();
    if (p.includes('AVOUE PUBLIQUEMENT')) return CONFESS();
    if (p.includes('TÂCHE : LE RENDEZ-VOUS, EN VRAI')) return p.includes('LE DÉBUT DE LA SOIRÉE') ? (window.__mockExpect && p.includes('{"t":"expect"') ? L({ t: 'expect', text: window.__mockExpect }) + '\n' + TALK_OPEN : TALK_OPEN) : talkTurnReply(p); // 0.11 (0.16: what they hope for)
    if (p.includes('TÂCHE : UNE NOUVELLE VAGUE DE RÉACTIONS')) return WAVE; // 0.10
    if (p.includes('TÂCHE : D’AUTRES COMMENTAIRES SOUS UN POST')) return MORE;
    if (p.includes('TÂCHE : TROIS CANDIDATS POUR UN POSTE')) return CANDS;
    if (p.includes('## TÂCHE : LE DEVIS')) return devisReply(p); // 0.20: the quote of a content
    if (p.includes('TÂCHE : ÉCRIRE À LA PLACE DU JOUEUR')) return p.includes('devis détaillé') ? WRITE_QUOTE : WRITE_ANY;
    if (p.includes('DÉMENT une rumeur')) return DEBUNK;
    // 0.16: it gets personal with a contact (window.__mockPerso), when the game offers it
    const perso = (r) => (window.__mockPerso && p.includes('{"t":"perso"') ? r + '\n' + L({ t: 'perso', why: window.__mockPerso }) : r);
    if (p.includes('CONVERSATION PRIVÉE') && p.includes('chargé·e des partenariats')) return perso(brandDM(p));
    if (p.includes('CONVERSATION PRIVÉE') && p.includes('postule pour devenir')) return perso(candDM(p));
    if (p.includes('CONVERSATION PRIVÉE') && /je la déteste|c’est une tricheuse|je vais l’enterrer/i.test(p.split('Nouveau message du joueur')[1] || '')) return L({ t: 'msg', text: 'woah. ok. je note.' }, { t: 'rel', d: -2, why: 'choqué·e par ta méchanceté' }, { t: 'intel', text: 'le joueur insulte Zara en privé', weight: 2 });
    if (p.includes('LE MINI-JEU DU TOURNAGE')) {
      if (p.includes('NIVEAU CAUCHEMAR')) return MG_REAL;
      const imposed = /\{"t":"game","kind":"(tri|ordre|quiz|vf|intrus)"/.exec(p); // 0.27.3: the format the game picked
      if (imposed) return { tri: MG_TRI, ordre: MG_ORDER, quiz: MG_QUIZ, vf: MG_VF, intrus: MG_ODD }[imposed[1]];
      const topic = (/SON SUJET, choisi par lui : « ([^»]*)/.exec(p) || [])[1] || '';
      if (/idées reçues/.test(topic)) return MG_VF;
      if (/intrus/.test(topic)) return MG_ODD;
      return MG_TRI;
    }
    if (p.includes('TÂCHE : LE JOUEUR REPOSTE')) return REPOST;
    if (p.includes('TÂCHE : L’ÉVÉNEMENT A LIEU')) return EVENT_LIVE;
    if (p.includes('TÂCHE : RELIS LE MINI-JEU DU RENDEZ-VOUS')) return window.__mockDateFix ? DATE_FIXED : L({ t: 'ok' }); // « Rendez-vous soignés »
    if (p.includes('TÂCHE : LE MINI-JEU DU RENDEZ-VOUS')) return DATE_GAME;
    if (p.includes('TÂCHE : LA FIN DU RENDEZ-VOUS') && p.includes('{"t":"morning"')) return L( // 0.25.3: a night together: the morning
      { t: 'recap', text: 'Un dîner aux chandelles, des rires, et une soirée qui ne voulait pas finir.' },
      { t: 'morning', where: window.__mockWhere || 'c', text: 'Le soleil passe entre les rideaux. Théo apporte deux cafés, les cheveux en bataille : « bien dormi ? j’ai brûlé les tartines, désolé. »' },
      { t: 'mem', text: 'la nuit avec le joueur, et ce café du matin' });
    if (p.includes('TÂCHE : LA FIN DU RENDEZ-VOUS')) return DATE_END;
    if (p.includes('Le joueur publie enfin')) { // 0.21: the advertisers' verdict, when a test sets it; the donations of a live
      let out = window.__mockAds ? VIDEO_PUB.replace('"t":"eval",', '"t":"eval",' + JSON.stringify(window.__mockAds).slice(1, -1) + ',') : VIDEO_PUB;
      if (p.includes('{"t":"don"') && window.__mockDons) out += '\n' + L({ t: 'don', by: 'tess.astrale', text: 'pour le chaudron de la salle 3 ! continue 🔥' }, { t: 'don', by: 'lilou_cuisines', text: 'meilleur live de la semaine, merci !!' });
      return out;
    }
    if (p.includes('EXCUSES PUBLIQUES')) return APOLOGY;
    if (p.includes('LANCE UN BAD BUZZ')) {
      if (!p.includes('la pièce est démasquée')) return ACCUSE;
      return p.includes('accuse publiquement @leandre.aube') ? FAKE_BUSTED : FAKE_PASS;
    }
    if (p.includes('Le joueur publie ce post')) {
      if (p.includes('LANCE SON MERCH')) { const m = window.__mockMerch == null ? 3 : window.__mockMerch; return PLAIN.replace('"t":"eval",', '"t":"eval","merch":' + m + ','); } // 0.22: how much people want it
      if (/losers|nuls|pathétique/i.test(p.split('## ACTION DU JOUEUR')[1] || '')) return MEAN;
      if (/sort dans 1h/i.test(p.split('## ACTION DU JOUEUR')[1] || '')) return ANNOUNCE;
      const seen = p.includes('générées par IA du perso du joueur') ? { t: 'photo', desc: 'Mila en veste rouge sous les néons d’une rue de Tokyo, grand sourire' } : null; // the player's images, seen
      return withTrust(withTrust(window.__actN++ === 0 ? ACT : PLAIN, seen), window.__mockActTrust ? { t: 'trust', by: window.__mockActTrust, d: 6, why: 'tu l’as défendu·e en public' } : null);
    }
    if (p.includes('Le joueur répond au post') || p.includes('Le joueur répond à un commentaire')) return /tu réponds quand/.test(p.split('## ACTION DU JOUEUR')[1] || '') ? REPLY_LIVE : REPLY;
    if (p.includes('CONVERSATION PRIVÉE') && p.includes('## CE MESSAGE EST UN CONSEIL')) return adviceDM(p);
    if (p.includes('CONVERSATION PRIVÉE') && window.__mockConfide && p.includes('{"t":"confide"}')) return confideDM(p);
    // 0.23: a service agreed (window.__mockJob: { kind, what, pay, days, files, in }), files sent later (window.__mockJobFiles)
    if (p.includes('CONVERSATION PRIVÉE') && window.__mockJob && p.includes('{"t":"job"')) {
      const J = window.__mockJob; window.__mockJob = null;
      return L({ t: 'msg', text: 'ça me tente ! je te passe des clips.' }, { t: 'job', kind: J.kind || 'montage', what: J.what || 'un edit Valorant fun mais très joli', pay: J.pay || 0, days: J.days || 3 },
        ...(J.files || []).map((n) => ({ t: 'file', name: n, in: J.in || 0 })), { t: 'rel', d: 2, why: 'un projet ensemble' });
    }
    if (p.includes('CONVERSATION PRIVÉE') && window.__mockJobFiles && p.includes('{"t":"file"')) {
      const F = window.__mockJobFiles; window.__mockJobFiles = null;
      return L({ t: 'msg', text: 'tiens, les voilà !' }, ...F.map((n) => ({ t: 'file', name: n, in: 0 })), { t: 'rel', d: 1, why: '' });
    }
    if (p.includes('TÂCHE : LE TRAVAIL LIVRÉ')) {
      const good = /: (excellent|bon) \(/.test(p), handle = (/en mentionnant (@[\w.]+)/.exec(p) || [])[1] || '';
      return L({ t: 'msg', text: good ? 'wow, c’est trop bien, merci !!' : 'hmm… c’est pas ouf, honnêtement.' }, { t: 'rel', d: good ? 5 : -3, why: good ? 'un super montage' : 'un montage bâclé' },
        { t: 'jobpost', text: good ? `nouvelle vidéo ! monté par ${handle}, il a géré 🔥` : `nouvelle vidéo… montage ${handle}` });
    }
    if (p.includes('CONVERSATION PRIVÉE') && window.__mockCancel && p.includes('{"t":"cancel"')) return L({ t: 'msg', text: 'laisse tomber pour ce soir. je viendrai pas.' }, { t: 'cancel', why: 'trop déçue par ton message' }, { t: 'rel', d: -4, why: 'déçue' });
    if (p.includes('CONVERSATION PRIVÉE') && window.__mockInvite) { const r = inviteDM(p); if (r) return r; }
    if (p.includes('CONVERSATION PRIVÉE') && p.includes('{"t":"judge"')) { // 0.11: a dare or doubts: their reaction, then their answer
      const said = (p.split('Nouveau message du joueur')[1] || '').split('\n')[1] || '';
      const r = reactFor(said), dare = p.includes('LE JOUEUR BRÛLE LES ÉTAPES');
      const yes = dare && /dit oui, à sa façon/.test(p) && (r === 'charme' || r === 'amuse');
      window.__judged = (window.__judged || []).concat(r);
      return L({ t: 'judge', react: r }, { t: 'msg', text: yes ? 'bon… d’accord. tu as gagné.' : r === 'charme' || r === 'amuse' ? 'hm. pas mal. continue.' : 'mouais. pas convaincu·e.' }, { t: 'rel', d: 0, why: '' });
    }
    if (p.includes('CONVERSATION PRIVÉE')) return withTrust(/resto/.test(p.split('Nouveau message du joueur')[1] || '') ? DM_DATE : DM, window.__mockTrust ? { t: 'trust', d: window.__mockTrust, why: 'tu as tenu parole' } : null);
    if (p.includes('Propose 3')) return IDEAS;
    if (p.includes('nouveau personnage débarque')) return p.includes('LES VISAGES DU JEU') ? withFaces(NEWCHAR, p) : NEWCHAR;
    return careerRefresh(p);
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function sample(input, opts = {}) {
    const prompt = typeof input === 'string' ? input : input.map((m) => m.content).join('\n');
    window.__prompts.push(prompt);
    if (opts.images) { // the player's images (0.9.2): what was sent, and a refusal on demand
      const list = Array.isArray(opts.images) ? opts.images : [opts.images];
      (window.__imgs = window.__imgs || []).push({ n: list.length, types: list.map((b) => b && b.type), sizes: list.map((b) => b && b.size), blobs: list.every((b) => b instanceof Blob) });
      if (window.__mockImgFail) { const code = window.__mockImgFail; window.__mockImgFail = null; await sleep(150); throw { code, message: code }; }
    }
    if (window.__sampleMode === 'refuse') { await sleep(200); throw { code: 'refused', message: 'refused' }; }
    if (window.__sampleMode === 'rate') { await sleep(200); throw { code: 'rate_limited', message: 'rate' }; }
    const qid = (/id parmi (q\d+)/.exec(prompt) || [])[1] || 'q0';
    let full = choose(prompt).split('__Q__').join(qid);
    const x18 = prompt.includes('CONVERSATION PRIVÉE') ? extrasDM(prompt) : extras18(prompt); // 0.18
    if (x18.length) full = full.replace(/\n?```\s*$/, '') + '\n' + L(...x18);
    if (window.__mockSk && prompt.includes('"sk":""')) full = full.replace('{"t":"rel",', `{"t":"rel","sk":"${window.__mockSk}",`); // 0.24
    if (window.__mockKindness != null && prompt.includes('kindness -5 à 5')) full = full.replace('{"t":"eval",', `{"t":"eval","kindness":${window.__mockKindness},`); // 0.10
    if (window.__mockFlirt && prompt.includes('flirt 0-3')) full = full.replace('{"t":"eval",', `{"t":"eval","flirt":${window.__mockFlirt.flirt},"flirtWith":"${window.__mockFlirt.with}",`); // 0.17: flirting in public
    let text = '';
    let i = 0;
    await sleep(250);
    while (i < full.length) {
      const n = 25 + Math.floor(Math.random() * 60);
      const delta = full.slice(i, i + n);
      i += n;
      text += delta;
      if (opts.onText) opts.onText({ text, delta });
      await sleep(12);
    }
    return { text, truncated: false, modelTierApplied: opts.modelTier || 'default' };
  }
  sample.json = async (input, opts) => JSON.parse((await sample(input, opts)).text);
  sample.limits = async () => (window.__mockNoImages ? { maxPromptBytes: 262144 } : { maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 20e6, mediaTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] } });
  const KEY = '__mockdb:';
  const db = {
    doc(path) {
      return {
        path,
        async get() { const v = localStorage.getItem(KEY + path); return { id: path.split('/').pop(), exists: v != null, data: () => (v ? Object.freeze(JSON.parse(v)) : undefined), metadata: {} }; },
        async set(body) { const s = JSON.stringify(body); if (s.length > 262144) throw { code: 'invalid_argument', message: 'too big' }; window.__writes = (window.__writes || 0) + 1; localStorage.setItem(KEY + path, s); },
        async delete() { if (window.__failDeletes > 0) { window.__failDeletes--; throw { code: 'unavailable', message: 'offline' }; } localStorage.removeItem(KEY + path); },
      };
    },
    collection() { throw new Error('not used'); },
  };
  const user = { id: async () => 'u_test123', isOwner: async () => true, canEdit: async () => true, can: async () => true, me: async () => ({ id: 'u_test123', name: '', avatarUrl: '', color: '#888', email: null, isOwner: true, canEdit: true }) };
  const permissions = { state: async () => ({}), request: async () => ({}), manage: async () => {} };
  window.claude = { use: async (name) => { await sleep(30); return { sample, db, user, permissions }[name] || null; } };
})();
