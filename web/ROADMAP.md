# Wholphin Web — feuille de route du client Jellyfin responsive

## Objectif produit

Construire un client Jellyfin web autonome et partageable, fidèle à l’esthétique et à la hiérarchie fonctionnelle de Wholphin, sans reproduire artificiellement les contraintes d’Android TV.

Une même installation doit permettre à chaque personne de :

1. saisir l’adresse de son serveur Jellyfin ;
2. vérifier le serveur ;
3. se connecter par identifiants ou Quick Connect ;
4. utiliser l’application sur Mac, Windows, téléphone ou tablette ;
5. conserver localement ses propres profils et préférences.

Aucune adresse serveur ni aucun compte ne doivent être codés dans le build public.

## Priorités de plateforme

- Safari macOS, iPhone et iPad ;
- Chrome macOS, Windows et Android ;
- Edge Windows ;
- Firefox desktop ;
- fenêtres de 320 px aux écrans 4K ;
- souris, clavier et tactile ;
- PWA installable en complément.

La navigation directionnelle reste un mode secondaire. Elle ne doit jamais modifier le comportement web standard de Backspace, Échap, historique, survol ou tactile.

## Définition de terminé

Une tâche n’est terminée que si :

- elle respecte la source Wholphin ou une adaptation web documentée ;
- les états chargement, vide, erreur, hors ligne et données partielles sont traités ;
- bureau, tablette et téléphone sont vérifiés ;
- souris, clavier et tactile sont utilisables ;
- Chromium, Firefox et WebKit passent les tests concernés ;
- aucun débordement horizontal global n’apparaît ;
- le focus, le contraste, les tailles tactiles et les lecteurs d’écran ne régressent pas ;
- les budgets de bundle, DOM, images, mémoire et requêtes sont respectés ;
- les données sensibles sont absentes des logs et diagnostics ;
- la documentation et les tests sont mis à jour.

Statuts : `[ ]` à faire, `[-]` en cours, `[x]` vérifié, `[~]` adaptation web assumée, `[!]` dépendance serveur ou matériel réel.

---

## P0 — Périmètre, référence et inventaire

- [x] Figer la référence Wholphin au commit `4f5cd3e7b1d12899f516056e187656fe470e1bf0`.
- [x] Définir le produit comme client web partagé et non application TV.
- [x] Documenter les navigateurs, formats et méthodes d’entrée prioritaires.
- [x] Analyser la palette, les cartes, l’accueil, le tiroir et la sélection serveur dans les sources Kotlin/Compose.
- [-] Inventorier tous les écrans, variantes, dialogues, menus, états et thèmes Wholphin.
- [-] Classer chaque élément : reproduction exacte, adaptation web, non applicable ou dépendance serveur.
- [ ] Créer les références visuelles déterministes desktop, tablette et mobile pour chaque écran principal.
- [x] Conserver licence GPL-2.0 et attribution.

**Sortie P0 :** aucun écran ou comportement visible de Wholphin sans décision documentée.

## P1 — Noyau web partageable

- [x] Client Jellyfin TypeScript sans serveur codé en dur.
- [x] URL avec ports et sous-chemins de reverse proxy.
- [x] Correction des URL Jellyfin Web collées avec `/web/index.html`.
- [x] Requêtes annulables, délais, déduplication et diagnostics.
- [x] Compatibilité `AbortSignal.any/timeout` pour WebKit et navigateurs plus anciens.
- [x] Sessions et préférences isolées par serveur et utilisateur.
- [x] Diagnostics avec jetons et clés expurgés.
- [x] Détection du contenu mixte HTTPS → HTTP.
- [x] Message explicite pour réseau, certificat et CORS.
- [x] CSP sans script tiers et politique `no-referrer`.
- [x] Service worker limité aux assets statiques ; aucune API ou média authentifié en cache.
- [x] Cache Nginx séparé pour HTML, service worker, CSS et bundles hashés.
- [x] En-têtes de sécurité Nginx.
- [x] HLS.js intégré au bundle et chargé à la demande.
- [ ] Ajouter un lockfile de dépendances reproductible.
- [ ] Ajouter une stratégie documentée de rotation/révocation des sessions Jellyfin.
- [ ] Tester les migrations de stockage depuis chaque version publiée.

**Sortie P1 :** le même build peut être publié sans configuration privée et utilisé avec plusieurs serveurs indépendants.

## P2 — Connexion et profils

- [x] Parcours en deux étapes : serveur, puis compte.
- [x] Vérification `/System/Info/Public` avec nom et version.
- [x] Authentification utilisateur/mot de passe.
- [x] Quick Connect avec attente, expiration et annulation.
- [x] Plusieurs sessions locales.
- [x] Profils circulaires et couleur stable inspirés de Wholphin.
- [x] Changement et suppression de profil.
- [x] PIN local PBKDF2 avec blocage progressif.
- [-] Reproduire toutes les variantes visuelles de sélection serveur/utilisateur.
- [ ] Revalider une session enregistrée avant d’ouvrir l’accueil et proposer une reconnexion propre.
- [ ] Option « toujours demander le mot de passe ».
- [ ] Révocation serveur à la déconnexion lorsque l’API et les droits le permettent.

