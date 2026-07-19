# Matrice de parité Wholphin → Web

Référence fonctionnelle : Wholphin Android TV. Cette matrice doit être complétée par des liens vers captures et tests au fur et à mesure de la migration.

Légende :

- `Absent` : non développé ;
- `Prototype` : présent mais insuffisant pour la parité ;
- `Partiel` : plusieurs parcours réels fonctionnent ;
- `Conforme` : comportement et tests validés ;
- `Adapté web` : différence volontaire documentée ;
- `N/A web` : impossible ou sans équivalent navigateur.

## Installation, connexion et profils

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Liste de serveurs | Absent | multi-serveur, ajout, édition, suppression et serveur actif |
| Validation serveur `/System/Info/Public` | Prototype | erreurs typées, timeout, CORS, certificat et reverse proxy |
| Connexion utilisateur/mot de passe | Prototype | écrans fidèles, erreurs, permissions et révocation session |
| Quick Connect | Absent | code, polling, expiration, annulation et confirmation |
| Liste d’utilisateurs | Absent | utilisateurs publics/privés, avatar et politique serveur |
| Changement d’utilisateur | Absent | isolation cache/préférences et restauration navigation |
| Changement de serveur | Absent | isolation complète des sessions et caches |
| PIN de profil | Absent | création, validation, temporisation et suppression |
| Mode démo | Prototype | données déterministes couvrant tous les écrans |

## Shell et navigation

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Tiroir compact/étendu | Prototype | animation, focus, déplacement contenu et tailles fidèles |
| Profil en tête de tiroir | Prototype | avatar réel, serveur, changement utilisateur |
| Lecture en cours dans le tiroir | Absent | musique active et sous-titre |
| Recherche | Prototype | onglets, résultats groupés et focus fidèle |
| Accueil | Prototype | personnalisation complète et rangées multiples |
| Bibliothèques dynamiques | Absent | générées depuis les vues serveur |
| Section « Plus » | Absent | expansion, focus et bibliothèques excédentaires |
| Favoris | Prototype | sections par type et actions contextuelles |
| Découvrir/Seerr | Absent | configuration et parcours complets |
| Paramètres | Prototype | architecture et groupes complets |
| Horloge | Absent | préférence et position fidèle |
| Retour sur accueil ouvrant le tiroir | Absent | comportement TV complet |

## Accueil

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Reprendre la lecture | Prototype | rendu fidèle, menu contextuel et erreurs locales |
| Prochains épisodes | Prototype | métadonnées épisode/série et retrait de « À suivre » |
| Fusion Reprendre + À suivre | Absent | préférence et déduplication |
| Derniers médias par bibliothèque | Prototype | toutes bibliothèques et configuration |
| Favoris épinglés | Absent | rangée configurable |
| Collections épinglées | Absent | ajout/retrait/réorganisation |
| Playlists épinglées | Absent | ajout/retrait/réorganisation |
| Genres épinglés | Absent | navigation et filtres |
| Studios épinglés | Absent | navigation et filtres |
| Type d’image par rangée | Absent | poster/thumb/backdrop |
| Titres visibles par rangée | Absent | préférence par rangée |
| Taille de carte | Absent | tailles et densité 720p/1080p/4K |
| Réorganisation des rangées | Absent | interface paramètres et persistence |
| Hero/backdrop au focus | Prototype | double buffer, préchargement et parité visuelle |
| Musique de thème | Absent | délai, volume, arrêt et préférence |

## Recherche

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Recherche locale Jellyfin | Prototype | debounce, annulation et résultats obsolètes |
| Résultats par type | Absent | films, séries, épisodes, collections, musique |
| Résultats combinés | Absent | préférence et classement |
| Recherche vocale | Absent | Web Speech et repli |
| Recherches récentes | Prototype | affichage, suppression et isolation par profil |
| Menu contextuel | Absent | appui long/clic droit et actions par type |
| Onglet Découvrir | Absent | Seerr complet |

