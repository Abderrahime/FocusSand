# FocusSand

Extension Chrome (Manifest V3) pour gérer ses tâches du jour avec un timer visuel élégant, suivre le temps réel passé, et analyser les dépassements.

## Stack

- **Vite 5** + **React 18** + **TypeScript 5**
- **@crxjs/vite-plugin** (MV3, HMR, bundling popup/service worker)
- **chrome.storage.local** pour la persistance
- **chrome.alarms** + **chrome.notifications** pour la fin de timer même popup fermée

Aucun backend. 100% local.

## Structure

```
src/
├── popup/           # UI React (popup de l'extension)
├── background/      # Service worker MV3
├── services/        # Logique métier (storage, timer, stats)
├── hooks/           # Hooks React qui souscrivent aux services
├── models/          # Types purs (Task, TimeExtension, ActiveTimerState)
├── utils/           # Utilitaires (time, id, constants)
└── styles/          # globals.css (design tokens)
```

## Installation

```bash
npm install
```

## Développement avec HMR

```bash
npm run dev
```

Cela démarre Vite avec hot-reload. Le dossier `dist/` est régénéré en continu. Charger ensuite l'extension dans Chrome (voir ci-dessous) — les modifications du popup sont rechargées automatiquement.

## Build de production

```bash
npm run build
```

Génère le bundle final dans `dist/`.

## Charger l'extension dans Chrome

1. Ouvrir `chrome://extensions` dans Chrome.
2. Activer le **Mode développeur** (toggle en haut à droite).
3. Cliquer sur **« Charger l'extension non empaquetée »**.
4. Sélectionner le dossier `dist/` du projet.
5. L'icône FocusSand apparaît dans la barre d'outils Chrome.
6. Cliquer dessus pour ouvrir la popup.

> **Astuce** : épingler l'extension (icône épingle dans le menu des extensions Chrome) pour la garder visible.

## Icônes

Les icônes ne sont pas incluses pour ne pas alourdir le repo. Pour en ajouter :

1. Créer un dossier `public/icons/` à la racine.
2. Y placer `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`.
3. Décommenter le bloc `icons` dans [manifest.config.ts](manifest.config.ts).

En attendant, Chrome utilise une icône par défaut.

## Fonctionnalités MVP (livrées)

- Ajout de tâche (titre, description, estimation, priorité, catégorie).
- Liste des tâches du jour, séparée « à faire » / « terminées ».
- Démarrer, pause, reprendre, terminer, abandonner, modifier, supprimer.
- Timer circulaire animé avec transitions vert → orange → rouge.
- Dialogue de fin de temps : terminer / ajouter du temps / abandonner.
- Formulaire de motif d'ajout : 5 raisonnables + 5 non raisonnables, taggés.
- Persistance complète (les compteurs continuent même popup fermée).
- Notification système quand le temps est écoulé.
- Dashboard : score sur 100, KPIs, répartition des statuts.

## Roadmap (préparée dans l'architecture)

### Phase 2 — Distractions
Dans [manifest.config.ts](manifest.config.ts), décommenter `host_permissions` et `content_scripts`. Créer `src/content/distraction-detector.ts`. Dans [src/background/service-worker.ts](src/background/service-worker.ts), décommenter le bloc `chrome.tabs.onUpdated` (déjà scaffolded).

### Phase 3 — Sons doux
Ajouter des fichiers `.mp3` dans `public/sounds/`. Étendre `notificationService` avec un `play(soundName)`. Déclencher au démarrage de tâche, à 10 minutes restantes (utiliser `ALARM_NAMES.tenMinutesLeft` déjà défini), et à la fin.

### Phase 4 — Historique hebdomadaire
Étendre `statsService` avec `forWeek(tasks, weekStart)`. Ajouter un onglet « Semaine » dans le `Header`.

### Phase 5 — Export CSV
Ajouter `src/services/export.service.ts` qui sérialise les tâches en CSV via Blob + `chrome.downloads`.

### Phase 6 — Analyse IA
À ce stade un backend devient utile (envoi anonymisé des motifs d'ajout vers l'API Anthropic pour générer des insights hebdomadaires).

## Architecture — choix justifiés

- **Services purs** indépendants de React : facilement testables, réutilisables par le service worker.
- **chrome.storage.local + onChanged** : la popup ne tient pas l'état en mémoire — elle souscrit aux changements via `storageService.subscribe()`. Donc fermer/rouvrir la popup ou changer d'onglet ne perd rien.
- **Timer = timestamps stockés** (`startedAt` + `accumulatedSeconds`) plutôt qu'un compteur en mémoire. La popup recalcule l'elapsed à chaque tick. Robuste à toute fermeture/réouverture.
- **Service worker** ne fait que planifier `chrome.alarms` et notifier. Toute la logique de mutation passe par `timerService` pour rester cohérente.
- **Pas de state manager externe** (Redux, Zustand) : `useState` + hooks personnalisés sont suffisants à cette échelle. À introduire si le state devient global et complexe.

## Commandes utiles

```bash
npm run dev          # Dev server avec HMR
npm run build        # Build production
npm run type-check   # Vérification TypeScript sans build
```