**Sortie P2 :** un utilisateur non technique comprend toujours s’il configure le serveur ou son compte et reçoit une erreur exploitable.

## P3 — Design system dérivé des sources

- [x] Palette violette Wholphin exacte comme thème par défaut.
- [x] Ratios poster 2:3, paysage 16:9 et carré 1:1.
- [x] Dimensions de référence des cartes et barres de progression.
- [x] Surfaces, scrims, backdrop et hiérarchie typographique de base.
- [-] Extraire tous les espacements, rayons, ombres, durées et états des composants sources.
- [-] Reproduire cartes poster, paysage, épisode, saison, personne, genre, studio, collection et playlist.
- [-] Reproduire badges vu, favori, nouveau, manquant et progression.
- [-] Reproduire titres textuels et logos d’œuvres.
- [ ] Porter les autres palettes Wholphin avec tokens complets.
- [ ] Skeletons aux dimensions finales.
- [ ] Comparaisons visuelles automatisées avec tolérances documentées.

**Sortie P3 :** chaque composant possède une source Wholphin identifiée et des captures responsive approuvées.

## P4 — Shell responsive et navigation

- [x] Rail desktop compact et étendu par action explicite.
- [x] Profil et serveur visibles dans le shell.
- [x] Bibliothèques générées depuis Jellyfin.
- [x] Section « Plus » pour les bibliothèques supplémentaires.
- [x] Barre inférieure mobile/tablette.
- [x] Feuille mobile « Plus ».
- [x] Historique navigateur standard ; Backspace non détourné.
- [x] Échap ferme uniquement les couches ouvertes.
- [x] Raccourcis navigateur Alt+Gauche/Droite préservés.
- [x] Restauration de focus lors des retours et du recyclage virtuel.
- [x] Clic droit et appui long tactile pour les menus contextuels.
- [-] Navigation clavier directionnelle secondaire sans interférer avec les conventions web.
- [ ] Gestion complète des profondeurs de modales et restauration du focus d’origine.
- [ ] Tests lecteur d’écran du shell et des feuilles mobiles.

**Sortie P4 :** aucun comportement TV ne surprend un utilisateur web et chaque format possède une navigation naturelle.

## P5 — Accueil Wholphin responsive

- [x] Reprise de lecture, épisodes suivants, favoris et ajouts récents.
- [x] Rangées configurables par profil.
- [x] Ordre, activation, titres et format d’image persistants.
- [x] Backdrop lié au média actif.
- [x] En-tête qui suit le focus ou le survol du média actif.
- [x] Tolérance aux erreurs partielles des rangées.
- [-] Reproduire exactement les variantes de header, logos, détails rapides et actions.
- [ ] Rangées genres, studios, collections et playlists épinglables.
- [ ] Taille et limite d’éléments par rangée.
- [ ] Bouton « voir plus » et destination dédiée.
- [ ] Défilement tactile avec inertie et points de rupture validés.
- [ ] Préchargement borné du backdrop voisin.
- [!] Musique de thème dépendante des données et des règles d’autoplay du navigateur.

**Sortie P5 :** l’accueil reste fidèle et fluide avec une grande bibliothèque sur téléphone comme sur bureau.

## P6 — Bibliothèques et recherche

- [x] Films, séries, collections, playlists, musique, photos, Live TV et dossiers génériques.
- [x] Grille et liste.
- [x] Poster ou paysage, trois tailles de cartes.
- [x] Tri titre, date, année et note.
- [x] Filtres genre, studio, année, vu, non vu, favori et lecture en cours.
- [x] Préférences par bibliothèque.
- [x] Pagination et virtualisation.
- [x] Recherche annulable sans résultat obsolète.
- [x] Historique de recherche par profil.
- [-] Résultats groupés par type et navigation complète des dossiers.
- [ ] Tri durée, date de sortie et aléatoire selon disponibilité API.
- [ ] Filtres résolution, codec, audio et sous-titres.
- [ ] Pages genres et studios dédiées.
- [ ] Recherche vocale comme amélioration progressive, jamais obligatoire.

**Sortie P6 :** plusieurs milliers d’éléments restent manipulables sans surcharger le DOM ou la mémoire.

## P7 — Fiches et gestion média

