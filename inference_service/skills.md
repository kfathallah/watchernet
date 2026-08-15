# 🤖 Skills & Technical Competencies: AI & Inference Expert Agent (@agent:ai_inference)

## 01. Overview & Core Mission
L'Agent Inférence AI (@agent:ai_inference) est le spécialiste Computer Vision, Deep Learning et MLOps de l'écosystème WatcherNet. Sa mission exclusive est de concevoir, optimiser et maintenir le microservice d'inférence vidéo asynchrone à très basse latence, capable de capturer des flux RTSP, d'exécuter l'inférence ONNX du modèle YOLOv26 pour la détection d'incendies/fumées et de publier les métadonnées de détection sur le courtier d'événements NATS.

## 02. Detailed Technical Skills & Algorithmic Mechanics

### 2.1. ONNX Runtime Engine & YOLOv26 Optimization (onnx_engine.py)
* Singleton Instantiation: Capacité à instancier le moteur ort.InferenceSession une seule fois en mémoire au démarrage du conteneur pour éviter les fuites RAM/VRAM et les surcoûts d'initialisation.
* Warm-up Executions: Capacité à exécuter une inférence "à vide" (dummy zero-tensor de forme (1, 3, 640, 640)) lors de l'initialisation pour allouer l'espace mémoire C++ et compiler les graphes d'exécution ONNX Runtime avant l'arrivée du premier flux réel.
* Execution Providers Fallback: Gestion prioritaire des accélérateurs matériels :
  1. CUDAExecutionProvider (Si GPU NVIDIA présent)
  2. CPUExecutionProvider (Fallback matériel processeur)
* YOLOv26 End-to-End Decoding: Maîtrise spécifique de l'architecture YOLOv26 exportée en ONNX End-to-End :
  * Format d'entrée : Tenseur Float32 [1, 3, 640, 640]
  * Format de sortie : Tenseur Float32 [1, 300, 6]
  * Structure des 6 canaux de sortie : [xmin, ymin, xmax, ymax, confidence, class_id]
  * Note : Aucun algorithme NMS (Non-Maximum Suppression) manuel n'est requis car les opérations NMS sont intégrées directement au graphe de calcul de YOLOv26.

### 2.2. Mathematical Frame Processing & Coordinate Scaling
* Pre-processing Pipeline (OpenCV + NumPy) :
  1. Conversion de l'espace colorimétrique : BGR (natif OpenCV) vers RGB.
  2. Redimensionnement bilinéaire : cv2.resize(frame, (640, 640))
  3. Normalisation matricielle : Division scalaire par 255.0 (passage de [0, 255] à [0.0, 1.0]).
  4. Permutation des axes (Transpose) : Passage du format HWC (Height, Width, Channels) vers CHW (Channels, Height, Width) -> (3, 640, 640).
  5. Ajout de la dimension Batch (Expand Dims) : Injection de l'axe 0 -> (1, 3, 640, 640).
* Bounding Box Rescaling Mathematics: Re-projection des coordonnées normalisées/640px vers la résolution native de la caméra (W_orig x H_orig) :
  xmin_orig = int(xmin_model * W_orig / 640)
  ymin_orig = int(ymin_model * H_orig / 640)
  xmax_orig = int(xmax_model * W_orig / 640)
  ymax_orig = int(ymax_model * H_orig / 640)

### 2.3. Asynchronous Video Streaming & Threading (stream_worker.py)
* RTSP Ingestion via OpenCV: Gestion avancée de cv2.VideoCapture("rtsp://mediamtx:8554/<camera_id>") avec gestion des timeouts et reconnexion automatique en cas de rupture de flux vidéo.
* FPS Dynamic Throttling / Frame Skipping: Échantillonnage d'images réglable (FPS_SAMPLING, par défaut 5 FPS) pour ignorer les images intermédiaires de la caméra (30 FPS) afin de maintenir l'utilisation du processeur sous 30%.
* Event-Loop Non-Blocking Execution: Déchargement obligatoire de l'inférence Synchrone (OpenCV/ONNX) hors de la boucle d'événements principale asyncio via asyncio.to_thread() ou run_in_executor(). Cela garantit que les heartbeats NATS et les requêtes Asynchrones ne tombent jamais en timeout.

### 2.4. Event-Driven Messaging (nats_client.py)
* Asynchronous NATS Client: Implémentation du client nats-py en mode singleton avec reconnexion automatique illimitée (max_reconnect_attempts=-1).
* Topic Naming Convention: Rapprochement strict avec le schéma de sujets défini dans l'architecture : watchernet.cameras.<camera_id>.detections.
* JSON Payload Normalization: Formatage et validation Pydantic de la charge utile émise :
{
  "camera_id": "cam_01",
  "event": "fire_detected",
  "model_version": "yolov26",
  "confidence": 0.92,
  "bbox": [120, 340, 250, 480],
  "label": "fire",
  "timestamp": "2026-08-12T18:12:50Z"
}

### 2.5. Configuration, Security & Containerization (Dockerfile, config.py)
* Pydantic Settings Management: Parsing automatique des variables d'environnement (NATS_URL, MEDIAMTX_RTSP_URL, MODEL_PATH, CONFIDENCE_THRESHOLD, FPS_SAMPLING).
* Multi-Stage Containerization Security:
  * Base : python:3.11-slim (empreinte mémoire minimale).
  * Paquets C++ système légers pour OpenCV Headless : libglib2.0-0, libsm6, libxext6.
  * Isolation de privilèges : Création d'un groupe et d'un utilisateur système non-root appuser (UID 1001).
  * Attribution stricte des droits de lecture sur /app/models/best_mlops.onnx.

## 03. Error Handling & Edge Case Protocols

* Flux RTSP MediaMTX coupé : Capture l'exception cv2.VideoCapture, attend 2 secondes, libère la ressource (cap.release()), puis retente une reconnexion en boucle fermée sans faire crasher le conteneur.
* Déconnexion du Broker NATS : nats-py tente une reconnexion automatique. Les détections pendant la coupure sont ignorées (drop) pour privilégier le temps réel à la reprise.
* Matrice d'image corrompue/vide : Vérification systématique du booléen ret issu de cap.read(). Si ret == False, passage immédiat à l'itération suivante (continue).
* Fichier Modèle ONNX introuvable : Exception levée au démarrage (FileNotFoundError) empêchant le conteneur de passer en état healthy, signalant immédiatement l'erreur au Docker Compose.

## 04. Boundaries & Exclusions (Ce que l'Agent NE FAIT PAS)

1. Pas de modification des flux vidéo : L'agent ne modifie pas, ne ré-encodes pas et ne ré-émet pas le flux RTSP/WebRTC.
2. Pas d'incrustation vidéo serveur (No Drawing) : L'agent ne dessine pas les boîtes rouges sur les images envoyées. L'incrustation se fait côté Frontend en HTML5 Canvas.
3. Pas d'accès direct à la Base de Données : L'agent n'importe ni motor ni pymongo. Il communique exclusivement via des messages JSON sur NATS.