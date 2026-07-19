# Attribution et avis de modification

## Œuvre d’origine

Wholphin — client Android TV open source pour Jellyfin.

- Auteur et projet d’origine : damontecres et contributeurs de Wholphin
- Source : https://github.com/damontecres/Wholphin
- Licence : GNU General Public License version 2

## Œuvre modifiée

`web/` est une adaptation web non officielle ajoutée le 19 juillet 2026. Elle réimplémente pour le navigateur l’architecture fonctionnelle et certains principes d’interaction du client Android TV : navigation latérale, interface TV, rangées de médias, pages de détail et commandes de lecture.

Les composants Android spécifiques — Kotlin, Jetpack Compose, ExoPlayer, MPV, Android TV et ses API système — ne sont pas exécutés dans cette version. Ils ont été remplacés par HTML, CSS, modules JavaScript, HTMLMediaElement et les API publiques de Jellyfin.

Cette adaptation n’est ni affiliée ni approuvée par le projet Wholphin, Jellyfin ou leurs contributeurs. Les marques et noms de projets restent la propriété de leurs titulaires respectifs.

## Distribution

Cette œuvre modifiée est distribuée sous GNU GPL v2 conformément au fichier `LICENSE` situé à la racine du dépôt. Les destinataires peuvent obtenir le code source complet dans ce dépôt et le modifier ou le redistribuer selon les termes de cette licence.
