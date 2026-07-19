# Journal de décisions techniques

Ce document enregistre les décisions qui peuvent modifier la fidélité, les performances ou la maintenabilité de Wholphin Web.

## ADR-001 — Migration incrémentale, pas de réécriture brutale

**Statut :** accepté.

Le prototype reste disponible jusqu’à ce que les parcours TypeScript équivalents soient testés. Les anciens fichiers seront supprimés domaine par domaine.

**Raison :** une réécriture totale rendrait les régressions difficiles à identifier et produirait une longue période sans version vérifiable.

## ADR-002 — TypeScript strict + Vite + Preact

**Statut :** accepté pour la fondation.

Preact est retenu pour le modèle de composants et la faible empreinte. Le projet conserve le contrôle du routeur, du focus et du cache au lieu d’ajouter un ensemble de frameworks lourds.

**Raison :** la version cible comporte de nombreux écrans et états interactifs ; le JavaScript monolithique n’est pas maintenable. Une couche légère permet de rester sous les budgets de bundle.

## ADR-003 — Moteur de navigation spatiale interne

**Statut :** accepté.

Le focus est structuré par régions, rangées et grilles. La géométrie DOM n’est qu’un repli.

**Raison :** l’algorithme actuel mesure tous les contrôles à chaque touche et devient imprévisible dès que l’interface est virtualisée. La parité TV exige des voisins logiques et une restauration déterministe.

## ADR-004 — Dépendances d’exécution locales uniquement

**Statut :** accepté.

Aucune bibliothèque critique, notamment HLS, ne sera importée depuis un CDN pendant l’exécution.

**Raison :** disponibilité hors ligne du shell, intégrité de version, CSP, confidentialité et reproductibilité.

## ADR-005 — Adaptation web explicite des fonctions Android

**Statut :** accepté.

Les fonctions MPV, ExoPlayer, changement automatique de fréquence HDMI et économiseur système Android ne seront pas simulées. Elles seront remplacées par les capacités navigateur pertinentes et documentées comme adaptations ou limitations.

**Raison :** annoncer une parité technique inexistante serait trompeur et compliquerait le diagnostic.

## ADR-006 — Mesure avant optimisation

**Statut :** accepté.

Toute optimisation significative doit produire une mesure avant/après dans un scénario reproductible. Les budgets de `PERFORMANCE_BUDGETS.md` sont bloquants.

**Raison :** les optimisations intuitives peuvent augmenter la complexité sans améliorer l’expérience réelle.

## ADR-007 — Séparation stricte des données privées

**Statut :** accepté.

Les caches, préférences, historiques et restaurations sont indexés au minimum par serveur et utilisateur. Les jetons ne sont jamais exposés dans les logs ou diagnostics.

**Raison :** le support multi-serveur/multi-utilisateur ne doit jamais mélanger les données ou révéler une session.

## ADR-008 — Fidélité contrôlée par tests visuels

**Statut :** accepté.

Les écrans de référence utiliseront des fixtures déterministes et des captures 720p/1080p. Les différences seront validées explicitement, pas à l’œil après coup.

**Raison :** « ressemble parfaitement » doit être objectivable et empêcher les dérives progressives.
