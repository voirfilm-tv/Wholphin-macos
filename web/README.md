# Wholphin Web

Wholphin Web est un client Jellyfin autonome, responsive et auto-hébergeable. Une même installation peut être partagée avec plusieurs personnes : chacune saisit l’adresse de son propre serveur Jellyfin, puis se connecte avec ses identifiants ou Quick Connect.

L’interface reprend les couleurs, ratios, densités, rangées, backdrops et principes visuels du projet Wholphin d’origine, tout en remplaçant les comportements exclusivement Android TV par des interactions web adaptées à la souris, au clavier et au tactile.

## Parcours utilisateur

1. Ouvrir l’URL publique de Wholphin Web.
2. Saisir l’adresse complète du serveur Jellyfin, avec le port ou le sous-chemin si nécessaire.
3. Le client vérifie `/System/Info/Public` et affiche le nom ainsi que la version du serveur.
4. Saisir l’utilisateur et le mot de passe, ou utiliser Quick Connect.
5. Les profils, serveurs, préférences et jetons restent stockés localement dans ce navigateur.

Aucune adresse Jellyfin, aucun compte et aucune configuration GNFLIX ne sont intégrés au build.

## Navigateurs ciblés

Les validations automatisées couvrent :

- Chromium desktop, tablette et mobile ;
- Firefox desktop ;
- WebKit desktop et mobile ;
- fenêtres de 320 px aux grands écrans ;
- souris, clavier et tactile.

WebKit constitue une validation du moteur utilisé par Safari. Une validation finale sur Safari macOS/iOS réel reste recommandée avant une publication stable.

## Fonctionnalités principales

- plusieurs serveurs et profils isolés ;
- connexion mot de passe et Quick Connect ;
- verrouillage local par PIN dérivé avec PBKDF2 ;
- accueil configurable avec reprise, épisodes suivants, favoris et rangées par bibliothèque ;
- films, séries, saisons, épisodes, collections, dossiers, musique et photos ;
- recherche, tris, filtres, grille, liste, pagination et virtualisation ;
- favoris, état vu/non vu et playlists modifiables ;
- Direct Play lorsque le navigateur le permet, sinon HLS/transcodage Jellyfin ;
- choix des versions, pistes audio, sous-titres et chapitres ;
- recherche de sous-titres distants, styles WebVTT, segments à passer et épisode suivant ;
- Live TV, guide, enregistrements et programmation DVR ;
- lecteur audio persistant, photothèque, diaporama et intégration Seerr ;
- PWA, Docker, Nginx, diagnostics expurgés et tests automatisés.

## Développement local

Prérequis : Node.js 22.13 ou plus récent.

```bash
cd web
npm install
npm run dev
```

Vite affiche l’adresse locale, généralement `http://localhost:5173`.

Vérification complète hors tests navigateur :

```bash
npm run check
```

Tests responsive Playwright :

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

## Build de production

```bash
cd web
npm install
npm run build
```

Les fichiers statiques sont générés dans `web/dist/`.

Prévisualisation du build :

```bash
npm run preview
```

## Docker

```bash
cd web
docker build -t wholphin-web .
docker run --rm -p 8080:80 wholphin-web
```

Ou :

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d --build
```

Le conteneur sert uniquement le client statique. Il n’embarque pas Jellyfin et ne relaie pas automatiquement les requêtes vers les serveurs des utilisateurs.

## HTTPS, CORS et certificats

Un navigateur impose des contraintes que les applications natives Jellyfin n’ont pas :

- un client ouvert en HTTPS ne peut pas appeler un serveur Jellyfin distant en HTTP ;
- Jellyfin doit autoriser l’origine du client web dans sa configuration CORS lorsqu’ils utilisent des domaines différents ;
- un certificat HTTPS invalide est bloqué par le navigateur avant que Wholphin Web puisse intervenir ;
- un serveur local en HTTP reste utilisable depuis une installation locale également servie en HTTP.

Le formulaire de connexion détecte le contenu mixte et transforme les erreurs réseau/CORS en messages explicites.

Pour une installation publique, utiliser par exemple :

- `https://wholphin.example.fr` pour le client ;
- `https://jellyfin.example.fr` pour Jellyfin ;
- l’origine `https://wholphin.example.fr` ajoutée aux origines CORS autorisées du serveur Jellyfin.

## Stockage et sécurité

Les jetons Jellyfin sont conservés dans `localStorage` afin de permettre plusieurs profils persistants. Le stockage du navigateur n’est pas un coffre-fort : tout script exécuté sur la même origine pourrait lire ces données.

Mesures appliquées :

- Content Security Policy sans script tiers ;
- politique `no-referrer` ;
- diagnostics avec jetons et clés masqués ;
- service worker limité aux fichiers statiques du client ;
- aucune mise en cache des API, images ou médias authentifiés ;
- HLS.js intégré au bundle et chargé à la demande ;
- en-têtes de sécurité Nginx ;
- aucune publicité, analytics ou ressource JavaScript externe.

Utiliser une origine dédiée à Wholphin Web et ne pas y injecter d’autres applications ou scripts.

## Architecture

- `src/core/api/` : client Jellyfin, Quick Connect et diagnostics de connexion ;
- `src/core/storage/` : sessions et préférences versionnées par profil ;
- `src/core/` : routeur, orchestration, historique, compatibilité navigateur et navigation clavier ;
- `src/features/` : domaines fonctionnels indépendants ;
- `src/ui/` : cartes, shell et virtualisation ;
- `e2e/` : parcours Playwright desktop, tablette et mobile ;
- `tests/` : tests unitaires Node ;
- `docs/WEB_CLIENT_SCOPE_AND_SOURCE_ANALYSIS.md` : périmètre web et analyse des sources Wholphin.

## Licence

Le dépôt d’origine Wholphin est distribué sous GNU GPL v2. Cette adaptation conserve la même licence et les notices d’attribution. Voir `LICENSE` à la racine et `ATTRIBUTION.md` dans ce dossier.
