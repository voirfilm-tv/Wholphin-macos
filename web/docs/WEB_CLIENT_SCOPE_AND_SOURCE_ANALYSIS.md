# Wholphin Web — périmètre produit et analyse de la source

## Cible produit

Wholphin Web est un client Jellyfin autonome et partageable. Une même URL doit pouvoir être utilisée par plusieurs personnes, chacune avec son propre serveur Jellyfin.

Le parcours obligatoire est :

1. saisir l’adresse du serveur Jellyfin ;
2. vérifier `/System/Info/Public` et afficher le nom ainsi que la version ;
3. saisir les identifiants ou utiliser Quick Connect ;
4. conserver localement les serveurs, utilisateurs, préférences et jetons de ce navigateur ;
5. permettre de changer de profil sans imposer une configuration propre au déploiement.

Aucune adresse de serveur, aucun identifiant et aucune configuration GNFLIX ne doivent être intégrés au build public.

## Navigateurs et formats prioritaires

La cible principale n’est pas une application TV :

- Safari sur macOS, iPhone et iPad ;
- Chrome sur macOS, Windows et Android ;
- Edge sur Windows ;
- Firefox et Firefox ESR sur ordinateur ;
- fenêtres redimensionnées de 320 px à 4K ;
- souris, clavier et tactile.

La navigation directionnelle reste une compatibilité secondaire utile, mais ne doit pas dicter l’architecture de l’interface.

## Audit du noyau conservé

### Éléments indépendants de l’interface

- `JellyfinApi` ne contient aucune adresse serveur fixe ;
- les URL avec port ou sous-chemin sont normalisées sans supprimer le sous-chemin ;
- l’authentification utilise `/Users/AuthenticateByName` et Quick Connect ;
- les sessions sont isolées par serveur et utilisateur ;
- le client API, les domaines Jellyfin, Seerr, le lecteur, la pagination et les préférences peuvent rester ;
- la CSP n’autorise pas de script tiers et HLS est intégré au bundle ;
- le service worker, Docker et Nginx restent compatibles avec un hébergement indépendant.

### Contraintes propres à un client web partagé

- une page HTTPS ne peut pas appeler un serveur Jellyfin distant en HTTP à cause du contenu mixte ;
- un serveur situé sur un autre domaine doit autoriser l’origine du client dans sa configuration CORS ;
- un certificat HTTPS invalide est refusé par le navigateur avant que l’application puisse intervenir ;
- le Direct Play dépend des codecs réellement disponibles dans le navigateur ;
- le jeton local doit rester protégé par une CSP stricte et par l’absence de scripts publicitaires ou analytiques tiers.

Ces cas sont désormais diagnostiqués explicitement durant la connexion.

## Analyse du front-end Wholphin d’origine

Référence figée : commit `4f5cd3e7b1d12899f516056e187656fe470e1bf0` de `damontecres/Wholphin`.

### Palette

La palette violette originale est définie dans `ui/theme/colors/PurpleThemeColors.kt` :

- fond sombre : `#15121C` ;
- texte principal : `#E8DFF0` ;
- primaire : `#D2BCFF` ;
- primaire conteneur : `#7A28FE` ;
- variante de surface : `#4A4456` ;
- texte secondaire : `#CCC3D9`.

Ces valeurs deviennent les tokens par défaut du client web. Les autres thèmes de Wholphin seront portés ensuite par la même méthode.

### Cartes et ratios

`ui/UiConstants.kt` définit :

- poster 2:3 ;
- paysage 16:9 ;
- carré 1:1 ;
- hauteur de poster de référence : 172 dp ;
- hauteur d’épisode : 128 dp ;
- barre de progression : 6 dp.

Le web conserve ces proportions et cette densité sur bureau, puis réduit la largeur des cartes de façon fluide sur tablette et mobile.

### Accueil

`ui/main/HomePage.kt` repose sur :

- un en-tête qui suit le média actif ;
- un backdrop associé au focus ;
- des rangées horizontales configurables ;
- la restauration de la position par rangée et colonne ;
- des actions rapides, un menu contextuel et une option « voir plus » ;
- des variantes poster, bannière, genre et studio.

Le client web conserve cette hiérarchie, mais ajoute le survol, le clic, le défilement tactile et une grille adaptée aux petits écrans.

### Navigation et profils

`ui/nav/NavDrawer.kt` fournit :

- un rail latéral compact ;
- un tiroir étendu explicite ;
- le profil et le serveur en haut ;
- les bibliothèques créées dynamiquement ;
- l’accueil, la recherche, les favoris, la découverte et les paramètres ;
- un élément « Plus » pour les bibliothèques supplémentaires.

Adaptation web :

- rail compact/étendu sur grand écran ;
- barre inférieure et feuille « Plus » sur mobile/tablette ;
- aucune dépendance à la touche Retour Android ;
- changement de profil accessible à la souris et au tactile.

### Sélection de serveur

`ui/setup/ServerList.kt` utilise des profils et serveurs circulaires, une couleur stable dérivée de l’identifiant, un état de connexion visible et un bouton d’ajout. Le parcours web reprend cette identité, avec une étape serveur distincte de l’étape utilisateur.

## Règle de reproduction

Le code Compose ne peut pas être copié directement dans le DOM. La reproduction doit reprendre :

- les tokens exacts ;
- les dimensions et ratios ;
- l’ordre des blocs ;
- la densité et les espacements ;
- les états de focus, chargement, erreur et sélection ;
- les comportements fonctionnels observables.

Les comportements exclusivement Android TV sont remplacés par leurs équivalents web : clic, survol, tactile, historique du navigateur, responsive design et raccourcis clavier standards.

## Définition de terminé

Une vue n’est fidèle que si elle est validée sur :

- 1440 × 900 bureau ;
- 820 × 1180 tablette ;
- 412 × 915 mobile ;
- souris, clavier et tactile ;
- absence de débordement horizontal ;
- contraste et tailles tactiles ;
- contenu réel Jellyfin et données longues ;
- capture comparée à la structure et aux tokens de Wholphin.
