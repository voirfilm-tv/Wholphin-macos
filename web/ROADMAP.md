# Wholphin Web — feuille de route de parité

Cette feuille de route est le document de suivi principal de la version web. L’objectif n’est pas de produire une imitation superficielle, mais une adaptation web fidèle à Wholphin : même logique d’utilisation, mêmes parcours, même hiérarchie visuelle et niveau de finition comparable, avec une architecture et des performances adaptées aux navigateurs.

## Règles de travail

Une tâche n’est considérée terminée que si :

- le comportement est conforme à la référence Wholphin ou à la limitation web documentée ;
- les états chargement, vide, erreur, hors ligne et données partielles sont traités ;
- la navigation souris, tactile, clavier et télécommande est vérifiée ;
- le focus est visible, prévisible et restauré au retour ;
- les tests concernés sont ajoutés et réussissent ;
- aucun budget de performance n’est dépassé ;
- les textes français et anglais sont présents ;
- l’accessibilité et la sécurité ne régressent pas ;
- la documentation est mise à jour.

Statuts utilisés :

- `[ ]` à faire ;
- `[-]` en cours ;
- `[x]` terminé et vérifié ;
- `[~]` adaptation web volontairement différente ;
- `[!]` bloqué ou dépendant d’un serveur/plugin.

## État réel au démarrage

Le prototype actuel fournit une connexion Jellyfin, quelques listes, une fiche média simple et un lecteur HTML5. Il ne constitue pas encore une base suffisante pour une parité complète : application monolithique, JavaScript non typé, absence de build moderne, navigation spatiale simplifiée, peu de tests, pas de virtualisation, pas de tests visuels et couverture fonctionnelle limitée.

---

# P0 — Gouvernance, référence et critères de parité

- [ ] Geler une version de référence Wholphin et enregistrer le commit source utilisé pour chaque audit.
- [ ] Inventorier tous les écrans, boîtes de dialogue, menus contextuels, états et préférences de la référence.
- [ ] Capturer les écrans de référence en 1920×1080 et 1280×720 avec données déterministes.
- [ ] Créer une matrice de parité écran par écran et fonctionnalité par fonctionnalité.
- [ ] Distinguer clairement : parité exacte, adaptation web, non applicable au navigateur et dépendance serveur/plugin.
- [ ] Conserver les notices GPL-2.0, l’attribution, l’historique des modifications et les mentions d’absence d’affiliation.
- [ ] Définir une convention de branches, commits, PR, revues et versions.
- [ ] Créer un journal de décisions techniques pour toute divergence importante avec Wholphin.
- [ ] Ajouter une checklist de définition de terminé dans le modèle de Pull Request.

**Critère de sortie P0 :** aucune fonctionnalité de la référence ne reste non inventoriée ou sans décision explicite.

# P1 — Architecture web durable

- [ ] Remplacer le prototype JavaScript monolithique par une application TypeScript modulaire.
- [ ] Mettre en place Vite pour le build, le développement, le découpage de code et les assets.
- [ ] Utiliser une couche de composants légère et compatible TV, sans dépendance lourde inutile.
- [ ] Séparer strictement : application, routes, domaines, composants, services, stores, styles, traductions et tests.
- [ ] Créer un routeur avec historique, paramètres typés, navigation arrière et restauration d’état.
- [ ] Créer un registre de routes couvrant tous les types de destinations Wholphin.
- [ ] Mettre en place une gestion d’erreurs globale et des frontières d’erreur par écran.
- [ ] Ajouter un système de notifications, confirmations et dialogues accessibles.
- [ ] Centraliser les événements clavier/télécommande et éviter les gestionnaires globaux concurrents.
- [ ] Ajouter annulation des requêtes, déduplication, cache, expiration et invalidation.
- [ ] Ajouter une stratégie de migrations pour les préférences et sessions stockées localement.
- [ ] Prévoir plusieurs serveurs et plusieurs profils sans dupliquer les données globales.
- [ ] Ajouter ESLint, formatage, vérification TypeScript stricte et règles anti-régression.
- [ ] Ajouter tests unitaires, tests composants, tests E2E et tests visuels.
- [ ] Ajouter une CI obligatoire : installation, lint, typecheck, tests, build, taille des bundles et E2E critiques.

