/**
 * Settings service to handle persistence and management of system settings
 */
const SETTINGS_KEY = 'holomatv3_settings';

// Default settings
const defaultSettings = {
  voiceModel: 'gpt-4o-mini-realtime-preview',
  voiceType: 'echo',
  systemPrompt: 'You are JARVIS, an AI assistant integrated with the HoloMat interface.',
  // Web search settings
  searchModel: 'gpt-4o-search-preview',
  searchContextSize: 'medium', // low, medium, high
  // Image generation settings
  imageModel: 'dall-e-3',
  imageQuality: 'standard', // standard, hd
  imageSize: '1024x1024', // 1024x1024, 1792x1024, 1024x1792
  imageFormat: 'png', // png, jpeg, webp
  partialImages: 2, // 0-3 for streaming
  animationSpeed: 1,
  themeIntensity: 0.8,
  notifications: true,
  systemSounds: false,
  dataCollection: false,
  // Tool menu (double-click)
  enableToolMenu: false,
  // Pixel to millimeter scale (mm per pixel)
  mmPerPixel: 0.265,
  // Background grid settings
  backgroundGrid: '10mm', // '10mm', 'inches', 'none'
  backgroundGradient: false, // Enable/disable gradient effect on background grids
  // Overlay tool settings
  overlayTool: 'none', // 'none', 'protractor', 'ruler-inches', 'ruler-mm', 'hardware'
  // Theme settings
  overlayTheme: 'cyber', // cyber, night, sunset, matrix, arctic - for rulers, protractor, etc
  appIconTheme: 'cyber', // cyber, night, sunset, matrix, arctic - for app icons
  // IP address (and optional port) of the ML server for model creation
  mlServerIP: 'localhost:8000',
  lastUpdated: new Date().toISOString()
};

// Load settings from server
const loadSettings = async () => {
  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      const serverSettings = await response.json();
      console.log("Loaded settings from server:", serverSettings);
      
      // Ensure all default settings are present (backwards compatibility)
      const mergedSettings = { ...defaultSettings, ...serverSettings };
      
      return mergedSettings;
    } else {
      console.log("Failed to load settings from server, using defaults");
      return defaultSettings;
    }
  } catch (error) {
    console.error("Error loading settings from server:", error);
    // Fallback to localStorage for migration
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        console.log("Migrating localStorage settings to server:", parsedSettings);
        
        // Migrate to server
        await saveSettings(parsedSettings);
        
        // Clear localStorage after successful migration
        localStorage.removeItem(SETTINGS_KEY);
        
        return { ...defaultSettings, ...parsedSettings };
      }
    } catch (migrationError) {
      console.error("Migration from localStorage failed:", migrationError);
    }
    
    return defaultSettings;
  }
};

// Save settings to server
const saveSettings = async (settings) => {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("Saved settings to server:", result.settings);
      return true;
    } else {
      console.error('Failed to save settings to server');
      return false;
    }
  } catch (error) {
    console.error('Error saving settings to server:', error);
    return false;
  }
};

// Other functions like applyAnimationSpeed, etc.
const applyAnimationSpeed = () => {};
const applyThemeIntensity = () => {};
const playSystemSound = () => {};
const showNotification = () => {};
const checkForUpdates = async () => ({ hasUpdate: false });

// Reset settings to defaults (for debugging)
const resetSettings = () => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
    console.log("Settings reset to defaults");
    return defaultSettings;
  } catch (error) {
    console.error('Failed to reset settings:', error);
    return defaultSettings;
  }
};

// Get raw stored settings for debugging
const getRawStoredSettings = () => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    return storedSettings ? JSON.parse(storedSettings) : null;
  } catch (error) {
    console.error('Failed to get raw stored settings:', error);
    return null;
  }
};

const settingsService = {
  loadSettings,
  saveSettings,
  checkForUpdates,
  applyAnimationSpeed,
  applyThemeIntensity,
  playSystemSound,
  showNotification,
  resetSettings,
  getRawStoredSettings
};

export default settingsService;