- [x] Films, séries, saisons, épisodes, personnes, collections, dossiers, artistes et albums.
- [x] Distribution, filmographie, bonus, similaires et informations techniques.
- [x] Favoris et vu/non vu.
- [x] Playlists : création, ajout, renommage, retrait et réorganisation.
- [x] Recherche et téléchargement de sous-titres distants.
- [-] Reproduire précisément le header Wholphin : titre/logo, détails rapides, genres, flux, tagline, synopsis et réalisateur.
- [-] Adapter la fiche aux petits écrans sans perdre la hiérarchie source.
- [ ] Toutes les variantes de séries spéciales, saisons inconnues et épisodes manquants.
- [ ] Menus contextuels complets selon le type et les droits utilisateur.
- [ ] États de mutation optimistes avec annulation et reprise après erreur.

**Sortie P7 :** chaque type Jellyfin possède une destination cohérente et toutes les actions sont honnêtes sur leurs droits.

## P8 — Lecteurs vidéo et audio

- [x] Direct Play et repli HLS/transcodage.
- [x] Versions, pistes audio, sous-titres, chapitres et statistiques.
- [x] Styles WebVTT par profil.
- [x] Segments Intro/Outro/Recap/Commercial/Preview.
- [x] Épisode suivant et contrôle « toujours là ? ».
- [x] Reporting Playing/Progress/Stopped.
- [x] Picture-in-Picture et plein écran.
- [x] Lecteur audio persistant, file, précédent/suivant et répétition.
- [-] Refaire les contrôles pour souris, tactile, portrait et paysage mobile.
- [ ] Trickplay avec manifeste et tuiles Jellyfin.
- [ ] Choix automatique du profil Direct Play fondé sur les capacités réelles du navigateur.
- [ ] Gestion avancée des erreurs HLS et reprise de transcodage.
- [ ] Media Session complète avec artwork et actions système.
- [ ] Tests longue durée et nettoyage mémoire après lectures successives.

**Sortie P8 :** lecture stable sur les moteurs ciblés, sans instance HLS, timer ou listener restant après fermeture.

## P9 — Live TV, photos, Seerr et domaines secondaires

- [x] Chaînes, guide, programme courant et enregistrements.
- [x] Programmation et annulation DVR ponctuelle ou série.
- [x] Photothèque et diaporama.
- [x] Seerr : configuration, découverte, recherche, fiches et demandes.
- [-] Responsive complet du guide Live TV.
- [ ] Validation avec plusieurs tuners et fournisseurs réels.
- [ ] Recherche, annulation et gestion avancée des séries d’enregistrements.
- [ ] Économiseur interne photo respectant les règles d’autoplay et d’énergie web.
- [ ] États de permissions Seerr et demandes partielles de saisons.

## P10 — Internationalisation et accessibilité

- [x] Fondation française/anglaise typée.
- [x] Langue par profil et attribut `lang` dynamique.
- [x] Contraste renforcé et réduction des mouvements.
- [-] Traduire tous les écrans secondaires et messages d’erreur.
- [ ] Navigation lecteur d’écran et intitulés accessibles exhaustifs.
- [ ] Ordre de tabulation web standard sur chaque écran.
- [ ] Taille tactile minimale de 44 × 44 CSS px.
- [ ] Zoom navigateur jusqu’à 200 % sans perte de contenu.
- [ ] Audit axe-core sans violation critique ou sérieuse.
- [ ] Sous-titres lisibles en SDR/HDR et sur petits écrans.

## P11 — Performance, PWA et réseau

- [x] Build Vite et TypeScript strict.
- [x] HLS séparé du bundle initial.
- [x] Budgets JavaScript, CSS et DOM dans la CI.
- [x] Images chargées paresseusement et dimensionnées.
- [x] PWA, service worker sûr, Docker et Nginx.
- [-] Budgets de mémoire et de temps de focus mesurés.
- [ ] Lockfile et installation reproductible avec `npm ci`.
- [ ] Audit Lighthouse desktop et mobile.
- [ ] Tests réseau lent, hors ligne, reprise et serveur indisponible.
- [ ] Écran de mise à jour PWA et stratégie de version du cache.
- [ ] Analyse du bundle et découpage supplémentaire des domaines lourds.

## P12 — Matrice finale de compatibilité et publication

- [x] Chromium desktop, tablette et mobile dans Playwright.
- [-] Firefox desktop, WebKit desktop et WebKit mobile dans la CI.
- [ ] Safari macOS réel.
- [ ] Safari iPhone/iPad réel.
- [ ] Chrome macOS/Windows/Android réel.
- [ ] Edge Windows réel.
- [ ] Firefox et Firefox ESR réels.
- [ ] Plusieurs versions Jellyfin supportées documentées.
- [ ] Serveur avec sous-chemin, reverse proxy, CORS et certificats valides.
- [ ] Bibliothèque volumineuse et sessions longues.
- [ ] Procédure de déploiement, mise à jour, sauvegarde et retour arrière.
- [ ] Aucun bug critique ou majeur confirmé.

**Sortie du brouillon :** le client est fidèle aux écrans sources validés, fonctionne sur les navigateurs prioritaires et sa publication est reproductible sans configuration privée.