**Critère de sortie P1 :** aucun nouvel écran ne dépend d’un fichier central monolithique et toutes les vérifications tournent automatiquement.

# P2 — Design system et fidélité visuelle

- [ ] Extraire les tokens de la référence : couleurs, surfaces, transparences, rayons, ombres, espacements, typographies et durées d’animation.
- [ ] Reproduire la gestion du backdrop avec fondu, scrims supérieur/latéral/inférieur et lisibilité garantie.
- [ ] Reproduire les cartes poster, vignette, paysage, épisode, saison, studio, genre, personne et playlist.
- [ ] Reproduire badges vu, favori, nouveau, non diffusé, manquant et barre de progression.
- [ ] Reproduire les états focus, sélection, pression, survol, désactivation et chargement.
- [ ] Reproduire les boutons principaux, secondaires, flottants et menus contextuels.
- [ ] Reproduire les transitions entre écrans et la stabilité du layout pendant le chargement.
- [ ] Ajouter skeletons ayant exactement les dimensions du contenu final.
- [ ] Reproduire le comportement des titres, logos d’œuvres, métadonnées et synopsis.
- [ ] Reproduire les variations de thèmes et couleurs disponibles dans Wholphin.
- [ ] Ajouter mode texte agrandi, contraste renforcé et réduction des mouvements.
- [ ] Adapter proprement le design aux écrans 720p, 1080p, 4K, desktop, tablette et mobile.
- [ ] Mettre en place des captures Playwright et une comparaison visuelle automatisée.
- [ ] Définir une tolérance visuelle stricte sur les zones stables et ignorer uniquement les images dynamiques.

**Critère de sortie P2 :** les pages de référence passent les tests visuels et aucune interaction ne déplace brutalement le contenu.

# P3 — Navigation TV, focus et télécommande

- [ ] Développer un moteur de navigation spatiale déterministe par zones, rangées et grilles.
- [ ] Gérer correctement gauche/droite/haut/bas, Entrée, Retour, Échap, Backspace et touches média.
- [ ] Supporter les codes clavier différents des télécommandes Android TV, Fire TV, webOS, Tizen et Apple TV navigateur.
- [ ] Restaurer le focus exact après retour depuis une fiche ou un lecteur.
- [ ] Mémoriser la position de scroll par route, rangée, onglet, saison et filtre.
- [ ] Ouvrir le tiroir depuis la gauche et gérer le retour sur l’accueil comme la référence.
- [ ] Empêcher tout piège de focus dans les carrousels, dialogues, menus et formulaires.
- [ ] Gérer les éléments ajoutés ou retirés dynamiquement sans perte de focus.
- [ ] Gérer les longs clics/appuis longs pour les menus contextuels.
- [ ] Ajouter répétition contrôlée des touches et limitation des événements trop rapides.
- [ ] Ajouter focus initial explicite pour chaque écran et chaque état vide/erreur.
- [ ] Ajouter tests E2E de parcours uniquement à la télécommande.
- [ ] Mesurer le temps de réponse de chaque déplacement de focus.

**Critère de sortie P3 :** l’application complète est utilisable sans souris et aucun déplacement de focus n’est ambigu.

# P4 — Connexion, serveurs, utilisateurs et sécurité locale

- [ ] Écran d’accueil initial fidèle à Wholphin.
- [ ] Ajout, validation, renommage et suppression de plusieurs serveurs.
- [ ] Détection du nom et de la version du serveur.
- [ ] Connexion par utilisateur/mot de passe.
- [ ] Quick Connect Jellyfin avec attente, expiration, annulation et confirmation.
- [ ] Liste des utilisateurs publics et privés selon la configuration serveur.
- [ ] Sélection de profil avec avatar.
- [ ] Changement d’utilisateur et de serveur sans rechargement complet.
- [ ] Verrouillage local par PIN, temporisation et gestion des tentatives.
- [ ] Option de toujours redemander le mot de passe serveur.
- [ ] Déconnexion locale et révocation de session côté Jellyfin lorsque disponible.
- [ ] Stockage local versionné avec avertissement clair sur le jeton.
- [ ] Masquage systématique des jetons dans logs, erreurs et diagnostics.
- [ ] Politique Referrer stricte, CSP, protections XSS et validation des URL serveur.
- [ ] Traitement explicite de CORS, HTTPS mixte, certificats invalides et reverse proxy.
- [ ] Mode démo entièrement séparé des données réelles.

