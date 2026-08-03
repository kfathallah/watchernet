# Instructions Générales GitHub Copilot

Ce projet est une application de vidéosurveillance RTSP/WebRTC entièrement dockerisée.

## Règles d'Architecture
- **Multi-Agent** : Ce projet s'appuie sur trois agents spécialisés dans `.github/agents/` (`orchestrator.md`, `backend-agent.md`, `frontend-agent.md`).
- **Stack Technique** :
  - Frontend : React.js (Vite / Tailwind CSS) + WebRTC (WHEP)
  - Backend : FastAPI + Motor (MongoDB driver asynchrone) + `httpx` (API MediaMTX)
  - Database : MongoDB
  - Media Server : MediaMTX (RTSP vers WebRTC/WHEP)
- **Environnement** : 100% Docker (`docker-compose.yml`). Aucune dépendance ne doit être exécutée en local hors conteneurs.

## Normalisation des Données
- Le schéma `Camera` possède obligatoirement :
  - `id` : Chaîne de caractères (transformation de l'ObjectId MongoDB).
  - `name` : Nom de la caméra.
  - `url` : Flux RTSP/RTSPS.
  - `active` : Booléen (`true`/`false`).

## Règles de Code
- **Python** : Code purement asynchrone (`async`/`await`), typage strict avec Pydantic v2.
- **JavaScript/React** : Composants fonctionnels avec Hooks, gestion propre des cycles de vie réseau (cleanup des connexions `RTCPeerConnection`).
- **Modularité** : Découpage strict par phases selon les directives de l'agent `@orchestrator`.