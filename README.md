# Wholphin Web

Wholphin Web est un client Jellyfin autonome, responsive et auto-hébergeable. Une même installation peut être utilisée par plusieurs personnes : chacune renseigne l’adresse de son propre serveur Jellyfin, puis se connecte avec ses identifiants ou Quick Connect.

L’interface reprend les principes visuels de Wholphin — palette, backdrops, rangées, cartes et hiérarchie des fiches — dans une application conçue pour les navigateurs de bureau, les tablettes et les téléphones.

## Fonctionnalités

- connexion à n’importe quel serveur Jellyfin compatible ;
- plusieurs serveurs et profils enregistrés localement ;
- accueil configurable, recherche, favoris et état de lecture ;
- films, séries, saisons, épisodes, musique, photos, Live TV et DVR ;
- playlists modifiables et intégration Seerr ;
- Direct Play ou transcodage HLS selon le navigateur ;
- pistes audio, sous-titres, chapitres, segments et épisode suivant ;
- interface responsive pour souris, clavier et tactile ;
- PWA, Docker et Nginx.

## Développement

```bash
cd web
npm install
npm run dev
```

Le serveur de développement affiche ensuite l’adresse locale à ouvrir dans le navigateur.

Vérifications complètes :

```bash
cd web
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Docker

```bash
cd web
docker build -t wholphin-web .
docker run --rm -p 8080:80 wholphin-web
```

Puis ouvrir `http://localhost:8080`.

## Connexion à Jellyfin

Le navigateur impose certaines contraintes :

- un client servi en HTTPS ne peut pas contacter un serveur Jellyfin distant en HTTP ;
- si le client et Jellyfin utilisent des domaines différents, Jellyfin doit autoriser l’origine du client dans sa configuration CORS ;
- les codecs disponibles dépendent du navigateur et de l’appareil.

Aucune adresse de serveur, aucun compte et aucun jeton ne sont intégrés au build public.

## Documentation

La documentation technique détaillée se trouve dans [`web/README.md`](web/README.md) et [`web/docs/`](web/docs/).

## Licence et attribution

Ce projet est distribué sous GNU GPL v2. Il dérive du dépôt Wholphin de damontecres et de ses contributeurs. Les informations d’attribution et de modification se trouvent dans [`web/ATTRIBUTION.md`](web/ATTRIBUTION.md).