**Critère de sortie P4 :** plusieurs serveurs et utilisateurs peuvent être utilisés sans mélange de cache, préférences ou historique.

# P5 — Tiroir de navigation et shell principal

- [ ] Profil en haut avec avatar, utilisateur et serveur.
- [ ] Élément « Lecture en cours » conditionnel avec titre secondaire.
- [ ] Recherche et accueil intégrés dans le même ordre que la référence.
- [ ] Bibliothèques générées dynamiquement depuis le serveur.
- [ ] Section « Plus » repliable lorsque les bibliothèques dépassent la hauteur disponible.
- [ ] Favoris et Découvrir/Seerr selon disponibilité.
- [ ] Paramètres en pied de navigation.
- [ ] Tiroir compact/étendu avec animation et déplacement cohérent du contenu.
- [ ] Surbrillance basée sur la destination active, y compris sous-pages.
- [ ] Horloge optionnelle.
- [ ] Mini-indication de musique en cours.
- [ ] Gestion correcte du bouton Retour sur l’accueil.

**Critère de sortie P5 :** le tiroir reproduit l’ordre, les états et le comportement de focus de Wholphin avec bibliothèques dynamiques.

# P6 — Accueil configurable

- [ ] Reprise de lecture.
- [ ] Prochains épisodes.
- [ ] Option de fusion « Reprendre » et « À suivre ».
- [ ] Derniers films, séries, épisodes, musique, photos et contenus par bibliothèque.
- [ ] Rangées de favoris, collections, playlists, genres et studios épinglées.
- [ ] Rangées personnalisées par utilisateur et serveur.
- [ ] Ajout, suppression, masquage et réorganisation des rangées.
- [ ] Choix poster, vignette ou backdrop par rangée.
- [ ] Choix d’affichage des titres par rangée.
- [ ] Taille de carte configurable.
- [ ] Limite d’éléments et bouton « Voir plus ».
- [ ] Suppression d’une série de « À suivre » via menu contextuel.
- [ ] Actualisation de l’accueil sans perdre le focus.
- [ ] Préchargement limité du backdrop de l’élément voisin.
- [ ] Hero/fond synchronisé avec l’élément focalisé.
- [ ] Musique de thème avec délai, volume, arrêt et préférence utilisateur.
- [ ] États de chargement indépendants par rangée.
- [ ] Tolérance aux erreurs partielles : une rangée en erreur ne bloque pas l’accueil.

**Critère de sortie P6 :** toutes les rangées Wholphin sont configurables et l’accueil reste fluide avec un grand serveur.

# P7 — Recherche Jellyfin et Découvrir/Seerr

- [ ] Recherche Jellyfin avec délai contrôlé, annulation et suggestions récentes.
- [ ] Résultats séparés par films, séries, épisodes, collections, albums, artistes et titres musicaux.
- [ ] Mode résultats combinés.
- [ ] Recherche vocale Web Speech avec repli propre lorsque non supportée.
- [ ] Navigation par onglets entre bibliothèque locale et Découvrir.
- [ ] Menu contextuel sur résultats Jellyfin.
- [ ] Filtres et tri lorsque disponibles.
- [ ] Historique local supprimable et isolé par profil.
- [ ] Seerr : configuration URL/clé, test de connexion et état visible.
- [ ] Seerr : tendances, nouveautés, films, séries et personnes.
- [ ] Seerr : fiches film/série/personne.
- [ ] Seerr : état de disponibilité, demande, approbation et erreurs.
- [ ] Seerr : saison(s) demandées pour les séries.
- [ ] Désactivation honnête des actions non autorisées.

**Critère de sortie P7 :** la recherche locale et Seerr peuvent être utilisées intégralement à la télécommande sans requêtes obsolètes affichées.

# P8 — Bibliothèques, grilles, listes, filtres et tri

