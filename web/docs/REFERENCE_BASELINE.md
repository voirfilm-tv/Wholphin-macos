# Référence fonctionnelle et visuelle

## Version figée

La cible de parité initiale est figée sur :

- dépôt amont : `damontecres/Wholphin` ;
- branche : `main` ;
- commit : `4f5cd3e7b1d12899f516056e187656fe470e1bf0` ;
- message : `Fix errors when a plural translation is missing (#1716)` ;
- date de gel interne : 19 juillet 2026.

Le fork `voirfilm-tv/Wholphin-macos` utilisé pour la branche web était basé au démarrage sur le commit `ed97fc3009c8b8969899c35e5cd40d595fe84cdf`. La référence amont est donc explicitement enregistrée afin que les évolutions futures de Wholphin ne modifient pas silencieusement le périmètre de la première version stable web.

## Politique de mise à jour

Une mise à jour de la référence exige :

1. un diff entre l’ancien et le nouveau commit amont ;
2. une mise à jour de `PARITY_MATRIX.md` ;
3. une décision sur chaque nouvelle fonctionnalité ou modification d’interface ;
4. des captures visuelles renouvelées pour les écrans affectés ;
5. une entrée dans `DECISIONS.md`.

Aucun changement amont n’est intégré automatiquement à la cible de parité.

## Inventaire initial des destinations

L’audit du routeur Wholphin recense au minimum :

- accueil ;
- configuration de l’accueil ;
- lecteur média simple et file de lecture ;
- paramètres de base, avancés, lecteurs, économiseur, segments et expérimental ;
- style des sous-titres SDR/HDR ;
- préférences de profil ;
- aperçu série, fiche série, film et épisode ;
- collection, playlist, personne, photo album, artiste et album ;
- dossiers de bibliothèques films, séries, collections, playlists, Live TV, enregistrements, musique, photos, vidéos personnelles et dossiers génériques ;
- grilles filtrées genres/studios ;
- « Voir plus » d’une rangée d’accueil ;
- diaporama ;
- favoris ;
- lecture en cours ;
- recherche ;
- diagnostics ;
- Découvrir/Seerr, fiches film/série/personne et grilles de résultats ;
- licences et mise à jour de l’application.

## Inventaire initial du tiroir

Le tiroir de référence comporte :

- profil et serveur ;
- lecture en cours conditionnelle ;
- recherche ;
- accueil ;
- bibliothèques dynamiques ;
- section « Plus » repliable ;
- favoris et Découvrir selon configuration ;
- paramètres ;
- horloge optionnelle ;
- sélection active déterminée depuis la pile de navigation.

## Captures de référence à produire

Chaque capture utilisera des données déterministes et masquera les informations privées :

- connexion et sélection utilisateur ;
- accueil par défaut ;
- accueil personnalisé ;
- tiroir fermé et ouvert ;
- bibliothèque films grille ;
- bibliothèque séries ;
- genres ;
- fiche film ;
- fiche série ;
- vue saisons/épisodes ;
- recherche locale ;
- recherche Découvrir ;
- collection ;
- playlist ;
- musique ;
- Live TV ;
- paramètres ;
- lecteur contrôles visibles ;
- lecteur chapitres/pistes/sous-titres ;
- diaporama ;
- états chargement, vide et erreur.

Résolutions minimales : 1280×720 et 1920×1080. Une capture 3840×2160 sera ajoutée pour les contrôles de densité et d’images, sans exiger un rendu pixel-identique à un simple agrandissement du 1080p.