## Bibliothèques

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Films | Prototype | vues, tri, filtres, pagination et virtualisation |
| Séries | Prototype | vues, tri, filtres, pagination et virtualisation |
| Collections | Absent | grille et fiches |
| Playlists | Absent | grille, fiche et modification |
| Live TV | Absent | chaînes, guide et lecture |
| Enregistrements | Absent | grille, lecture et timers |
| Musique | Absent | artistes, albums, titres et lecture |
| Photos | Absent | albums, grille et diaporama |
| Vidéos personnelles | Absent | dossier et lecteur |
| Clips musicaux | Absent | grille et lecteur |
| Livres/dossiers génériques | Absent | navigation générique |
| Vue grille | Prototype | virtualisation et parité focus |
| Vue liste | Absent | composant et paramètres |
| Taille/type d’image | Absent | préférences par bibliothèque |
| Tri | Absent | options selon collection |
| Filtres | Absent | genre, studio, année, état, résolution, audio |
| Genres | Absent | cartes, filtres et épinglage accueil |
| Studios | Absent | cartes, filtres et épinglage accueil |
| Restauration filtre/tri/scroll | Absent | mémoire par destination |

## Fiches de détail

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Film | Prototype | layout fidèle, médias, personnes, extras et technique |
| Série | Prototype | saisons, next episode, cast et contenus associés |
| Vue d’ensemble série | Absent | défilement saison/épisode et état courant |
| Épisode | Absent | fiche complète et métadonnées série |
| Collection | Absent | fiche et contenu |
| Playlist | Absent | fiche, ordre et actions |
| Personne | Absent | biographie et filmographie |
| Artiste | Absent | albums et titres |
| Album | Absent | pistes et lecture |
| Photo album | Absent | grille et diaporama |
| Dossier générique | Absent | types mixtes |
| Fiche Découvrir film | Absent | Seerr et demande |
| Fiche Découvrir série | Absent | saisons et demande |
| Fiche Découvrir personne | Absent | œuvres liées |
| Bandes-annonces | Absent | source serveur et ouverture lecteur |
| Extras/bonus | Absent | cartes et lecture |
| Versions média | Absent | sélection avant/pendant lecture |
| Pistes audio/sous-titres avant lecture | Absent | sélection et persistence |

## Menus contextuels

| Action | État web | Travail principal restant |
|---|---|---|
| Ouvrir détails | Absent | menu générique |
| Lire/reprendre/recommencer | Absent | logique selon progression |
| Favori | Partiel | intégrer au menu et rollback erreur |
| Vu/non vu | Partiel | intégrer au menu et rollback erreur |
| Ajouter à une playlist | Absent | playlists existantes et création |
| Retirer d’une playlist | Absent | permissions et confirmation |
| Retirer de « À suivre » | Absent | endpoint et rafraîchissement local |
| Télécharger sous-titres | Absent | plugin compatible et état serveur |
| Signaler | Absent | service/plugin configuré |
| Supprimer média | Absent | autorisations, confirmation et erreur réelle |

## Lecteur vidéo

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Lecture directe | Prototype | profil codecs réel et choix de source |
| Remux/direct stream | Absent | sélection et reporting exact |
| Transcodage HLS | Prototype | HLS local, récupération et niveaux |
| Contrôles style Wholphin/Plex | Prototype | fidélité visuelle, focus et états |
| Recherche D-pad | Prototype | comportement contrôles cachés/visibles |
| Reprise avec recul | Prototype | préférence et cas limites |
| Qualité/débit | Absent | menu et relance de session |
| Versions média | Absent | menu source |
| Pistes audio | Absent | menu et changement session |
| Sous-titres | Absent | texte, conversion, style et gravure serveur |
| Chapitres | Absent | menu et navigation |
| Trickplay | Absent | images de prévisualisation |
| File/épisodes | Absent | panneau et navigation |
| Épisode suivant automatique | Absent | compte à rebours et annulation |
| Protection pass-out | Absent | seuil et confirmation |
| Saut intro/crédits | Absent | segments et préférences |
| Mode cinéma/pré-roll | Absent | plugin compatible |
| Stats de lecture | Absent | codec, débit et transcodage |
| Picture-in-Picture | Prototype | états, erreurs et compatibilité |
| Reporting session | Prototype | PlayMethod exact et cycle complet |
| Rafraîchissement HDMI | N/A web | documenter la limitation navigateur |
| MPV/ExoPlayer | N/A web | documenter HTML5/MSE/HLS |