- [ ] Films.
- [ ] Séries.
- [ ] Collections/box sets.
- [ ] Playlists.
- [ ] Live TV.
- [ ] Enregistrements DVR.
- [ ] Musique.
- [ ] Photos et vidéos personnelles.
- [ ] Clips musicaux.
- [ ] Livres et dossiers génériques.
- [ ] Vue grille et vue liste lorsque la référence le permet.
- [ ] Taille et type d’image configurables.
- [ ] Affichage/masquage des titres.
- [ ] Tri par nom, date ajoutée, date sortie, note, durée et aléatoire selon le type.
- [ ] Filtres genre, studio, année, favori, lu/non lu, résolution, audio et sous-titres selon API.
- [ ] Pages dédiées genres et studios.
- [ ] Navigation dans dossiers et sous-dossiers.
- [ ] Pagination incrémentale et virtualisation pour plusieurs milliers d’éléments.
- [ ] Restauration exacte du scroll, du filtre, du tri et du focus.
- [ ] Recherche locale dans la bibliothèque sans reconstruire tout le DOM.
- [ ] Actions groupées uniquement lorsque le serveur les autorise.

**Critère de sortie P8 :** une bibliothèque de plusieurs milliers d’éléments reste fluide et ne charge que les éléments visibles/proches.

# P9 — Fiches et pages de détail

- [ ] Fiche film fidèle : backdrop, logo, titre, année, durée, certification, notes, genres, synopsis et boutons.
- [ ] Reprendre, lire depuis le début et sélection de version.
- [ ] Choix audio et sous-titres avant lecture.
- [ ] Distribution, équipe, studios, tags et informations techniques.
- [ ] Bandes-annonces, extras, bonus et contenus associés.
- [ ] Collections liées.
- [ ] Fiche série fidèle.
- [ ] Onglets/sélecteur de saisons.
- [ ] Vue d’ensemble série avec défilement vers l’épisode en cours.
- [ ] Épisodes vus, non vus, manquants et non diffusés.
- [ ] Fiche épisode.
- [ ] Fiche collection.
- [ ] Fiche playlist avec réorganisation lorsque autorisée.
- [ ] Page personne et filmographie.
- [ ] Page artiste, album et piste.
- [ ] Page dossier/photo album.
- [ ] Fiches Découvrir film, série et personne.
- [ ] État favori, vu/non vu et progression mis à jour sans recharger toute la page.
- [ ] Backdrop et focus restaurés lors du retour.

**Critère de sortie P9 :** chaque type de destination de Wholphin possède une page web fonctionnelle ou une adaptation explicitement documentée.

# P10 — Menus contextuels et gestion des médias

- [ ] Ouvrir la fiche.
- [ ] Lire, reprendre et lire depuis le début.
- [ ] Marquer vu/non vu.
- [ ] Ajouter/retirer des favoris.
- [ ] Ajouter à une playlist et créer une playlist.
- [ ] Retirer d’une playlist.
- [ ] Retirer une série de « À suivre ».
- [ ] Télécharger les sous-titres via plugin compatible.
- [ ] Choisir une version média.
- [ ] Signaler un média lorsque le service/plugin est configuré.
- [ ] Supprimer un média seulement avec autorisation, confirmation et retour serveur réel.
- [ ] Actions différentes selon type de média et permissions utilisateur.
- [ ] Appui long télécommande, clic droit souris et geste tactile cohérents.
- [ ] Focus restauré sur l’élément d’origine après fermeture.

**Critère de sortie P10 :** aucune action destructive n’est simulée ou exécutée sans permission et confirmation explicite.

# P11 — Lecteur vidéo et sessions Jellyfin

