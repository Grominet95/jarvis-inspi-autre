# HoloMat V3 with JARVIS Voice Assistant

HoloMat V3 is a futuristic holographic interface with integrated voice assistant powered by OpenAI's real-time API, 3D printing integration, and ML-powered 3D model generation.

## 🚀 Quick Start with Docker

### Prerequisites
- [Docker Desktop](https://www.docker.com/get-started)

### Setup

1. **Clone and run**:
   ```bash
   git clone <your-repo>
   cd HoloMatV3
   docker compose up -d
   ```

2. **Configure in the app**:
   - Open http://localhost:3000
   - Click the settings button (⚙️)
   - Add your OpenAI API key
   - Configure 3D printer settings if needed

That's it! 🎉

## 🎤 Features

- **WebRTC Voice Assistant**: Real-time AI voice interaction
- **3D Model Generation**: Voice/text to 3D STL files
- **3D Printing**: BambuLab printer integration
- **Hand Tracking**: MediaPipe gesture control
- **Multiple Apps**: Weather, calendar, file explorer, and more

## 🔧 Development

For local development without Docker:
```bash
npm install
npm start
```

## 📱 Usage

1. Click the microphone button to activate voice assistant
2. Say "Create a 3D model of a dragon" or "Open the weather app"
3. Use hand gestures for drawing and measurement
4. Connect BambuLab printer for direct 3D printing

## ⚙️ Configuration

All configuration is done through the Settings Panel in the app:
- **OpenAI API Key**: Required for voice assistant
- **ML Server IP**: For 3D model generation (defaults to localhost:8000)
- **3D Printer Settings**: BambuLab printer configuration

## 🛠️ Troubleshooting

- **WebRTC issues**: Use Chrome/Chromium, enable microphone permissions
- **Build failures**: Increase Docker memory to 4GB+
- **ML server slow**: First model load takes time, be patient

## 📚 Tech Stack

- **Frontend**: React, Three.js, TailwindCSS
- **Backend**: Node.js/Express, Python/Flask
- **AI**: OpenAI Realtime API, Hunyuan3D
- **3D**: MediaPipe, STL generation
- **Printing**: BambuLab MQTT integration
# jarvis-inspi-autre
