# Wholphin Web

Client web/PWA non officiel pour Jellyfin, développé dans le dépôt dérivé de Wholphin. L’objectif est de transposer l’expérience « 10-foot UI » de Wholphin dans un navigateur, sans prétendre que le code Android/Kotlin peut être exécuté tel quel sur le web.

## État de la version 0.1

Fonctionnel :

- connexion à un serveur Jellyfin avec `/System/Info/Public` et `/Users/AuthenticateByName` ;
- session locale, mode démo sans serveur et diagnostics expurgés ;
- accueil avec reprise de lecture, prochains épisodes et ajouts récents ;
- bibliothèques films et séries, recherche, filtres et favoris ;
- fiches média, saisons et épisodes ;
- lecture directe HTML5, repli HLS Jellyfin et HLS.js chargé à la demande ;
- remontée de lecture à Jellyfin (`Playing`, `Progress`, `Stopped`) ;
- navigation à la souris, au tactile, au clavier et à la télécommande ;
- PWA, service worker, Docker et Nginx.

Encore à porter pour atteindre la parité fonctionnelle complète avec Wholphin Android : Live TV/DVR avancé, musique complète avec file persistante, photos/diaporama, Seerr, configuration libre des rangées d’accueil, sous-titres avancés, trickplay, chapitres, versions multiples, profils protégés par PIN et écrans de personnalisation exhaustifs.

## Lancement local

Aucune compilation ni dépendance n’est nécessaire.

```bash
cd web
npm test
npm run serve
```

Puis ouvrir `http://localhost:8080`.

Ne pas ouvrir `index.html` directement en `file://` : les modules JavaScript et le service worker nécessitent un serveur HTTP.

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

## Jellyfin, HTTPS et CORS

Le navigateur applique CORS et interdit les contenus actifs HTTP depuis une page HTTPS. En production :

1. servir Wholphin Web et Jellyfin en HTTPS ;
2. autoriser l’origine du client web dans la configuration réseau de Jellyfin ;
3. idéalement placer les deux services derrière le même reverse proxy et le même domaine ou des sous-domaines cohérents.

Les jetons sont conservés dans `localStorage`. Ce choix rend le client simple à auto-héberger, mais un script injecté dans la même origine pourrait les lire. Utiliser une origine dédiée, une CSP stricte au niveau du reverse proxy et ne pas ajouter de scripts tiers non maîtrisés. HLS.js est actuellement chargé depuis jsDelivr uniquement lorsque le navigateur ne sait pas lire HLS nativement ; il devra être vendored localement pour un déploiement totalement autonome.

## Architecture

- `js/api.js` : client Jellyfin typé par conventions, construction d’URL, authentification, bibliothèques, lecture et progression ;
- `js/app.js` : routeur, rendu, navigation spatiale et actions utilisateur ;
- `js/player.js` : lecteur plein écran ;
- `js/store.js` : session et préférences locales ;
- `js/demo.js` : catalogue fictif sans œuvres ou affiches tierces ;
- `styles.css` : design TV sombre et responsive.

## Licence

Le dépôt d’origine Wholphin est sous GNU GPL v2. Cette version modifiée est distribuée sous les mêmes conditions. Voir le fichier `LICENSE` à la racine du dépôt et `ATTRIBUTION.md` dans ce dossier.