- [ ] Détection réelle des codecs, conteneurs, HDR, MSE, HLS natif et capacités audio du navigateur.
- [ ] Profil appareil généré selon le navigateur au lieu d’une liste permissive fixe.
- [ ] Sélection correcte lecture directe, remux et transcodage.
- [ ] Lecture HLS avec dépendance locale, jamais chargée depuis un CDN au moment de la lecture.
- [ ] Gestion des erreurs HLS, récupération réseau et changement de niveau.
- [ ] Choix de qualité et débit maximal.
- [ ] Choix version média.
- [ ] Choix piste audio.
- [ ] Choix piste sous-titres.
- [ ] Sous-titres texte WebVTT/SRT convertis proprement.
- [ ] Adaptation/gravure serveur des formats ASS/SSA/PGS/DVD non pris en charge.
- [ ] Style de sous-titres configurable avec aperçu.
- [ ] Contrôles fidèles à Wholphin/Plex.
- [ ] D-pad gauche/droite pour chercher sans déplacer le focus lorsque les contrôles sont masqués.
- [ ] Barre de progression, buffer, temps écoulé, restant et heure de fin.
- [ ] Chapitres.
- [ ] Trickplay/aperçu image pendant la recherche.
- [ ] File de lecture et accès rapide aux épisodes.
- [ ] Épisode précédent/suivant.
- [ ] Recul configurable à la reprise.
- [ ] Lecture automatique de l’épisode suivant avec compte à rebours.
- [ ] Protection contre la lecture continue/pass-out protection.
- [ ] Segments intro/récap/crédits avec bouton de saut et préférences.
- [ ] Mode cinéma/pré-roll lorsque plugin compatible.
- [ ] Picture-in-Picture, plein écran et verrouillage d’orientation mobile lorsque permis.
- [ ] Statistiques de lecture et informations transcodage.
- [ ] Rapport Playing, Progress et Stopped avec PlayMethod exact.
- [ ] Marquage de lecture conforme aux seuils du serveur.
- [ ] Reprise fiable après veille, changement d’onglet ou perte réseau.
- [ ] Nettoyage complet des sessions, timers, MediaSource et HLS à la fermeture.
- [~] Documenter l’absence de MPV/ExoPlayer et de changement automatique de fréquence HDMI dans un navigateur.

**Critère de sortie P11 :** les décisions direct play/remux/transcode sont correctes et les contrôles restent fluides pendant la lecture 4K compatible.

# P12 — Live TV et DVR

- [ ] Liste des chaînes avec logo, numéro, programme actuel et suivant.
- [ ] Guide TV horizontal avec virtualisation temporelle et verticale.
- [ ] Fiche programme.
- [ ] Lecture chaîne en direct.
- [ ] Changement de chaîne depuis le lecteur.
- [ ] Enregistrements.
- [ ] Programmations/timers.
- [ ] Création et suppression de timer avec confirmation serveur réelle.
- [ ] Séries d’enregistrement lorsque supportées.
- [ ] États de droits insuffisants et tuner indisponible.
- [ ] Gestion du direct, pause, reprise et position lorsque le serveur le permet.

**Critère de sortie P12 :** toutes les opérations affichent l’état réel du serveur et aucune programmation n’est simulée.

# P13 — Musique et lecture audio

- [ ] Bibliothèque artistes, albums, genres, playlists et pistes.
- [ ] Pages artiste et album fidèles.
- [ ] Lecture d’une piste, d’un album, d’une playlist et d’un résultat de recherche.
- [ ] File persistante par profil.
- [ ] Lecture suivante/précédente, déplacement dans la file et suppression.
- [ ] Aléatoire et répétition.
- [ ] Mini-player global.
- [ ] Page « Lecture en cours ».
- [ ] Lecture en arrière-plan lorsque le navigateur le permet.
- [ ] Media Session API avec commandes système.
- [ ] Pochette, métadonnées et progression.
- [ ] Normalisation de volume seulement lorsque techniquement sûre.
- [ ] Rapport de session Jellyfin pour l’audio.

**Critère de sortie P13 :** la musique continue pendant la navigation et l’état de file reste cohérent après rechargement.

# P14 — Photos, diaporama et économiseur d’écran

- [ ] Bibliothèques photos et albums.
- [ ] Grille virtualisée.
- [ ] Affichage plein écran avec précédent/suivant.
- [ ] Zoom et déplacement souris/tactile.
- [ ] Diaporama avec durée, ordre, boucle et transition configurables.
- [ ] Informations photo et date.
- [ ] Économiseur d’écran interne utilisant photos ou backdrops.
- [ ] Déclenchement après inactivité configurable.
- [ ] Sortie immédiate et sûre à la première interaction.
- [~] Documenter que le navigateur ne remplace pas l’économiseur d’écran natif Android.

**Critère de sortie P14 :** le diaporama reste fluide et ne conserve pas en mémoire toutes les images d’un album.

# P15 — Paramètres et préférences