## Live TV, musique et photos

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Liste chaînes | Absent | chaîne, programme actuel/suivant |
| Guide TV | Absent | grille temporelle virtualisée |
| Lecture Live TV | Absent | session directe/transcodée |
| Enregistrements DVR | Absent | grille, fiche et lecture |
| Timers | Absent | création/suppression réelle |
| Artistes/albums/titres | Absent | bibliothèques et pages |
| File audio | Absent | store persistant |
| Mini-player | Absent | shell global |
| Now Playing | Absent | page et tiroir |
| Media Session | Absent | commandes système |
| Grille photos | Absent | virtualisation |
| Diaporama | Absent | plein écran, durée et transitions |
| Économiseur interne | Absent | inactivité et sortie |
| Économiseur Android natif | N/A web | documenter la limitation |

## Paramètres

| Élément de référence | État web | Travail principal restant |
|---|---|---|
| Paramètres de base | Prototype | groupes complets et composants fidèles |
| Paramètres avancés | Absent | préférences web applicables |
| Paramètres lecteur web | Prototype | profil, qualité, reprise, autoplay |
| Paramètres MPV/ExoPlayer | Adapté web | remplacer par options HTML5/HLS |
| Sous-titres SDR/HDR | Absent | aperçu et persistence |
| Skip segments | Absent | intro/récap/crédits |
| Économiseur | Absent | diaporama interne |
| Expérimental | Absent | flags isolés |
| Cache images | Absent | mesure et purge |
| Langue par utilisateur | Prototype | i18n réelle |
| Thèmes/couleurs | Prototype | thèmes complets |
| Sons de focus | Absent | préférence et préchargement |
| Diagnostics | Absent | rapport expurgé |
| Licences | Partiel | écran complet et dépendances |
| Mise à jour PWA | Absent | nouvelle version et rechargement sûr |

## Qualité transversale

| Sujet | État web | Travail principal restant |
|---|---|---|
| TypeScript strict | Absent | migration complète |
| Build Vite | Absent | build et chunks |
| Navigation spatiale déterministe | Prototype | moteur par régions |
| Virtualisation | Absent | rangées et grilles |
| Internationalisation | Absent | dictionnaires et formatage |
| Accessibilité WCAG | Partiel | axe, lecteurs d’écran et contrastes |
| Tests unitaires | Prototype | couverture domaines |
| Tests composants | Absent | composants interactifs |
| Tests E2E | Absent | parcours critiques et télécommande |
| Tests visuels | Absent | captures de référence |
| Tests performance | Absent | budgets CI |
| CI | Absent | lint, typecheck, tests, build et budgets |
| CSP et sécurité | Absent | politique et validation |
| Service worker sûr | Prototype | versionnement et cache privé |
| Docker production | Prototype | multi-stage, non-root et headers |
| Documentation déploiement | Prototype | proxy, CORS, HTTPS et mises à jour |

## Condition de parité finale

La parité finale n’est atteinte que lorsque :

1. chaque ligne est `Conforme`, `Adapté web` ou `N/A web` avec justification ;
2. les écrans principaux passent les tests visuels ;
3. les parcours complets passent à la télécommande ;
4. les budgets de performance sont respectés ;
5. les versions Jellyfin/Seerr/plugins testées sont documentées ;
6. aucun bug critique ou majeur n’est ouvert.
