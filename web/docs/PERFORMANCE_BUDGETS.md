# Budgets de performance — Wholphin Web

Ces budgets sont des limites de non-régression. Ils seront mesurés sur des fixtures déterministes et, pour les versions candidates, sur au moins un serveur Jellyfin réel.

## Profils de test

### Profil A — Desktop standard

- écran 1920×1080 ;
- Chromium récent ;
- processeur milieu de gamme ;
- réseau local ou 100 Mb/s ;
- bibliothèque de 5 000 films et 1 000 séries simulée.

### Profil B — Appareil TV contraint

- écran 1920×1080 ;
- CPU ralenti ×4 dans les tests automatisés, complété par un appareil Android/Google TV réel ;
- mémoire limitée ;
- réseau Wi-Fi avec 40 ms de latence ;
- navigation exclusivement à la télécommande.

### Profil C — Réseau distant

- latence 150 ms ;
- débit descendant 10 Mb/s ;
- pertes/erreurs ponctuelles simulées ;
- serveur Jellyfin derrière reverse proxy.

## Taille des ressources

Les seuils concernent les fichiers compressés Brotli/gzip selon la mesure CI.

| Ressource | Cible | Limite bloquante |
|---|---:|---:|
| JavaScript initial hors lecteur | ≤ 140 Ko | 200 Ko |
| CSS initial | ≤ 35 Ko | 55 Ko |
| Chunk d’une route fonctionnelle | ≤ 70 Ko | 110 Ko |
| Chunk lecteur vidéo + HLS | ≤ 180 Ko | 260 Ko |
| Police téléchargée | 0 Ko par défaut | 80 Ko |
| Icônes initiales | ≤ 20 Ko | 35 Ko |

Aucune bibliothèque ne doit être chargée dans le bundle initial uniquement pour une route secondaire.

## Démarrage

Mesuré sur build de production, cache froid, hors temps de réponse du serveur pour les données privées.

| Mesure | Profil A | Profil B |
|---|---:|---:|
| Affichage du shell | ≤ 700 ms | ≤ 1 500 ms |
| Application interactive | ≤ 1 200 ms | ≤ 2 500 ms |
| Longest Contentful Paint du shell | ≤ 1 500 ms | ≤ 2 800 ms |
| Cumulative Layout Shift | ≤ 0,03 | ≤ 0,05 |

Le shell de connexion doit rester utilisable même si Jellyfin ne répond pas.

## Navigation et focus

| Mesure | Cible | Limite bloquante |
|---|---:|---:|
| Traitement d’un déplacement de focus | ≤ 8 ms médiane | 16 ms au p95 |
| Réponse visuelle après touche | ≤ 50 ms | 100 ms |
| Ouverture/fermeture du tiroir | 60 fps | aucune frame > 50 ms |
| Restauration du focus au retour | ≤ 100 ms | 250 ms |
| Changement de backdrop après focus stable | 120–250 ms de délai volontaire | pas de flash obsolète |

Le moteur de focus ne doit pas parcourir tous les nœuds du document à chaque touche.

## Routes et données

| Action | Profil A | Profil C |
|---|---:|---:|
| Route déjà en cache | ≤ 100 ms | ≤ 150 ms |
| Premier rendu d’une bibliothèque | ≤ 700 ms + API | ≤ 1 000 ms + API |
| Affichage d’un skeleton | ≤ 100 ms | ≤ 100 ms |
| Recherche après réponse API | ≤ 120 ms | ≤ 180 ms |
| Mise à jour favori/vu optimiste | ≤ 50 ms | ≤ 50 ms |

Une requête obsolète ne doit jamais remplacer les résultats d’une requête plus récente.

## Listes et DOM

- maximum recommandé : 1 200 nœuds DOM sur une page de consultation ;
- limite bloquante : 2 000 nœuds hors lecteur et dialogues ;
- maximum de cartes montées par rangée : éléments visibles + overscan borné ;
- maximum de cartes montées dans une grille : deux à trois hauteurs d’écran ;
- aucun rendu initial de milliers d’éléments ;
- aucune image sans dimensions réservées ;
- aucun changement de filtre ne doit reconstruire les composants hors zone concernée.

## Images

- image demandée au serveur proche de la taille d’affichage × densité, sans dépasser inutilement la taille source ;
- posters hors écran chargés uniquement dans l’overscan ;
- backdrop 1080p : taille réseau cible ≤ 350 Ko, limite 700 Ko ;
- poster standard : cible ≤ 120 Ko, limite 250 Ko ;
- maximum deux chargements de backdrop simultanés ;
- cache mémoire LRU plafonné et mesuré ;
- les URL obsolètes ne doivent pas provoquer de changement visuel tardif.

## Mémoire

Les valeurs varient selon le navigateur ; les seuils servent surtout à détecter les fuites.

### Consultation

- croissance après 30 minutes de navigation répétée : ≤ 25 % après retour au même écran ;
- aucun accroissement linéaire du nombre de listeners, timers ou nœuds détachés ;
- cache images mémoire avec plafond configurable.

### Lecture

- après fermeture de cinq lectures successives, retour proche de la mémoire de départ ;
- zéro instance HLS active après fermeture ;
- zéro timer de reporting restant ;
- zéro listener document/vidéo orphelin ;
- aucune URL objet non révoquée.

## Lecteur

| Mesure | Cible | Limite bloquante |
|---|---:|---:|
| Affichage de l’overlay lecteur | ≤ 150 ms | 300 ms |
| Démarrage direct play après métadonnées | ≤ 1 s hors réseau | 2 s hors réseau |
| Apparition des contrôles | ≤ 50 ms | 100 ms |
| Recherche locale dans média bufferisé | retour visuel ≤ 100 ms | 250 ms |
| Reporting progression | aucune frame bloquée | aucune erreur utilisateur |

Le lecteur doit distinguer réellement DirectPlay, DirectStream/remux et Transcode dans les rapports Jellyfin.

## Réseau et cache

- annulation des requêtes liées à une route quittée ;
- déduplication des requêtes identiques en vol ;
- maximum de requêtes images concurrentes adapté au navigateur ;
- aucune réponse privée mise en cache par le service worker sans stratégie explicite ;
- aucun jeton écrit dans les logs ou diagnostics ;
- politique de retry limitée aux erreurs réseau et statuts explicitement admissibles ;
- aucune boucle de retry infinie.

## Animations

- propriétés privilégiées : `transform` et `opacity` ;
- pas d’animation de largeur/hauteur continue sur listes volumineuses sans mesure ;
- `backdrop-filter` désactivable et limité ;
- respect immédiat de `prefers-reduced-motion` et de la préférence interne ;
- transitions de focus ≤ 180 ms ;
- transitions de backdrop ≤ 350 ms.

## Seuils de qualité automatisés

La CI devra échouer si :

- un bundle dépasse sa limite bloquante ;
- un test de focus dépasse 16 ms au p95 sur fixture définie ;
- une page de référence dépasse 2 000 nœuds DOM ;
- un parcours E2E révèle un listener/timer lecteur restant ;
- un test Lighthouse contrôlé descend sous les seuils convenus ;
- une comparaison visuelle dépasse la tolérance sans validation explicite.

## Discipline de mesure

Toute optimisation doit être accompagnée d’une mesure avant/après. Les changements purement intuitifs ne suffisent pas. Les rapports de version doivent indiquer :

- taille des bundles ;
- temps de démarrage ;
- temps de focus p50/p95 ;
- temps de route ;
- nombre maximal de nœuds ;
- résultat mémoire consultation/lecture ;
- appareils et navigateurs testés.