- [ ] Écran paramètres fidèle avec groupes, descriptions et focus restauré.
- [ ] Paramètres de base.
- [ ] Paramètres avancés.
- [ ] Interface, thème, backdrop, horloge, animations et sons.
- [ ] Accueil et ordre des rangées.
- [ ] Bibliothèques, types d’image, taille, grille/liste, tri et filtres par défaut.
- [ ] Lecture vidéo web.
- [ ] Audio et musique.
- [ ] Sous-titres SDR et HDR avec aperçu.
- [ ] Saut de segments.
- [ ] Économiseur d’écran.
- [ ] Langue par profil.
- [ ] Serveurs, utilisateurs et PIN.
- [ ] Seerr.
- [ ] Cache images et données avec mesure réelle de l’espace occupé.
- [ ] Réinitialisation ciblée ou complète avec confirmation.
- [ ] Diagnostics.
- [ ] À propos, version, licences et notes de version.
- [ ] Paramètres expérimentaux isolés et désactivés par défaut.
- [ ] Migrations automatiques sans perdre les réglages existants.

**Critère de sortie P15 :** chaque préférence est persistée au bon niveau serveur/utilisateur/appareil et appliquée immédiatement ou après indication claire.

# P16 — Internationalisation et accessibilité

- [ ] Français complet.
- [ ] Anglais complet.
- [ ] Architecture permettant d’ajouter les traductions communautaires.
- [ ] Dates, heures, nombres et durées localisés.
- [ ] Aucun texte utilisateur codé en dur dans les composants.
- [ ] Libellés accessibles pour icônes et contrôles.
- [ ] Ordre de focus logique et annonces des changements importants.
- [ ] Contraste conforme, y compris sur les backdrops.
- [ ] Réduction des mouvements.
- [ ] Taille de texte ajustable sans débordement.
- [ ] Support clavier standard hors mode TV.
- [ ] Tests automatiques axe et tests manuels lecteur d’écran sur écrans critiques.

**Critère de sortie P16 :** aucun blocage critique WCAG 2.2 AA sur connexion, accueil, recherche, fiche, lecteur et paramètres.

# P17 — Performance et mémoire

- [ ] Budgets de taille initiale JS/CSS définis et contrôlés en CI.
- [ ] Découpage par route et chargement différé des domaines Live TV, musique, photos et Seerr.
- [ ] Virtualisation horizontale et verticale.
- [ ] Limitation du nombre de nœuds DOM.
- [ ] Annulation des requêtes lors des changements rapides de focus/route.
- [ ] Déduplication des requêtes identiques.
- [ ] Cache par serveur/utilisateur avec invalidation précise.
- [ ] Images responsives, formats serveur adaptés, qualité et tailles exactes.
- [ ] Lazy loading et préchargement uniquement des voisins utiles.
- [ ] Cache mémoire LRU pour images/backdrops avec plafond.
- [ ] Éviter backdrop-filter coûteux sur appareils faibles ou offrir un mode léger.
- [ ] Animations uniquement transform/opacité.
- [ ] Aucune mesure de layout répétée pour chaque touche de télécommande.
- [ ] Aucun long task supérieur au budget pendant navigation normale.
- [ ] Profilage sur Chrome desktop, Android TV/Google TV et Safari.
- [ ] Mesure mémoire après navigation répétée et après plusieurs lectures.
- [ ] Détection et correction des listeners, timers, object URLs et instances HLS non libérés.
- [ ] Tests réseau lent et serveur distant.
- [ ] Rapport de performance reproductible avant chaque version majeure.

**Critère de sortie P17 :** budgets définis dans `docs/PERFORMANCE_BUDGETS.md` respectés sur les scénarios de référence.

# P18 — PWA, cache et fonctionnement réseau

- [ ] Manifest complet avec icônes originales, raccourcis et mode paysage.
- [ ] Service worker versionné et stratégie de mise à jour sûre.
- [ ] Cache uniquement du shell et des assets publics, jamais des jetons ou réponses privées non maîtrisées.
- [ ] Écran hors ligne explicite.
- [ ] Reprise après retour réseau.
- [ ] Installation PWA desktop/mobile.
- [ ] Éviter les versions incohérentes entre HTML, JS et service worker.
- [ ] Bouton de rechargement lorsque nouvelle version disponible.
- [ ] Nettoyage des anciens caches.

**Critère de sortie P18 :** une mise à jour ne laisse jamais l’application dans un état mélangeant deux versions.

