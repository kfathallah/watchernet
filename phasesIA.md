# Phases de développement du microservice IA

## Objectif
Développer un microservice d'inférence asynchrone pour la détection d'incendie à partir d'un modèle YOLOv26 ONNX, connecté à MediaMTX pour la consommation RTSP et à NATS pour la publication des événements.

## Périmètre fonctionnel
- Consommer les flux RTSP exposés par MediaMTX
- Échantillonner les images à fréquence contrôlée
- Prétraiter les frames pour l'inférence ONNX
- Exécuter l'inférence avec un moteur singleton
- Post-traiter les sorties YOLOv26
- Publier les détections sur NATS
- Préparer le service pour une exécution conteneurisée non-root

## Phase 1 - Cadrage technique
### Objectif
Valider les contraintes d'architecture et figer le contrat d'entrée/sortie du service.

### Tâches
- Confirmer le format de sortie du modèle ONNX
- Définir le schéma JSON des événements publiés sur NATS
- Valider les sujets NATS utilisés par le service
- Définir les paramètres de connexion à MediaMTX et NATS
- Fixer les seuils de confiance et la fréquence d'échantillonnage

### Livrables
- Spécification fonctionnelle du microservice
- Contrat de payload NATS
- Liste des variables de configuration

## Phase 2 - Socle applicatif
### Objectif
Mettre en place la structure interne du microservice.

### Tâches
- Créer l'arborescence `app/core`, `app/services` et `app/main.py`
- Centraliser la configuration dans `config.py`
- Préparer le client NATS réutilisable
- Préparer le moteur ONNX singleton
- Définir les responsabilités de chaque module

### Livrables
- Structure applicative prête à étendre
- Configuration centralisée
- Composants de base isolés et testables

## Phase 3 - Moteur d'inférence
### Objectif
Charger et exécuter le modèle YOLOv26 ONNX de manière optimisée.

### Tâches
- Charger `models/best_mlops.onnx` au démarrage du service
- Vérifier les entrées et sorties du modèle
- Implémenter le prétraitement des frames en 640x640
- Normaliser les images en RGB
- Réaliser l'inférence avec `onnxruntime`
- Décoder la sortie YOLOv26 au format attendu

### Livrables
- `ONNXEngine` singleton opérationnel
- Pipeline prétraitement/inférence/post-traitement validé
- Gestion des erreurs de chargement du modèle

## Phase 4 - Lecture des flux RTSP
### Objectif
Mettre en place la capture des flux vidéo depuis MediaMTX sans bloquer la boucle asyncio.

### Tâches
- Construire l'URL RTSP cible à partir de l'identifiant caméra
- Démarrer les workers de flux par caméra active
- Contrôler le débit de capture entre 5 et 10 FPS
- Gérer les interruptions et la reconnexion
- Libérer proprement les ressources OpenCV

### Livrables
- Worker de flux robuste
- Stratégie de reconnexion
- Capture vidéo compatible avec un traitement continu

## Phase 5 - Détection et filtrage
### Objectif
Transformer les sorties du modèle en événements métier exploitables.

### Tâches
- Filtrer les prédictions selon le seuil de confiance
- Extraire les bounding boxes au format `[xmin, ymin, xmax, ymax]`
- Associer le label `fire` à l'événement détecté
- Normaliser les timestamps au format UTC ISO 8601
- Structurer les résultats de détection de manière homogène

### Livrables
- Post-traitement YOLOv26 finalisé
- Format de détection métier standardisé
- Résultats prêts à publier sur NATS

## Phase 6 - Publication NATS
### Objectif
Diffuser les événements de détection en temps réel vers les consommateurs.

### Tâches
- Réutiliser une connexion NATS distante unique
- Publier sur `watchernet.cameras.<camera_id>.detections`
- Sérialiser les messages en JSON normalisé
- Gérer les erreurs de publication et les retries éventuels
- Prévoir la compatibilité avec plusieurs consommateurs

### Livrables
- Publisher NATS opérationnel
- Contrat de sujet validé
- Événements transmis en temps réel

## Phase 7 - Intégration système
### Objectif
Rendre le service exploitable dans l'architecture globale WatcherNet.

### Tâches
- Vérifier l'intégration avec MediaMTX
- Vérifier la compatibilité avec le Backend FastAPI
- Préparer la consommation future côté Frontend via NATS WebSocket
- S'assurer que le service ne dépend pas de MongoDB
- Vérifier la cohérence avec le docker-compose global

### Livrables
- Service intégré au flux global
- Interopérabilité validée avec les autres composants

## Phase 8 - Conteneurisation et déploiement
### Objectif
Préparer le microservice pour une exécution fiable en environnement Docker.

### Tâches
- Écrire un Dockerfile dédié
- Exécuter le service avec un utilisateur non-root UID 1001
- Déclarer les dépendances Python nécessaires
- Vérifier le montage du modèle dans l'image
- Préparer la configuration par variables d'environnement

### Livrables
- Image Docker reproductible
- Exécution sécurisée en conteneur
- Déploiement prêt pour l'orchestration

## Phase 9 - Validation et robustesse
### Objectif
Sécuriser la qualité du microservice avant intégration finale.

### Tâches
- Tester le chargement du modèle ONNX
- Tester le prétraitement et le post-traitement
- Tester la publication NATS
- Tester la lecture RTSP et la gestion des coupures
- Vérifier les logs, erreurs et cas limites

### Livrables
- Suite de validation du service
- Comportement stable sur flux réel
- Base fiable pour les évolutions futures

## Phase 10 - Stabilisation
### Objectif
Préparer le passage en production et les futures itérations.

### Tâches
- Ajuster les seuils de confiance
- Ajuster le rythme d'échantillonnage
- Corriger les écarts de performance
- Documenter les points d'exploitation
- Préparer les évolutions multi-modèles si nécessaire

### Livrables
- Version stabilisée du microservice IA
- Documentation d'exploitation
- Base saine pour le suivi MLOps

## Ordre recommandé d'exécution
1. Cadrage technique
2. Socle applicatif
3. Moteur d'inférence
4. Lecture des flux RTSP
5. Détection et filtrage
6. Publication NATS
7. Intégration système
8. Conteneurisation et déploiement
9. Validation et robustesse
10. Stabilisation

## Critères de réussite
- Le modèle ONNX est chargé une seule fois au démarrage
- Les flux RTSP sont consommés sans bloquer asyncio
- Les détections sont publiées sur NATS avec un payload normalisé
- Le service reste découplé de MongoDB et du frontend
- Le microservice est exécutable en conteneur non-root
