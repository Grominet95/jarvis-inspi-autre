const express = require("express");
const path = require("path");
require("dotenv").config();
const fs = require("fs");
const fsp = fs.promises;
const mqtt = require("mqtt");
const { spawn } = require("child_process");
const cheerio = require("cheerio");
// Use built-in fetch in Node.js 18
// const fetch = require("node-fetch").default;
// Always use BambuLab Cloud MQTT mode
const cloudEnabled = true;
// Base URL for BambuLab Cloud APIs
const API_BASE = 'https://api.bambulab.com';
// In-memory list of cloud printers (deviceId and name)
// Cloud MQTT printers list and client
let cloudPrinters = [];
let cloudClient = null;


const app = express();
// Multicast DNS (mDNS) via Bonjour unused in cloud-only mode
// const bonjour = new Bonjour();
// Debug logging for critical 3D-printing endpoints
app.use((req, res, next) => {
  const debugPaths = ['/api/3dprint/login', '/api/3dprint/verify'];
  if (debugPaths.includes(req.path)) {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`, req.body || '');
  }
  next();
});
// Backend API port (CRA dev server proxies API calls here)
const port = process.env.PORT || 3001;

// Use JSON parsing middleware
// Use JSON parsing middleware with increased limit for large image payloads
app.use(express.json({ limit: '50mb' }));
// --- BambuBoard MQTT & API integration ---
// Telemetry cache mapping printerSN -> latest telemetry
let telemetryCacheMap = {};
// Config and token paths
const bambuConfigPath = path.join(__dirname, 'bambu-config.json');
const bambuTokenPath = path.join(__dirname, 'bambu-token.json');
// Default Bambu config
let bambuConfig = {
  printerURL: process.env.BAMBUBOARD_PRINTER_URL || '',
  // Default MQTT port for Bambu printer
  printerPort: process.env.BAMBUBOARD_PRINTER_PORT || 8883,
  printerSN: process.env.BAMBUBOARD_PRINTER_SN || '',
  printerAccessCode: process.env.BAMBUBOARD_PRINTER_ACCESS_CODE || '',
  printerType: process.env.BAMBUBOARD_PRINTER_TYPE || 'X1',
  displayFanPercentages: false,
  displayFanIcons: true
};
// MQTT clients per printerSN
let mqttClients = {};
let sequenceID = 20000;
let lastPushallTime = 0;
const PUSHALL_INTERVAL = 5 * 60 * 1000;
// Load or initialize printer configurations (supports array or single object)
let bambuConfigList = [];
async function loadBambuConfig() {
  try {
    const data = await fsp.readFile(bambuConfigPath, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      bambuConfigList = parsed;
    } else {
      bambuConfigList = [parsed];
      // Persist as array for consistency
      await fsp.writeFile(bambuConfigPath, JSON.stringify(bambuConfigList, null, 2));
    }
  } catch {
    // Initialize with default single config
    bambuConfigList = [bambuConfig];
    await fsp.writeFile(bambuConfigPath, JSON.stringify(bambuConfigList, null, 2));
  }
}
// Save printer configurations: accepts array or object
async function saveBambuConfig(newConfig) {
  if (newConfig.printers && Array.isArray(newConfig.printers)) {
    bambuConfigList = newConfig.printers;
  } else if (Array.isArray(newConfig)) {
    bambuConfigList = newConfig;
  } else {
    bambuConfigList = [newConfig];
  }
  await fsp.writeFile(bambuConfigPath, JSON.stringify(bambuConfigList, null, 2));
}
// Load token
let bambuToken = null;
async function loadBambuToken() {
  try {
    const data = await fsp.readFile(bambuTokenPath, 'utf-8');
    bambuToken = JSON.parse(data);
  } catch {
    bambuToken = null;
  }
}
// Save token
async function saveBambuToken(tokenInfo) {
  bambuToken = tokenInfo;
  await fsp.writeFile(bambuTokenPath, JSON.stringify(tokenInfo, null, 2));
}
// --- Hugging Face Text-to-3D Config ---
// Config path for storing HF token and model ID
const hfConfigPath = path.join(__dirname, 'hf-config.json');
// In-memory HF config, seeded from env or default model ID
// Hugging Face text-to-3D model config (default uses official repo ID)
let hfConfig = {
  huggingFaceToken: process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '',
  modelID: 'Tencent/Hunyuan3D-2'
};
// Load or initialize HF config
async function loadHFConfig() {
  try {
    const data = await fsp.readFile(hfConfigPath, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed.huggingFaceToken) hfConfig.huggingFaceToken = parsed.huggingFaceToken;
    if (parsed.modelID) hfConfig.modelID = parsed.modelID;
  } catch {
    // Write default config
    await fsp.writeFile(hfConfigPath, JSON.stringify(hfConfig, null, 2));
  }
}
// Save HF config
async function saveHFConfig(newConfig) {
  Object.assign(hfConfig, newConfig);
  await fsp.writeFile(hfConfigPath, JSON.stringify(hfConfig, null, 2));
}
/**
 * Connect to BambuLab Cloud MQTT broker and manage telemetry
 */
async function connectMqttCloudClients() {
  if (!bambuToken || !bambuToken.accessToken) {
    console.warn('Skipping cloud MQTT: no valid token');
    return;
  }
  // Fetch bound printers via BambuLab Cloud HTTP API (user/bind)
  const bindUrl = `${API_BASE}/v1/iot-service/api/user/bind`;
  console.log(`Fetching printers via ${bindUrl}`);
  let printers = [];
  try {
    const res = await fetch(bindUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bambuToken.accessToken}`, Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    printers = Array.isArray(data.devices)
      ? data.devices.map(d => ({ deviceId: d.dev_id, name: d.name }))
      : [];
    console.log(`Discovered ${printers.length} printers via user/bind`);
  } catch (e) {
    console.error('Error fetching printers via user/bind:', e);
    return;
  }
  if (!printers.length) {
    console.warn('No printers found via user/bind, aborting Cloud MQTT');
    return;
  }
  cloudPrinters = printers;
  console.log(`Using printers: ${cloudPrinters.map(p => p.deviceId).join(', ')}`);
  const token = bambuToken.accessToken;
  let username = process.env['bambu.cloud.username'];
  if (!username) {
    try {
      const prefRes = await fetch(`${API_BASE}/v1/design-user-service/my/preference`, { headers: { Authorization: `Bearer ${token}` } });
      if (prefRes.ok) {
        const js = await prefRes.json();
        if (js.uid) username = `u_${js.uid}`;
      }
    } catch {}
  }
  if (!username) username = `u_${Math.random().toString(16).slice(2)}`;
  const rawUrl = process.env['bambu.cloud.url'] || process.env.BAMBU_CLOUD_URL || 'mqtts://us.mqtt.bambulab.com:8883';
  const brokerUrl = rawUrl.replace(/^ssl:\/\//, 'mqtts://');
  cloudClient = mqtt.connect(brokerUrl, {
    clientId: username,
    username,
    password: token,
    clean: true,
    reconnectPeriod: 0,
    protocol: 'mqtts'
  });
  cloudClient.on('connect', () => {
    console.log('Connected to cloud MQTT at', brokerUrl);
    // Subscribe and send initial pushall
    cloudPrinters.forEach(({ deviceId }) => {
      const rep = `device/${deviceId}/report`;
      const req = `device/${deviceId}/request`;
      cloudClient.subscribe(rep, err => {
        if (err) return;
        const seq = Date.now().toString();
        const msg = { pushing: { sequence_id: seq, command: 'pushall', version: 1, push_target: 1 } };
        cloudClient.publish(req, JSON.stringify(msg));
      });
    });
  });
  // Periodically request full status
  const pushInterval = setInterval(() => {
    cloudPrinters.forEach(({ deviceId }) => {
      const req = `device/${deviceId}/request`;
      const seq = Date.now().toString();
      const msg = { pushing: { sequence_id: seq, command: 'pushall', version: 1, push_target: 1 } };
      cloudClient.publish(req, JSON.stringify(msg));
    });
  }, 5000);
  cloudClient.on('close', () => clearInterval(pushInterval));
  cloudClient.on('message', (topic, buff) => {
    try {
      const msg = JSON.parse(buff.toString());
      const id = topic.split('/')[1];
      const update = msg.print || msg;
      // Merge with existing telemetry to handle partial updates
      telemetryCacheMap[id] = Object.assign({}, telemetryCacheMap[id] || {}, update);
    } catch (e) {
      console.error('Cloud MQTT message error:', e);
    }
  });
  cloudClient.on('error', err => console.error('Cloud MQTT error:', err));
}
// Initialize Bambu integration
// Initialize Bambu and HF integration

// Entry point: initialize configs and choose MQTT mode (cloud vs local)
(async () => {
  await loadBambuConfig();
  await loadBambuToken();
  // Initialize Hugging Face config (unrelated to 3D printing)
  await loadHFConfig();
  // Cloud-only mode: always start Cloud MQTT
  console.log('Starting in BambuLab Cloud MQTT mode');
  if (!bambuToken || !bambuToken.accessToken || bambuToken.tokenExpiration <= Date.now()) {
    console.error('No valid BambuLab token found; Cloud MQTT will not start.');
  } else {
    await connectMqttCloudClients();
  }
  // Start camera HLS stream
  // For HLS, only use first configured printer
  if (bambuConfigList[0] && bambuConfigList[0].printerURL) {
    // Ensure output directory exists
    const hlsDir = path.join(__dirname, 'public', 'hls');
    fs.mkdirSync(hlsDir, { recursive: true });
    // Spawn ffmpeg to convert RTSP to HLS
    const rtspUrl = `rtsp://${bambuConfig.printerURL}:8554/live.stream`; // adjust stream URL
    spawn('ffmpeg', [
      '-i', rtspUrl,
      '-c:v', 'copy',
      '-f', 'hls',
      '-hls_time', '1',
      '-hls_list_size', '3',
      '-hls_flags', 'delete_segments',
      path.join(hlsDir, 'stream.m3u8')
    ], { stdio: 'ignore', detached: true });
  }
})();

// Serve HLS segments always
app.use('/hls', express.static(path.join(__dirname, 'public', 'hls')));
// Serve STL models directory for development and production
app.use('/models', express.static(path.join(__dirname, 'public', 'models')));
// In production, serve static files from the React app if a build is present
if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, 'build');
  const indexHtml = path.join(buildDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(buildDir));
    // Fallback to index.html for SPA
    app.get('*', (req, res) => {
      res.sendFile(indexHtml);
    });
  }
}
// Modified API route to receive API key from request
app.post("/api/token", async (req, res) => {
  try {
    const { 
      apiKey, 
      model = "gpt-4o-mini-realtime-preview", 
      voice = "echo",
      options = {}
    } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }
    
    const requestBody = {
      model,
      voice,
    };
    
    // Add options if they exist
    if (options.system_instruction) {
      requestBody.options = {
        system_instruction: options.system_instruction
      };
    }
    
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(response.status).json({ 
        error: "Error from OpenAI API", 
        details: errorData 
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// The "GET" version is kept for backward compatibility, but returns an error message
app.get("/api/token", (req, res) => {
  res.status(400).json({ 
    error: "API key required", 
    message: "Please use POST method and include your API key in the request body" 
  });
});

// Text-to-3D Model generation via Hugging Face Inference API for Hunyuan3D-2
app.post('/api/text-to-model', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required' });
  }
  const hfToken = hfConfig.huggingFaceToken;
  if (!hfToken) {
    return res.status(500).json({ error: 'Hugging Face token not configured' });
  }
  try {
    const modelID = hfConfig.modelID;
    const apiUrl = `https://api-inference.huggingface.co/pipeline/text-to-3d?model=${modelID}`;
    console.log('Text-to-3D inference URL:', apiUrl);
    const hfRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/octet-stream'
      },
      body: JSON.stringify({ inputs: text })
    });
    if (!hfRes.ok) {
      const errText = await hfRes.text();
      return res.status(hfRes.status).json({ error: 'Error from Inference API', details: errText });
    }
    res.set('Content-Type', 'model/gltf-binary');
    hfRes.body.pipe(res);
  } catch (err) {
    console.error('Error in /api/text-to-model:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get or set server-side Hugging Face token for text-to-3D
app.get('/api/hf-config', (req, res) => {
  res.json({
    huggingFaceToken: hfConfig.huggingFaceToken,
    modelID: hfConfig.modelID
  });
});
app.post('/api/hf-config', async (req, res) => {
  const { huggingFaceToken, modelID } = req.body;
  if (!huggingFaceToken || !modelID) {
    return res.status(400).json({ error: 'Token and Model ID are required' });
  }
  try {
    await saveHFConfig({ huggingFaceToken, modelID });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save HF config:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// --- 3D Printing API Endpoints ---
// Get current Bambu printer configurations (array)
// Get current Bambu printer configurations (array)
// Get current Bambu printer configurations (Cloud only)
app.get('/api/3dprint/config', (req, res) => {
  const cfg = cloudPrinters.map(p => ({ printerSN: p.deviceId, printerName: p.name }));
  res.json(cfg);
});
  
  // Save generated image to src/assets/photos
  app.post('/api/save-image', async (req, res) => {
    const { b64 } = req.body;
    console.log('POST /api/save-image called');
    if (!b64) {
      return res.status(400).json({ success: false, error: 'b64 required' });
    }
    try {
      const photosDir = path.join(__dirname, 'src', 'assets', 'photos');
      await fsp.mkdir(photosDir, { recursive: true });
      const fileName = `${Date.now()}.png`;
      const filePath = path.join(photosDir, fileName);
      let buf;
      if (typeof b64 === 'string' && (b64.startsWith('http://') || b64.startsWith('https://'))) {
        // URL: fetch the image
        const imgRes = await fetch(b64);
        if (!imgRes.ok) throw new Error(`Failed to fetch image from URL: ${imgRes.statusText}`);
        buf = await imgRes.buffer();
      } else if (typeof b64 === 'string') {
        // Raw base64 string
        buf = Buffer.from(b64, 'base64');
      } else {
        throw new Error('Invalid b64 payload');
      }
      await fsp.writeFile(filePath, buf);
      console.log('Image saved to disk at', filePath);
      return res.json({ success: true, path: filePath });
    } catch (err) {
      console.error('Failed to save image:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

// Client logging endpoint for debugging
app.post('/api/client-logs', (req, res) => {
  const { logs, userAgent, timestamp, url } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, 'client-logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create log entry
  const logEntry = {
    timestamp: timestamp || new Date().toISOString(),
    clientIP,
    userAgent,
    url,
    logs
  };
  
  // Append to daily log file
  const today = new Date().toISOString().split('T')[0];
  const logFile = path.join(logsDir, `client-logs-${today}.json`);
  
  try {
    // Read existing logs or create empty array
    let existingLogs = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, 'utf8');
      if (fileContent.trim()) {
        existingLogs = JSON.parse(fileContent);
      }
    }
    
    // Add new log entry
    existingLogs.push(logEntry);
    
    // Write back to file
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));
    
    console.log(`📱 Client log received from ${clientIP}: ${logs.length} entries`);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save client logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login with username and password against BambuLab
app.post('/api/3dprint/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('API /api/3dprint/login called with:', req.body);
  try {
    // Attempt BambuLab login
    const authResponse = await fetch('https://api.bambulab.com/v1/user-service/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: username, password, apiError: '' })
    });
    let authData;
    try {
      authData = await authResponse.json();
    } catch (e) {
      console.error('Failed to parse login response:', e);
      return res.status(500).json({ error: 'Invalid login response' });
    }
    if (authData.success) {
      const tokenInfo = {
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        tokenExpiration: Date.now() + authData.expiresIn * 1000
      };
      await saveBambuToken(tokenInfo);
      // After successful login, connect to Cloud MQTT without restarting server
      try {
        await connectMqttCloudClients();
        console.log('Cloud MQTT client started after login');
      } catch (e) {
        console.error('Error starting Cloud MQTT after login:', e);
      }
      return res.json({ success: true });
    }
    if (authData.loginType === 'verifyCode') {
      // Trigger verification code email
      const codeResp = await fetch('https://api.bambulab.com/v1/user-service/user/sendemail/code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, type: 'codeLogin' })
      });
      if (codeResp.ok) {
        return res.status(401).json({ error: 'Verification code required' });
      } else {
        const txt = await codeResp.text();
        return res.status(500).json({ error: txt });
      }
    }
    // Other loginType such as 'twoFactor'
    return res.status(403).json({ error: 'Login failed' });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Login error' });
  }
});
// Verify BambuLab code and store token
app.post('/api/3dprint/verify', async (req, res) => {
  const { email, code } = req.body;
  console.log('API /api/3dprint/verify called with:', req.body);
  try {
    const response = await fetch('https://api.bambulab.com/v1/user-service/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: email, code })
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(401).json({ error: errorText });
    }
    const data = await response.json();
    const tokenInfo = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiration: Date.now() + data.expiresIn * 1000
    };
    await saveBambuToken(tokenInfo);
    // After verification, connect to Cloud MQTT without restarting server
    try {
      await connectMqttCloudClients();
      console.log('Cloud MQTT client started after verification');
    } catch (e) {
      console.error('Error starting Cloud MQTT after verification:', e);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error during verification:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});
// Check BambuLab login status
app.get('/api/3dprint/token-status', (req, res) => {
  if (bambuToken && bambuToken.accessToken && bambuToken.tokenExpiration > Date.now()) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});
// Proxy Bambu Lab cloud print tasks endpoint
app.get('/api/3dprint/tasks', async (req, res) => {
  if (!bambuToken || !bambuToken.accessToken || bambuToken.tokenExpiration < Date.now()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const apiUrl = 'https://api.bambulab.com/v1/user-service/my/tasks';
    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${bambuToken.accessToken}` }
    });
    if (!apiRes.ok) {
      const text = await apiRes.text();
      return res.status(apiRes.status).json({ error: text });
    }
    const json = await apiRes.json();
    // Return the raw JSON (contains .hits array with tasks)
    return res.json(json);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get latest printer telemetry
// Get latest telemetry for all configured printers
app.get('/api/3dprint/status', (req, res) => {
  const keys = Object.keys(telemetryCacheMap);
  if (keys.length > 0) {
    res.json(telemetryCacheMap);
  } else {
    res.status(204).end();
  }
});
// Control commands: pause, resume, stop via Cloud MQTT
app.post('/api/3dprint/:printerSN/:cmd', async (req, res) => {
  const { printerSN, cmd } = req.params;
  if (!cloudClient || !cloudClient.connected) {
    return res.status(500).json({ error: 'Cloud MQTT client not connected' });
  }
  const valid = ['pause','resume','stop'];
  if (!valid.includes(cmd)) {
    return res.status(400).json({ error: 'Invalid command' });
  }
  // Compute next sequence_id: increment last received sequence_id if available
  let seq;
  try {
    const last = telemetryCacheMap[printerSN] && telemetryCacheMap[printerSN].sequence_id;
    if (last != null && !isNaN(Number(last))) {
      seq = (Number(last) + 1).toString();
    } else {
      seq = Date.now().toString();
    }
  } catch (e) {
    seq = Date.now().toString();
  }
  const topic = `device/${printerSN}/request`;
  const payload = { print: { sequence_id: seq, command: cmd, param: '' } };
  cloudClient.publish(topic, JSON.stringify(payload), { qos: 1 });
  res.json({ success: true, command: cmd, printerSN });
});
// Get current print model info (image, title, weight, total prints)
app.get('/api/3dprint/model', async (req, res) => {
  if (!bambuToken || !bambuToken.accessToken || bambuToken.tokenExpiration < Date.now()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const apiRes = await fetch('https://api.bambulab.com/v1/user-service/my/tasks', {
      method: 'GET',
      headers: { Authorization: `Bearer ${bambuToken.accessToken}` }
    });
    if (!apiRes.ok) {
      const text = await apiRes.text();
      return res.status(apiRes.status).json({ error: text });
    }
    const data = await apiRes.json();
    // pick first task
    const hit = (data.hits && data.hits[0]) || {};
    const modelInfo = {
      imageUrl: hit.cover || '',
      modelTitle: hit.title || '',
      modelWeight: hit.weight || 0,
      modelCostTime: hit.costTime || 0,
      totalPrints: data.total || 0
    };
    res.json(modelInfo);
  } catch (err) {
    console.error('Error fetching model info:', err);
    res.status(500).json({ error: 'Failed to fetch model info' });
  }
});
// In production, serve the React app for any non-API routes
if (process.env.NODE_ENV === 'production') {
  const indexHtml = path.join(__dirname, 'build', 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.get('*', (req, res) => {
      res.sendFile(indexHtml);
    });
  }
}

// --- Settings API ---
const settingsConfigPath = path.join(__dirname, 'settings-config.json');

// Default settings (should match frontend defaults)
const defaultSettings = {
  voiceModel: 'gpt-4o-mini-realtime-preview',
  voiceType: 'echo',
  systemPrompt: 'You are JARVIS, an AI assistant integrated with the HoloMat interface.',
  animationSpeed: 1,
  themeIntensity: 0.8,
  notifications: true,
  systemSounds: false,
  dataCollection: false,
  enableToolMenu: false,
  mmPerPixel: 0.265,
  mlServerIP: 'localhost:8000',
  lastUpdated: new Date().toISOString()
};

// Load settings config on startup
let settingsConfig = { ...defaultSettings };

const loadSettingsConfig = () => {
  try {
    if (fs.existsSync(settingsConfigPath)) {
      const rawConfig = fs.readFileSync(settingsConfigPath, 'utf8');
      const storedSettings = JSON.parse(rawConfig);
      settingsConfig = { ...defaultSettings, ...storedSettings };
      console.log('Loaded settings config');
    }
  } catch (err) {
    console.error('Error loading settings config:', err);
  }
};

const saveSettingsConfig = () => {
  try {
    settingsConfig.lastUpdated = new Date().toISOString();
    fs.writeFileSync(settingsConfigPath, JSON.stringify(settingsConfig, null, 2));
    console.log('Saved settings config');
  } catch (err) {
    console.error('Error saving settings config:', err);
  }
};

// Load settings config on startup
loadSettingsConfig();

// Get settings configuration
app.get('/api/settings', (req, res) => {
  res.json(settingsConfig);
});

// Save settings configuration
app.post('/api/settings', (req, res) => {
  try {
    // Update only provided settings, keep defaults for missing ones
    settingsConfig = { ...settingsConfig, ...req.body };
    
    saveSettingsConfig();
    res.json({ success: true, settings: settingsConfig });
  } catch (err) {
    console.error('Error saving settings config:', err);
    res.status(500).json({ error: 'Failed to save settings config' });
  }
});

// --- Spotify Credentials API ---
const spotifyConfigPath = path.join(__dirname, 'spotify-config.json');

// Load Spotify config on startup
let spotifyConfig = {
  clientId: '',
  clientSecret: '',
  username: ''
};

const loadSpotifyConfig = () => {
  try {
    if (fs.existsSync(spotifyConfigPath)) {
      const rawConfig = fs.readFileSync(spotifyConfigPath, 'utf8');
      spotifyConfig = { ...spotifyConfig, ...JSON.parse(rawConfig) };
      console.log('Loaded Spotify config');
    }
  } catch (err) {
    console.error('Error loading Spotify config:', err);
  }
};

const saveSpotifyConfig = () => {
  try {
    fs.writeFileSync(spotifyConfigPath, JSON.stringify(spotifyConfig, null, 2));
    console.log('Saved Spotify config');
  } catch (err) {
    console.error('Error saving Spotify config:', err);
  }
};

// Load Spotify config on startup
loadSpotifyConfig();

// Get Spotify configuration
app.get('/api/spotify/config', (req, res) => {
  res.json(spotifyConfig);
});

// Save Spotify configuration
app.post('/api/spotify/config', (req, res) => {
  try {
    const { clientId, clientSecret, username } = req.body;
    
    if (clientId !== undefined) spotifyConfig.clientId = clientId;
    if (clientSecret !== undefined) spotifyConfig.clientSecret = clientSecret;
    if (username !== undefined) spotifyConfig.username = username;
    
    saveSpotifyConfig();
    res.json({ success: true, config: spotifyConfig });
  } catch (err) {
    console.error('Error saving Spotify config:', err);
    res.status(500).json({ error: 'Failed to save Spotify config' });
  }
});

// --- Hugging Face Authentication Token API ---
const authTokenConfigPath = path.join(__dirname, 'hf-auth-config.json');

// Auth token config (separate from the existing text-to-3D hfConfig)
let authTokenConfig = {
  token: ''
};

const loadAuthTokenConfig = () => {
  try {
    if (fs.existsSync(authTokenConfigPath)) {
      const rawConfig = fs.readFileSync(authTokenConfigPath, 'utf8');
      authTokenConfig = { ...authTokenConfig, ...JSON.parse(rawConfig) };
      console.log('Loaded HF auth token config');
    }
  } catch (err) {
    console.error('Error loading HF auth token config:', err);
  }
};

const saveAuthTokenConfig = () => {
  try {
    fs.writeFileSync(authTokenConfigPath, JSON.stringify(authTokenConfig, null, 2));
    console.log('Saved HF auth token config');
  } catch (err) {
    console.error('Error saving HF auth token config:', err);
  }
};

// Load auth token config on startup
loadAuthTokenConfig();

// Get Hugging Face authentication token
app.get('/api/huggingface/config', (req, res) => {
  res.json(authTokenConfig);
});

// Save Hugging Face authentication token
app.post('/api/huggingface/config', (req, res) => {
  try {
    const { token } = req.body;
    
    if (token !== undefined) authTokenConfig.token = token;
    
    saveAuthTokenConfig();
    res.json({ success: true, config: authTokenConfig });
  } catch (err) {
    console.error('Error saving HF auth token config:', err);
    res.status(500).json({ error: 'Failed to save HF auth token config' });
  }
});

// --- Models listing API ---
// Lists STL files under public/models (default) or a safe subdirectory via ?dir=
app.get('/api/models', (req, res) => {
  try {
    const dirParam = (req.query.dir || '');
    const safeDir = String(dirParam).replace(/\.\.+/g, '');
    const baseDir = safeDir ? path.join(__dirname, 'public', 'models', safeDir) : path.join(__dirname, 'public', 'models');
    if (!fs.existsSync(baseDir)) {
      return res.json([]);
    }
    const files = fs.readdirSync(baseDir);
    const stls = files.filter((f) => /\.stl$/i.test(f));
    const entries = stls.map((name) => ({
      name,
      url: `/models/${safeDir ? safeDir + '/' : ''}${name}`
    }));
    res.json(entries);
  } catch (err) {
    console.error('Error listing models:', err);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// --- Model Search API ---
// Generate mock model data for testing when MakerWorld is not accessible
function generateMockModels(keyword) {
  const mockData = {
    skull: [
      {
        title: "Human Skull - Medical Model",
        thumbnail: null,
        url: "https://makerworld.com/models/example-skull-1",
        author: "TechNapa",
        stats: { likes: "2.8k", downloads: "9.5k" }
      },
      {
        title: "High Details Sugar Skull",
        thumbnail: null,
        url: "https://makerworld.com/models/example-skull-2",
        author: "Steve",
        stats: { likes: "2.4k", downloads: "6k" }
      },
      {
        title: "Skull Decoration",
        thumbnail: null,
        url: "https://makerworld.com/models/example-skull-3",
        author: "LD3d lab",
        stats: { likes: "1.6k", downloads: "11.9k" }
      },
      {
        title: "Anatomical Human Skull",
        thumbnail: null,
        url: "https://makerworld.com/models/example-skull-4",
        author: "SF3DPrints",
        stats: { likes: "1.3k", downloads: "4.7k" }
      },
      {
        title: "Voronoi Skull [remix]",
        thumbnail: null,
        url: "https://makerworld.com/models/example-skull-5",
        author: "Joker 3D",
        stats: { likes: "1.3k", downloads: "3.6k" }
      }
    ],
    robot: [
      {
        title: "Articulated Robot Figure",
        thumbnail: null,
        url: "https://makerworld.com/models/example-robot-1",
        author: "RoboMaker",
        stats: { likes: "3.2k", downloads: "12k" }
      },
      {
        title: "Mini Robot Companion",
        thumbnail: null,
        url: "https://makerworld.com/models/example-robot-2",
        author: "TechCrafter",
        stats: { likes: "2.1k", downloads: "8.5k" }
      }
    ],
    vase: [
      {
        title: "Spiral Vase - Single Wall",
        thumbnail: null,
        url: "https://makerworld.com/models/example-vase-1",
        author: "VaseDesigner",
        stats: { likes: "1.8k", downloads: "7.2k" }
      },
      {
        title: "Geometric Planter",
        thumbnail: null,
        url: "https://makerworld.com/models/example-vase-2",
        author: "ModernDesign",
        stats: { likes: "2.4k", downloads: "9.1k" }
      }
    ]
  };

  // Find matching models or create generic ones
  const keywordLower = keyword.toLowerCase();
  let models = [];
  
  // Check for exact matches
  if (mockData[keywordLower]) {
    models = mockData[keywordLower];
  } else {
    // Check for partial matches
    for (const [key, value] of Object.entries(mockData)) {
      if (keywordLower.includes(key) || key.includes(keywordLower)) {
        models = models.concat(value);
      }
    }
  }
  
  // If no matches, create generic models with NO FAKE THUMBNAILS
  if (models.length === 0) {
    for (let i = 1; i <= 5; i++) {
      models.push({
        title: `${keyword} Model ${i}`,
        thumbnail: null, // NO FAKE IMAGES!
        url: `https://makerworld.com/models/example-${keyword.toLowerCase()}-${i}`,
        author: `Creator${i}`,
        stats: { 
          likes: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 9)}k`, 
          downloads: `${Math.floor(Math.random() * 15) + 1}.${Math.floor(Math.random() * 9)}k` 
        }
      });
    }
  }
  
  return models;
}

// Test MakerWorld connectivity
app.get('/api/test-makerworld', async (req, res) => {
  try {
    console.log('Testing MakerWorld connectivity...');
    
    const testUrls = [
      'https://makerworld.com',
      'https://makerworld.com/en',
      'https://makerworld.com/en/search',
      'https://makerworld.com/en/search/models'
    ];
    
    const results = [];
    
    for (const url of testUrls) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          success: response.ok
        });
      } catch (err) {
        results.push({
          url,
          error: err.message,
          success: false
        });
      }
    }
    
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search MakerWorld for 3D models
app.get('/api/search-models', async (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword) {
      return res.status(400).json({ error: 'Keyword parameter is required' });
    }

    console.log(`Searching MakerWorld for: ${keyword}`);
    
    // Try different URL patterns for MakerWorld search
    const possibleUrls = [
      `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(keyword)}`,
      `https://makerworld.com/search/models?keyword=${encodeURIComponent(keyword)}`,
      `https://makerworld.com/en/search?keyword=${encodeURIComponent(keyword)}&type=models`,
      `https://makerworld.com/search?q=${encodeURIComponent(keyword)}`,
      `https://makerworld.com/en/models?search=${encodeURIComponent(keyword)}`
    ];
    
    let response;
    let searchUrl;
    let lastError;
    
    // Try each URL pattern until one works
    for (const url of possibleUrls) {
      try {
        console.log(`Trying URL: ${url}`);
        searchUrl = url;
        
        // Prepare headers - include Bambu Lab auth if available
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"macOS"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://makerworld.com/',
          'Origin': 'https://makerworld.com'
        };

        // Add Bambu Lab authentication if available
        if (bambuToken && bambuToken.accessToken && bambuToken.tokenExpiration > Date.now()) {
          console.log('🔐 Using Bambu Lab authentication for MakerWorld request');
          headers['Authorization'] = `Bearer ${bambuToken.accessToken}`;
          headers['X-Bambu-Token'] = bambuToken.accessToken;
          // Some sites use cookies for auth
          headers['Cookie'] = `bambu_token=${bambuToken.accessToken}; bambu_auth=true`;
        } else {
          console.log('⚠️ No valid Bambu Lab token available for MakerWorld auth');
        }
        
        response = await fetch(url, {
          headers,
          timeout: 10000
        });

        console.log(`Response status for ${url}: ${response.status}`);
        
        if (response.ok) {
          console.log(`✅ Success with URL: ${url}`);
          break;
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          console.log(`❌ Failed with ${url}: ${lastError}`);
        }
      } catch (err) {
        lastError = err.message;
        console.log(`❌ Error with ${url}: ${lastError}`);
        continue;
      }
    }

    if (!response || !response.ok) {
      console.log('❌ All MakerWorld URLs failed, using mock data...');
      
      // Fallback to mock data when MakerWorld is not accessible
      const mockModels = generateMockModels(keyword);
      
      return res.json({
        success: true,
        keyword,
        models: mockModels,
        total: mockModels.length,
        isMockData: true,
        message: 'MakerWorld is currently not accessible. Showing sample results.'
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const models = [];
    
    console.log('📄 Parsing HTML content, length:', html.length);
    
    // Log a sample of the HTML to see what we're working with
    console.log('📄 HTML sample:', html.substring(0, 500));
    
    // Parse the search results - try multiple selectors for MakerWorld
    const selectors = [
      '.model-card',
      '.ModelCard', 
      '[data-testid="model-card"]',
      '.search-result-item',
      '.card',
      '.item',
      '[class*="model"]',
      '[class*="card"]'
    ];
    
    let foundElements = 0;
    
    for (const selector of selectors) {
      const elements = $(selector);
      console.log(`🔍 Selector "${selector}" found ${elements.length} elements`);
      
      if (elements.length > 0) {
        foundElements += elements.length;
        
        elements.each((index, element) => {
          try {
            const $el = $(element);
            
            // Extract model information with more aggressive selectors
            const title = $el.find('.model-title, .title, h1, h2, h3, h4, h5, .name, [class*="title"], [class*="name"]').first().text().trim() ||
                         $el.find('a[href*="/models/"]').attr('title') ||
                         $el.find('img').attr('alt') ||
                         $el.text().trim().split('\n')[0] ||
                         'Untitled Model';
            
            // Extract thumbnail image with more options
            let thumbnail = null;
            const imgSelectors = ['img', '.thumbnail img', '.image img', '[class*="thumb"] img', '[class*="cover"] img'];
            for (const imgSel of imgSelectors) {
              const img = $el.find(imgSel).first();
              thumbnail = img.attr('src') || img.attr('data-src') || img.attr('data-lazy') || img.attr('data-original');
              if (thumbnail) break;
            }
            
            // Extract model URL
            const modelLink = $el.find('a[href*="/models/"], a[href*="/model/"]').first().attr('href') ||
                             $el.attr('href') ||
                             $el.closest('a').attr('href');
            const url = modelLink ? (modelLink.startsWith('http') ? modelLink : `https://makerworld.com${modelLink}`) : null;
            
            // Extract author with more selectors
            const author = $el.find('.author, .creator, .user-name, [class*="author"], [class*="creator"], [class*="user"]').first().text().trim() ||
                          $el.find('a[href*="/profile/"], a[href*="/user/"]').text().trim();
            
            // Extract stats (likes, downloads, etc.)
            const stats = {};
            $el.find('*').each((i, stat) => {
              const text = $(stat).text().trim();
              if (text.match(/\d+[kK]?\s*(like|👍)/i)) {
                stats.likes = text.match(/\d+[kK]?/)[0];
              } else if (text.match(/\d+[kK]?\s*(download|⬇)/i)) {
                stats.downloads = text.match(/\d+[kK]?/)[0];
              }
            });

            // Only add models with valid data - REQUIRE REAL THUMBNAIL
            if (title && title.length > 3) {
              const model = {
                title: title.substring(0, 100).trim(),
                thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : `https://makerworld.com${thumbnail}`) : null,
                url,
                author: author ? author.substring(0, 50).trim() : null,
                stats: Object.keys(stats).length > 0 ? stats : null
              };
              
              console.log('✅ Found model:', model.title, 'thumbnail:', model.thumbnail ? 'YES' : 'NO');
              models.push(model);
            }
          } catch (err) {
            console.warn('Error parsing model element:', err);
          }
        });
      }
    }
    
    console.log(`📊 Total elements found: ${foundElements}, Models parsed: ${models.length}`);

    // If no models found with specific selectors, try a more generic approach
    if (models.length === 0) {
      $('a[href*="/models/"]').each((index, element) => {
          if (index >= 20) return false; // Limit to 20 results
          
          try {
            const $el = $(element);
            const href = $el.attr('href');
            const url = href.startsWith('http') ? href : `https://makerworld.com${href}`;
            
            // Get title from link text or nearby elements
            const title = $el.text().trim() || 
                         $el.find('img').attr('alt') ||
                         $el.attr('title') ||
                         'Model';
            
            // Get thumbnail from img within the link
            const img = $el.find('img').first();
            const thumbnail = img.attr('src') || img.attr('data-src');
            
            if (title && title.length > 2) {
              models.push({
                title: title.substring(0, 100),
                thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : `https://makerworld.com${thumbnail}`) : null,
                url,
                author: null,
                stats: null
              });
            }
          } catch (err) {
            console.warn('Error parsing generic model link:', err);
          }
      });
    }

    console.log(`Found ${models.length} models for keyword: ${keyword}`);
    
    res.json({
      success: true,
      keyword,
      models: models.slice(0, 50), // Limit to 50 results
      total: models.length
    });

  } catch (error) {
    console.error('Error searching MakerWorld:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search MakerWorld',
      details: error.message,
      keyword: req.query.keyword || 'unknown',
      timestamp: new Date().toISOString(),
      debug: {
        searchUrl: searchUrl || 'No URL tried',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }
});

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      mqtt: cloudClient ? cloudClient.connected : false,
      config: !!bambuConfig,
      hf: !!authTokenConfig.token,
      spotify: !!spotifyConfig.clientId,
      settings: !!settingsConfig
    }
  });
});

// Start server
// Start server: bind to all interfaces for Docker
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
server.on('error', err => {
  console.error('Server failed to start:', err);
});