# P19 — Tests, compatibilité et non-régression

- [ ] Tests unitaires services API, URL, profils appareil, formatage et migrations.
- [ ] Tests composants cartes, rangées, grilles, dialogues, réglages et lecteur.
- [ ] Tests de contrat avec réponses Jellyfin réelles anonymisées.
- [ ] Serveur de test ou fixtures déterministes pour CI.
- [ ] E2E connexion, accueil, recherche, fiche, lecture, progression et déconnexion.
- [ ] E2E télécommande uniquement.
- [ ] E2E erreurs : 401, 403, 404, 429, 500, timeout, annulation et perte réseau.
- [ ] Tests visuels 720p et 1080p.
- [ ] Tests accessibilité.
- [ ] Tests de performance et taille de bundle.
- [ ] Navigateurs : Chromium, Firefox, Safari et WebKit PWA selon possibilités.
- [ ] Appareils : desktop, Android/Google TV, Fire TV navigateur compatible, tablette et mobile.
- [ ] Jellyfin : versions serveur officiellement ciblées et documentées.
- [ ] Seerr et plugins : versions testées documentées.
- [ ] Aucun merge si les contrôles critiques échouent.

**Critère de sortie P19 :** chaque bug corrigé ajoute un test empêchant sa réapparition lorsque cela est techniquement possible.

# P20 — Déploiement, diagnostic et maintenance

- [ ] Build de production reproductible.
- [ ] Image Docker multi-stage non-root et minimale.
- [ ] Nginx sécurisé avec compression, cache immutable des assets hashés et en-têtes appropriés.
- [ ] Configuration reverse proxy documentée pour Jellyfin et Seerr.
- [ ] Variables d’environnement publiques limitées aux valeurs non secrètes.
- [ ] Écran diagnostics : versions, serveur, navigateur, codecs, stockage, réseau et dernier échec API.
- [ ] Rapport diagnostics copiable avec toutes les données sensibles masquées.
- [ ] Journal local optionnel et plafonné, désactivé par défaut.
- [ ] Gestion des erreurs exploitable sans exposer les jetons.
- [ ] Notes de version et migration.
- [ ] Versionnement sémantique.
- [ ] Build de préversion et canal stable.
- [ ] Documentation utilisateur et administrateur.
- [ ] Guide de contribution et architecture.

**Critère de sortie P20 :** une installation neuve peut être construite, déployée, diagnostiquée et mise à jour uniquement avec la documentation du dépôt.

---

# Ordre d’exécution imposé

1. P0 — inventaire et matrice de référence.
2. P1 — architecture, typage, tests et CI.
3. P2/P3/P5 — design system, focus et shell.
4. P4 — serveurs et utilisateurs.
5. P6/P7/P8/P9/P10 — expérience de consultation complète.
6. P11 — lecteur vidéo fiable.
7. P12/P13/P14 — Live TV, musique et photos.
8. P15/P16 — préférences, traductions et accessibilité complètes.
9. P17/P18/P19/P20 — optimisation finale, compatibilité, déploiement et release.

Les optimisations ne sont pas repoussées à la fin : chaque phase doit respecter les budgets dès sa construction. La phase P17 sert à la validation globale et au traitement des problèmes transverses restants.

# Jalons de livraison

## Jalon A — Fondation vérifiable

- P0 et P1 terminés ;
- CI active ;
- architecture modulaire ;
- moteur de focus testé ;
- budgets mesurés.

## Jalon B — Parité de consultation

- shell, accueil, recherche, bibliothèques, fiches et menus contextuels ;
- connexion multi-serveur/multi-utilisateur ;
- tests visuels principaux.

## Jalon C — Parité de lecture

- lecteur vidéo complet ;
- sous-titres, pistes, qualité, chapitres, trickplay, autoplay et reporting ;
- Live TV essentiel.

## Jalon D — Parité fonctionnelle avancée

- musique, photos, DVR, Seerr et paramètres complets ;
- accessibilité et internationalisation complètes.

## Jalon E — Version stable

- budgets respectés ;
- matrice de compatibilité validée ;
- aucun bug critique ou majeur ouvert ;
- documentation et déploiement validés ;
- PR prête à sortir du mode brouillon.
