# Architecture cible de Wholphin Web

## Décision principale

Le prototype actuel sera migré progressivement vers une application **TypeScript stricte + Vite + Preact**, avec un routeur et un moteur de navigation spatiale contrôlés par le projet.

Pourquoi ce choix :

- Preact fournit un modèle de composants robuste avec une empreinte plus faible qu’un framework plus lourd ;
- TypeScript rend les contrats Jellyfin, les routes, les préférences et les états vérifiables ;
- Vite fournit un build moderne, des assets hashés, le découpage par route et une boucle de développement rapide ;
- un moteur de focus interne permet de reproduire exactement le comportement Wholphin au lieu de dépendre d’heuristiques DOM génériques ;
- les domaines coûteux seront chargés à la demande.

Aucune dépendance d’exécution ne devra être chargée depuis un CDN. Le lecteur HLS et les autres bibliothèques seront intégrés au build, versionnés et chargés dynamiquement uniquement quand nécessaires.

## Principes

1. **TV d’abord** : la télécommande et le focus sont des concepts d’architecture, pas une couche ajoutée à la fin.
2. **Données séparées de l’affichage** : aucun composant ne construit directement les URL Jellyfin ou les en-têtes d’authentification.
3. **État local explicite** : serveur, utilisateur, préférences, focus et navigation ont des stores distincts.
4. **Chargement progressif** : routes, listes, images et lecteurs ne chargent que ce qui est utile.
5. **Erreurs locales** : une rangée ou un widget en erreur ne bloque pas un écran complet.
6. **Sécurité par défaut** : jetons masqués, URL validées, HTML non injecté et diagnostics expurgés.
7. **Testabilité** : chaque domaine accepte un transport API remplaçable par des fixtures.
8. **Parité traçable** : toute divergence avec Wholphin est documentée dans la matrice de parité.

## Arborescence cible

```text
web/
  public/
    icons/
    manifest.webmanifest
  src/
    app/
      App.tsx
      bootstrap.ts
      routes.ts
      error-boundary.tsx
    core/
      api/
        client.ts
        errors.ts
        request-cache.ts
        url.ts
      auth/
        authorization.ts
        session-store.ts
        token-redaction.ts
      browser/
        capabilities.ts
        device-profile.ts
        remote-keys.ts
      focus/
        focus-engine.ts
        focus-region.tsx
        focus-memory.ts
        key-repeat.ts
      navigation/
        history.ts
        router.ts
        scroll-memory.ts
      preferences/
        schema.ts
        migrations.ts
        preference-store.ts
      i18n/
        index.ts
        fr.ts
        en.ts
      performance/
        marks.ts
        budgets.ts
      security/
        sanitize.ts
        trusted-url.ts
    domains/
      setup/
      home/
      search/
      libraries/
      details/
      context-menu/
      playback/
      live-tv/
      music/
      photos/
      discover/
      settings/
      diagnostics/
    components/
      layout/
      cards/
      rows/
      grid/
      dialogs/
      feedback/
      typography/
    styles/
      tokens.css
      reset.css
      components.css
      utilities.css
    test/
      fixtures/
      factories/
      mock-transport.ts
  tests/
    e2e/
    visual/
    performance/
  docs/
  vite.config.ts
  tsconfig.json
```

## Couche Jellyfin

### Transport

Le client expose un transport unique :

```ts
interface JellyfinTransport {
  request<T>(request: JellyfinRequest): Promise<T>;
  cancel(scope: RequestScope): void;
}
```

Il gère :

- URL normalisée ;
- en-tête `MediaBrowser` ;
- timeout ;
- annulation par `AbortController` ;
- erreurs typées ;
- limitation des nouvelles tentatives ;
- déduplication des requêtes identiques ;
- cache par serveur et utilisateur ;
- masquage des données sensibles ;
- instrumentation de durée.

### Services de domaine

Chaque domaine possède son service :

- `SystemService` ;
- `AuthenticationService` ;
- `UsersService` ;
- `LibrariesService` ;
- `ItemsService` ;
- `ShowsService` ;
- `PlaybackService` ;
- `LiveTvService` ;
- `MusicService` ;
- `ImageService` ;
- `SessionReportingService` ;
- `SeerrService` séparé du transport Jellyfin.

Les composants n’utilisent jamais le transport directement.

## Routage

Une route possède :

- un identifiant stable ;
- des paramètres typés ;
- un chargeur de données ;
- un composant chargé dynamiquement ;
- une clé de restauration du focus ;
- une stratégie de backdrop ;
- une stratégie de cache.

Exemples de destinations :

