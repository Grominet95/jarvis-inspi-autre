# 🏗️ Architecture Complète de HoloMat V3

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Stack Technique](#stack-technique)
3. [Architecture Frontend](#architecture-frontend)
4. [Architecture Backend](#architecture-backend)
5. [Flux de Données](#flux-de-données)
6. [Services Principaux](#services-principaux)
7. [Système de Fonctions JARVIS](#système-de-fonctions-jarvis)
8. [Intégrations Externes](#intégrations-externes)
9. [Communication Entre Composants](#communication-entre-composants)

---

## 🎯 Vue d'ensemble

**HoloMat V3** est une interface holographique futuriste avec assistant vocal intégré. Le projet combine :
- **Frontend React** : Interface utilisateur interactive
- **Backend Node.js/Express** : API REST et WebSocket
- **Server Python/Flask** : Génération de modèles 3D via ML
- **OpenAI Realtime API** : Assistant vocal JARVIS avec WebRTC
- **Intégrations** : BambuLab (impression 3D), Hugging Face (ML)

### Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           React App (Port 3000 - Dev)                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  App.jsx (Orchestrateur Principal)              │  │  │
│  │  │  ├── SettingsContext (State Management)         │  │  │
│  │  │  ├── Components (UI)                            │  │  │
│  │  │  └── Services (Business Logic)                  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     WebRTC Connection (OpenAI Realtime API)          │  │
│  │     └── realtimeVoiceService.js                      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
        ┌───────────▼──────────┐ ┌───────▼────────────┐
        │  Node.js Server      │ │  Python ML Server  │
        │  (Port 3001)         │ │  (Port 8000)       │
        │  ┌────────────────┐  │ │  ┌──────────────┐  │
        │  │ Express API    │  │ │  │ Flask API    │  │
        │  │ ├── /api/*     │  │ │  │ /image2stl   │  │
        │  │ ├── MQTT       │  │ │  │ Hunyuan3D    │  │
        │  │ └── Config     │  │ │  └──────────────┘  │
        │  └────────────────┘  │ └─────────────────────┘
        └──────────────────────┘
```

---

## 🛠️ Stack Technique

### Frontend

| Technologie | Version | Usage |
|------------|---------|-------|
| **React** | 18.2.0 | Framework UI principal |
| **React DOM** | 18.2.0 | Rendering |
| **Three.js** | 0.159.0 | Visualisation 3D |
| **Framer Motion** | 10.12.4 | Animations |
| **TailwindCSS** | 3.3.2 | Styling utilitaire |
| **React Markdown** | 10.1.0 | Affichage markdown |

### Backend Node.js

| Technologie | Version | Usage |
|------------|---------|-------|
| **Express** | (via npm) | Serveur HTTP/REST API |
| **MQTT** | 5.10.3 | Communication avec imprimantes 3D |
| **Cheerio** | 1.1.2 | Scraping HTML (MakerWorld) |
| **Node-fetch** | (built-in Node 18+) | Requêtes HTTP |

### Backend Python

| Technologie | Version | Usage |
|------------|---------|-------|
| **Flask** | 3.0.0 | API REST pour ML |
| **Hunyuan3D-DiT** | (via hy3dgen) | Génération 3D |
| **Pillow** | 9.5.0+ | Traitement d'images |
| **PyTorch** | (via hy3dgen) | Deep Learning |

### AI & Services Externes

| Service | Usage |
|---------|-------|
| **OpenAI Realtime API** | Assistant vocal (WebRTC) |
| **OpenAI Chat API** | Chat texte et vision |
| **OpenAI Responses API** | Réponses structurées |
| **BambuLab Cloud** | Impression 3D (MQTT) |
| **Hugging Face** | Text-to-3D models |
| **MakerWorld** | Recherche de modèles 3D |

---

## 🎨 Architecture Frontend

### Structure des Composants

```
src/
├── index.js                    # Point d'entrée React
├── App.jsx                     # Composant principal (orchestrateur)
│
├── contexts/
│   └── SettingsContext.jsx     # Context API pour settings globaux
│
├── components/                 # Composants UI
│   ├── IntroScreen.jsx        # Écran d'introduction
│   ├── AppCarousel.jsx        # Carousel d'applications
│   ├── AppWindow.jsx          # Fenêtre d'application
│   ├── SettingsPanel.jsx      # Panneau de configuration
│   ├── TextChatPanel.jsx      # Chat texte avec AI
│   ├── VoiceVisualizer.jsx    # Visualiseur audio
│   ├── AIResponse.jsx         # Affichage réponses AI
│   ├── NotificationSystem.jsx # Système de notifications
│   ├── DesktopManager.jsx     # Gestionnaire de bureau
│   └── ...
│
├── services/                   # Services métier
│   ├── realtimeVoiceService.js    # Service vocal WebRTC
│   ├── openaiTextService.js       # Service chat texte
│   ├── settingsService.js         # Gestion settings
│   ├── imageService.js            # Génération d'images
│   ├── searchService.js           # Recherche web
│   ├── audioAnalyzerService.js    # Analyse audio
│   └── ...
│
├── functions/                  # Système de fonctions JARVIS
│   ├── functions.js           # Définitions des fonctions
│   ├── functionHandlers.js    # Implémentations
│   └── functionManagerService.js  # Gestionnaire central
│
├── apps/                      # Applications internes
│   ├── WeatherApp.jsx
│   ├── CalendarApp.jsx
│   ├── FileExplorerApp.jsx
│   ├── ModelCreator3DApp.jsx
│   └── ...
│
├── data/
│   └── apps.js                # Registre des applications
│
└── styles/                    # CSS/Tailwind
    ├── main.css
    ├── app-container.css
    └── ...
```

### Flux de Rendu Principal

```
1. index.js
   └── SettingsProvider (Context)
       └── App.jsx
           ├── IntroScreen (première vue)
           └── Interface Principale
               ├── DesktopManager (bureau)
               ├── AppCarousel (apps)
               ├── SettingsPanel (config)
               ├── TextChatPanel (chat)
               └── VoiceVisualizer (JARVIS)
```

### Gestion d'État

**Context API (React)**
- `SettingsContext` : Gère tous les paramètres globaux
- Fourni via `SettingsProvider` au niveau racine
- Accessible via `useSettings()` hook

**Local State (useState)**
- État local dans chaque composant
- Windows, notifications, modals, etc.

**Service Layer**
- Services singletons pour logique métier
- Pas de state management externe (Redux, etc.)

---

## ⚙️ Architecture Backend

### Node.js Server (`server.js`)

**Port : 3001** (dev) / **3000** (production)

#### Routes API

```
GET  /api/settings              # Charger settings
POST /api/settings              # Sauvegarder settings

GET  /api/token                 # Générer token OpenAI Realtime (DEPRECATED)
POST /api/token                 # Générer token avec API key

# 3D Printing (BambuLab)
GET  /api/3dprint/config        # Config imprimantes
POST /api/3dprint/login         # Login BambuLab
POST /api/3dprint/verify        # Vérification code
GET  /api/3dprint/token-status  # Statut authentification
GET  /api/3dprint/tasks         # Tâches d'impression
GET  /api/3dprint/status        # Télémétrie imprimante
POST /api/3dprint/:sn/:cmd      # Commandes (pause/resume/stop)

# Machine Learning
POST /api/text-to-model         # Génération 3D (Hugging Face)
GET  /api/hf-config             # Config Hugging Face
POST /api/hf-config             # Sauvegarder config HF

# Images
POST /api/save-image            # Sauvegarder image

# Modèles 3D
GET  /api/models                # Lister STL files
GET  /api/search-models         # Rechercher sur MakerWorld

# Configuration
GET  /api/spotify/config        # Config Spotify
POST /api/spotify/config        # Sauvegarder Spotify
GET  /api/huggingface/config    # Config HF Auth
POST /api/huggingface/config    # Sauvegarder HF Auth

# Utilitaires
POST /api/client-logs           # Logs client
GET  /api/health                # Health check
```

#### Services Backend

**MQTT Client (BambuLab)**
- Connexion Cloud MQTT (`mqtts://us.mqtt.bambulab.com:8883`)
- Abonnement aux topics de télémétrie
- Cache de télémétrie en mémoire

**Configuration Files**
- `bambu-config.json` : Config imprimantes
- `settings-config.json` : Settings serveur
- `hf-config.json` : Config Hugging Face
- `spotify-config.json` : Config Spotify

### Python ML Server (`ml_server.py`)

**Port : 8000**

**Flask Endpoints :**
```
GET  /                          # Documentation
POST /image2stl                 # Conversion image → STL
```

**Pipeline ML :**
```
Image Input (base64/URL)
    ↓
PIL Image Processing
    ↓
Hunyuan3D-DiT Pipeline
    ↓
Mesh Generation (Trimesh)
    ↓
STL Export (Binary)
    ↓
Response (Binary STL file)
```

**Dépendances ML :**
- `hy3dgen` : Pipeline Hunyuan3D
- `torch` : PyTorch backend
- `Pillow` : Image processing

---

## 🔄 Flux de Données

### 1. Initialisation de l'Application

```
1. index.js charge
   └── SettingsProvider initialise
       └── settingsService.loadSettings()
           └── GET /api/settings
               └── server.js charge settings-config.json
                   └── Retourne settings au frontend
                       └── SettingsContext met à jour state
                           └── App.jsx re-render avec settings
```

### 2. Démarrage de JARVIS (Voice Assistant)

```
1. Utilisateur clique sur microphone
   └── App.jsx appelle realtimeVoiceService.startVoiceAssistant()
       └── Crée RTCPeerConnection (WebRTC)
           └── POST https://api.openai.com/v1/realtime?model=...
               └── Obtient SDP answer
                   └── Configure WebRTC connection
                       └── Data Channel s'ouvre
                           └── Envoie session.update avec:
                               ├── tools (functions)
                               ├── voice
                               └── instructions (system prompt)
                                   └── JARVIS prêt!
```

### 3. Appel de Fonction JARVIS

```
1. Utilisateur dit "open calendar"
   └── OpenAI détecte intent
       └── Appelle launch_app({"app_name": "calendar"})
           └── Event reçu via data channel
               └── App.jsx reçoit event.type === "response.function_call_arguments.done"
                   └── Parse arguments JSON
                       └── functionManagerService.getHandler("launch_app")
                           └── functionHandlers.handleLaunchApp()
                               └── App.jsx lance CalendarApp
                                   └── AppWindow créé
                                       └── CalendarApp rendu
```

### 4. Génération d'Image 3D

```
1. Utilisateur: "create a 3D model of a dragon"
   └── JARVIS appelle generate_3d_model()
       └── App.jsx reçoit function call
           └── Envoie prompt à ML server
               └── POST http://localhost:8000/image2stl
                   └── ml_server.py charge image
                       └── Hunyuan3D-DiT génère mesh
                           └── Exporte STL
                               └── Retourne fichier binaire
                                   └── App.jsx sauvegarde STL
                                       └── Ouvre ModelViewerApp avec STL
```

### 5. Chat Texte

```
1. Utilisateur tape message
   └── TextChatPanel.sendMessage()
       └── openaiTextService.sendMessage()
           └── POST https://api.openai.com/v1/chat/completions
               └── OpenAI répond avec message
                   └── TextChatPanel affiche réponse
                       └── Si vector stores activés:
                           └── file_search appelé
                               └── Réponse avec citations
```

---

## 🔌 Services Principaux

### realtimeVoiceService.js

**Responsabilité :** Gérer la connexion WebRTC avec OpenAI Realtime API

**Méthodes clés :**
- `startVoiceAssistant(options)` : Démarrer JARVIS
- `stopVoiceAssistant()` : Arrêter JARVIS
- `sendCombinedSessionConfig()` : Envoyer config (tools + voice + prompt)
- `sendFunctionCallResult(callId, result)` : Retour résultat fonction
- `updateSettings(settings)` : Mettre à jour settings à chaud

**Flux :**
```
WebRTC Connection
    ├── Audio Track (microphone) → OpenAI
    ├── Audio Track (OpenAI) → Speaker
    └── Data Channel
        ├── Event: session.created
        ├── Event: response.text.done
        ├── Event: response.function_call_arguments.done
        └── Send: session.update, conversation.item.create
```

### openaiTextService.js

**Responsabilité :** Gérer les requêtes texte vers OpenAI

**APIs supportées :**
- Chat Completions API (gpt-4o, etc.)
- Responses API (gpt-4.1)
- Vision API (images)

**Features :**
- Cache intelligent des paramètres token (max_tokens vs max_completion_tokens)
- Fallback automatique entre APIs
- Support vector stores (file search)
- Gestion conversation history

### settingsService.js

**Responsabilité :** Persistance et chargement des settings

**Storage :**
- Frontend : `localStorage` (fallback)
- Backend : `settings-config.json` (source de vérité)

**Default Settings :**
```javascript
{
  voiceModel: 'gpt-4o-mini-realtime-preview',
  voiceType: 'echo',
  systemPrompt: 'You are JARVIS...',
  searchModel: 'gpt-4o-search-preview',
  imageModel: 'dall-e-3',
  // ... etc
}
```

### functionManagerService.js

**Responsabilité :** Gérer le registre des fonctions JARVIS

**Fonctionnalités :**
- Charger fonctions depuis `functions.js`
- Générer schema OpenAI
- Router appels vers handlers
- Validation des paramètres
- Aide et exemples

---

## 🎯 Système de Fonctions JARVIS

### Architecture

```
functions.js (Définitions)
    ↓
functionManagerService (Registre)
    ↓
realtimeVoiceService (Envoie schema à OpenAI)
    ↓
OpenAI (Décide quand appeler)
    ↓
App.jsx (Reçoit function call)
    ↓
functionHandlers.js (Exécute)
    ↓
Résultat retourné à OpenAI
    ↓
JARVIS répond à l'utilisateur
```

### Structure d'une Fonction

```javascript
{
  name: "launch_app",
  description: "Launch an application",
  parameters: {
    type: "object",
    properties: {
      app_name: { type: "string", description: "..." }
    },
    required: ["app_name"]
  },
  handler: "appLaunchService.launchApp",
  service: "appLaunchService",
  examples: ["open calendar", "launch file explorer"]
}
```

### Handlers

**functionHandlers.js** contient les implémentations :
- `handleLaunchApp()` : Lance une app
- `handleWebSearch()` : Recherche web
- `handleGenerateImage()` : Génère image
- `handleSetVolume()` : Change volume
- etc.

---

## 🌐 Intégrations Externes

### OpenAI

**Realtime API (WebRTC)**
- URL : `https://api.openai.com/v1/realtime`
- Protocol : WebRTC + Data Channel
- Models : `gpt-4o-mini-realtime-preview`, `gpt-4o-realtime-preview`
- Fonctionnalités : Streaming audio, function calling, tools

**Chat Completions API**
- URL : `https://api.openai.com/v1/chat/completions`
- Models : `gpt-4o`, `gpt-4o-mini`, etc.
- Features : Vision, conversation, vector stores

**Responses API**
- URL : `https://api.openai.com/v1/responses`
- Model : `gpt-4.1`
- Features : File search, structured responses

### BambuLab

**MQTT Cloud**
- Broker : `mqtts://us.mqtt.bambulab.com:8883`
- Topics :
  - `device/{deviceId}/report` (télémétrie)
  - `device/{deviceId}/request` (commandes)
- Authentification : Bearer token (BambuLab Cloud)

**HTTP API**
- Base : `https://api.bambulab.com/v1`
- Endpoints :
  - `/user-service/user/login`
  - `/iot-service/api/user/bind`
  - `/user-service/my/tasks`

### Hugging Face

**Text-to-3D**
- API : `https://api-inference.huggingface.co/pipeline/text-to-3d`
- Model : `Tencent/Hunyuan3D-2`
- Format : GLTF binary

**Authentication**
- Token : `hf_xxxxxxxxxxxxxxxxxxxxx`
- Storage : `hf-auth-config.json`

### MakerWorld

**Scraping**
- URLs : `https://makerworld.com/en/search/models`
- Tool : Cheerio (HTML parsing)
- Fallback : Mock data si inaccessible

---

## 📡 Communication Entre Composants

### Patterns de Communication

**1. Props (React standard)**
```jsx
<AppWindow app={app} onClose={handleClose} />
```

**2. Context API**
```javascript
const { settings, updateSettings } = useSettings();
```

**3. Custom Events (Window)**
```javascript
// Émission
window.dispatchEvent(new CustomEvent('voice-text-delta', { detail: text }));

// Écoute
window.addEventListener('voice-text-delta', handler);
```

**4. Service Singletons**
```javascript
import realtimeVoiceService from './services/realtimeVoiceService';
realtimeVoiceService.startVoiceAssistant();
```

**5. API REST**
```javascript
fetch('/api/settings', { method: 'POST', body: JSON.stringify(data) });
```

**6. WebRTC Data Channel**
```javascript
// Dans realtimeVoiceService
dataChannel.send(JSON.stringify({
  type: "session.update",
  session: { tools, voice, instructions }
}));
```

### Event Flow

**Voice Text Streaming :**
```
OpenAI → WebRTC Data Channel
    → realtimeVoiceService (parse event)
        → window.dispatchEvent('voice-text-delta')
            → App.jsx (écoute event)
                → setBubbleText()
                    → VoiceVisualizer re-render
```

**Function Calls :**
```
OpenAI → WebRTC Data Channel
    → realtimeVoiceService (parse function call)
        → App.jsx (reçoit via callback)
            → functionManagerService.getHandler()
                → functionHandlers.handleX()
                    → Résultat → sendFunctionCallResult()
                        → OpenAI → Réponse vocale
```

---

## 🗂️ Fichiers de Configuration

### Frontend
- `settings-config.json` : Settings utilisateur (synced avec serveur)

### Backend
- `bambu-config.json` : Config imprimantes 3D
- `settings-config.json` : Settings serveur
- `hf-config.json` : Config Hugging Face (text-to-3d)
- `hf-auth-config.json` : Token Hugging Face
- `spotify-config.json` : Config Spotify

### Environnement
- `.env` : Variables d'environnement (non versionné)
- `package.json` : Dépendances npm
- `requirements.txt` : Dépendances Python

---

## 🚀 Déploiement

### Docker

**docker-compose.yml**
```yaml
services:
  holomat:
    build: .
    ports:
      - "3000:3001"  # Frontend/API
      - "8000:8000"  # ML Server
```

**Dockerfile**
- Node.js + Python
- Build React app
- Start Express server
- Start Flask server

### Development

```bash
npm install          # Install dependencies
npm start            # Start dev server (concurrently)
# → React dev server (port 3000)
# → Express server (port 3001)
# → Flask server (port 8000 - si configuré)
```

---

## 🔐 Sécurité & Authentification

**OpenAI API Key**
- Stockage : `localStorage` (client-side)
- Transmission : Directement au navigateur → OpenAI
- Jamais envoyé au serveur Node.js

**BambuLab**
- Authentification : Username/Password → Access Token
- Token stocké : `bambu-token.json`
- MQTT : Token comme password

**Hugging Face**
- Token stocké : `hf-auth-config.json` (server-side)

---

## 📊 Performance & Optimisations

**Frontend :**
- Code splitting (React lazy loading)
- Image optimization
- CSS minification (production)
- React.memo pour composants coûteux

**Backend :**
- Cache télémétrie MQTT (in-memory)
- Connexion MQTT persistante
- Async/await pour I/O

**ML Server :**
- Model loading une seule fois au démarrage
- GPU support (CUDA si disponible)
- Cache STL files

---

## 🐛 Debugging

**Client Logs :**
- Endpoint : `POST /api/client-logs`
- Storage : `client-logs/client-logs-{date}.json`
- Inclut : userAgent, IP, logs, timestamp

**Console Logs :**
- `logInfo()` / `logError()` utils
- Production : logs désactivés

**Health Check :**
- `GET /api/health`
- Status des services (MQTT, config, etc.)

---

## 🔮 Architecture Future

**Améliorations possibles :**
- WebSocket pour real-time updates
- Redis pour cache distribué
- Queue system pour génération 3D
- Authentication système complet
- Multi-tenant support
- Plugin system pour apps

---

**Documentation créée le :** 2025-01-20
**Version :** 3.0.1