- accueil ;
- recherche ;
- bibliothèque ;
- grille filtrée ;
- détails média ;
- série/saison/épisode ;
- collection ;
- playlist ;
- personne ;
- artiste/album ;
- Live TV/enregistrements ;
- diaporama ;
- lecteur ;
- paramètres ;
- diagnostics ;
- Découvrir/Seerr.

Le retour restaure simultanément :

- route ;
- position de scroll ;
- élément focalisé ;
- onglet/saison actif ;
- filtres et tri ;
- backdrop sélectionné.

## Moteur de navigation spatiale

Le moteur ne recherchera pas tous les éléments du DOM à chaque touche. Chaque composant enregistre des nœuds focalisables dans une région :

```ts
interface FocusNode {
  id: string;
  regionId: string;
  row?: number;
  column?: number;
  disabled: boolean;
  element: HTMLElement;
}
```

Les déplacements utilisent d’abord les relations logiques de rangée/grille. La géométrie DOM n’est utilisée qu’en repli pour les écrans non structurés.

Fonctions obligatoires :

- focus initial ;
- focus mémorisé ;
- voisin explicite ;
- entrée/sortie de région ;
- tiroir latéral ;
- dialogues modaux ;
- éléments virtualisés ;
- répétition de touche limitée ;
- appui long ;
- retour après suppression d’un élément.

## État

Stores séparés :

- `SessionStore` : serveurs, utilisateurs, jetons et serveur actif ;
- `PreferenceStore` : préférences versionnées par appareil/serveur/utilisateur ;
- `NavigationStore` : pile, scroll et focus ;
- `PlaybackStore` : média, file, session et état lecteur ;
- `MusicQueueStore` : file audio persistante ;
- `UiStore` : dialogues, notifications et thème.

Aucun store global ne doit contenir les listes complètes des bibliothèques. Ces données restent dans le cache de requêtes avec politique d’expiration.

## Rendu des listes

Les rangées et grilles seront virtualisées. Les contraintes :

- nombre de cartes DOM plafonné ;
- overscan limité mais suffisant pour une télécommande rapide ;
- dimensions connues avant chargement d’image ;
- placeholder stable ;
- focus capable de demander le rendu d’un élément non monté ;
- préchargement de l’image du prochain élément focalisable ;
- aucune reconstruction complète sur changement de favori ou état vu.

## Images et backdrops

Le service image calcule la taille serveur selon :

- taille CSS réelle ;
- densité écran ;
- type d’image ;
- appareil faible/normal ;
- économie de données.

Le backdrop :

- utilise deux calques pour les fondus ;
- annule le chargement d’une image devenue obsolète ;
- précharge uniquement le voisin probable ;
- applique un cache LRU borné ;
- utilise une image réduite sur appareils faibles.

## Lecteur

Le lecteur est un domaine isolé et chargé dynamiquement.

Sous-modules :

- détection des capacités ;
- construction du profil Jellyfin ;
- sélection de source ;
- lecture directe/remux/transcodage ;
- adaptateur HLS ;
- pistes audio ;
- sous-titres ;
- chapitres/trickplay ;
- file et autoplay ;
- reporting de session ;
- contrôles et focus ;
- récupération après erreur.

Le `PlayMethod` envoyé à Jellyfin doit refléter le choix réel. Toute instance HLS, listener, timer et requête doit être libérée lors du changement de média ou de la fermeture.

## Styles

Les styles utilisent des tokens CSS. Aucun composant ne définit arbitrairement ses propres couleurs, rayons ou durées.

Les animations autorisées en navigation normale utilisent principalement :

- `transform` ;
- `opacity`.

Les effets coûteux comme `backdrop-filter` sont désactivables et adaptés selon les capacités de l’appareil.

## Tests

- **Vitest** : fonctions, stores, services et composants ;
- **Playwright** : parcours E2E, télécommande et erreurs réseau ;
- **captures Playwright** : régression visuelle ;
- **axe** : accessibilité ;
- **tests de contrat** : réponses Jellyfin anonymisées ;
- **tests de performance** : focus, route, listes, mémoire et bundle.

## Migration depuis le prototype

1. Installer le build TypeScript sans supprimer le prototype.
2. Reprendre URL, authentification et formatage avec tests équivalents.
3. Introduire le shell et le moteur de focus.
4. Migrer connexion et accueil.
5. Migrer bibliothèques, recherche et fiches.
6. Remplacer le lecteur.
7. Supprimer les anciens fichiers JavaScript seulement quand les parcours équivalents passent les tests.

Cette migration évite une réécriture « big bang » impossible à vérifier.
