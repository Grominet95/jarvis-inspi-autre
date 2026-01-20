import React, { useState, useEffect } from 'react';
import '../styles/settings-panel.css';
import { useSettings } from '../contexts/SettingsContext';
import realtimeVoiceService from '../services/realtimeVoiceService';
import settingsService from '../services/settingsService';

const SettingsPanel = ({ isOpen, onClose }) => {
  // Animation state for opening and closing transitions
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  
  // Get settings from context instead of directly from service
  const { settings, updateSettings, updateStatus, restartRequired } = useSettings();
  
  // Local state for form values
  const [formValues, setFormValues] = useState(settings);
  
  // Track if voice assistant is active
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  // State for API key management
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // State for system prompt status
  const [systemPromptStatus, setSystemPromptStatus] = useState('idle');
  // State for Bambu Labs account login
  const [bambuEmail, setBambuEmail] = useState('');
  const [bambuPassword, setBambuPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [bambuCode, setBambuCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [bambuAuthStatus, setBambuAuthStatus] = useState(''); // 'success' | 'error'
  const [bambuAuthMessage, setBambuAuthMessage] = useState('');
  
  // State for Spotify configuration
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('');
  const [spotifyUsername, setSpotifyUsername] = useState('');
  const [spotifyConfigSaved, setSpotifyConfigSaved] = useState(false);
  
  // State for Hugging Face configuration
  const [huggingFaceToken, setHuggingFaceToken] = useState('');
  const [hfConfigSaved, setHfConfigSaved] = useState(false);
  
  // Update local form values when settings change
  useEffect(() => {
    setFormValues(settings);
  }, [settings]);
  
  // Load Spotify and Hugging Face configuration from server on component mount
  useEffect(() => {
    const loadSpotifyConfig = async () => {
      try {
        const response = await fetch('/api/spotify/config');
        if (response.ok) {
          const config = await response.json();
          setSpotifyClientId(config.clientId || '');
          setSpotifyClientSecret(config.clientSecret || '');
          setSpotifyUsername(config.username || '');
        }
      } catch (error) {
        console.error('Error loading Spotify config:', error);
      }
    };
    
    const loadHuggingFaceConfig = async () => {
      try {
        const response = await fetch('/api/huggingface/config');
        if (response.ok) {
          const config = await response.json();
          setHuggingFaceToken(config.token || '');
        }
      } catch (error) {
        console.error('Error loading Hugging Face config:', error);
      }
    };
    
    loadSpotifyConfig();
    loadHuggingFaceConfig();
  }, []);
  
  // Check if voice assistant is active
  useEffect(() => {
    setIsVoiceActive(realtimeVoiceService.isActive);
  }, [isOpen]); // Only check when panel opens
  // Load the API key on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key') || '';
    setApiKey(savedApiKey);
    setApiKeySaved(!!savedApiKey);
  }, []);
  // Check BambuLab login status when opening settings
  useEffect(() => {
    if (isOpen) {
      fetch('/api/3dprint/token-status')
        .then(res => res.json())
        .then(data => setBambuAuthStatus(data.loggedIn ? 'success' : 'error'))
        .catch(() => setBambuAuthStatus('error'));
    }
  }, [isOpen]);

  // Add listener for settings updates
  useEffect(() => {
    const handleSettingsUpdate = (settings) => {
      if (settings.systemPrompt) {
        setSystemPromptStatus('updated');
        // Reset status after 3 seconds
        setTimeout(() => setSystemPromptStatus('idle'), 3000);
      }
    };
    
    realtimeVoiceService.addSettingsUpdateListener(handleSettingsUpdate);
    
    return () => {
      realtimeVoiceService.removeSettingsUpdateListener(handleSettingsUpdate);
    };
  }, []);

  // Animation sequence handling
  useEffect(() => {
    if (isOpen) {
      // First show the container
      setIsVisible(true);
      
      // Then show the outline
      setTimeout(() => {
        setShowOutline(true);
      }, 10);
      
      // After the outline is drawn, show panel
      const timer1 = setTimeout(() => {
        setIsPanelVisible(true);
        
        // Hide outline after it's done its job
        setTimeout(() => {
          setShowOutline(false);
        }, 400);
      }, 900);
      
      // After panel appears, show content
      const timer2 = setTimeout(() => {
        setIsContentVisible(true);
      }, 1200);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      // When closing, immediately hide outline and content
      setShowOutline(false);
      setIsContentVisible(false);
      
      // Quick hide of panel after a short delay
      const timer1 = setTimeout(() => {
        setIsPanelVisible(false);
      }, 150);
      
      // Hide container after animation completes
      const timer2 = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isOpen]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle API key changes
  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    setApiKeySaved(false);
  };

  // Save the API key
  const saveApiKey = () => {
    localStorage.setItem('openai_api_key', apiKey);
    realtimeVoiceService.setApiKey(apiKey);
    setApiKeySaved(true);
    
    // Show a brief "Saved!" message that disappears after 2 seconds
    setTimeout(() => {
      setApiKeySaved(false);
    }, 2000);
  };
  
  // Save Spotify configuration to server
  const saveSpotifyConfig = async () => {
    try {
      const response = await fetch('/api/spotify/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: spotifyClientId,
          clientSecret: spotifyClientSecret,
          username: spotifyUsername,
        }),
      });
      
      if (response.ok) {
        setSpotifyConfigSaved(true);
        
        // Show a brief "Saved!" message that disappears after 2 seconds
        setTimeout(() => {
          setSpotifyConfigSaved(false);
        }, 2000);
      } else {
        console.error('Failed to save Spotify config');
      }
    } catch (error) {
      console.error('Error saving Spotify config:', error);
    }
  };

  // Save Hugging Face configuration to server
  const saveHuggingFaceConfig = async () => {
    try {
      const response = await fetch('/api/huggingface/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: huggingFaceToken,
        }),
      });
      
      if (response.ok) {
        setHfConfigSaved(true);
        
        // Show a brief "Saved!" message that disappears after 2 seconds
        setTimeout(() => {
          setHfConfigSaved(false);
        }, 2000);
      } else {
        console.error('Failed to save Hugging Face config');
      }
    } catch (error) {
      console.error('Error saving Hugging Face config:', error);
    }
  };
  // Toggle API key visibility
  const toggleApiKeyVisibility = () => {
    setApiKeyVisible(!apiKeyVisible);
  };
  // Handle verification code submission
  const handleVerifyCode = async () => {
    if (!bambuCode) return;
    setIsVerifyingCode(true);
    setBambuAuthStatus('');
    setBambuAuthMessage('');
    try {
      const res = await fetch('/api/3dprint/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: bambuEmail, code: bambuCode })
      });
      const data = await res.json();
      if (res.ok) {
        setBambuAuthStatus('success');
        setBambuAuthMessage('Verification successful');
        setShowVerifyForm(false);
      } else {
        setBambuAuthStatus('error');
        setBambuAuthMessage(data.error || 'Verification failed');
      }
    } catch (err) {
      setBambuAuthStatus('error');
      setBambuAuthMessage(err.message);
    }
    setIsVerifyingCode(false);
  };
  // Handle Bambu Labs account login (username + password)
  const handleBambuLogin = async () => {
    if (!bambuEmail || !bambuPassword) return;
    setIsLoggingIn(true);
    setBambuAuthStatus('');
    setBambuAuthMessage('');
    setShowVerifyForm(false);
    try {
      const res = await fetch('/api/3dprint/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: bambuEmail, password: bambuPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setBambuAuthStatus('success');
        setBambuAuthMessage('Logged in successfully');
      } else if (res.status === 401 && data.error === 'Verification code required') {
        setBambuAuthStatus('');
        setBambuAuthMessage('Verification code sent to your email');
        setShowVerifyForm(true);
      } else {
        setBambuAuthStatus('error');
        setBambuAuthMessage(data.error || 'Login failed');
      }
    } catch (err) {
      setBambuAuthStatus('error');
      setBambuAuthMessage(err.message);
    }
    setIsLoggingIn(false);
  };

  // Save settings and close panel
  const handleSaveAndClose = () => {
    // Persist voice and general settings
    updateSettings(formValues);
    onClose();
  };

  // Handle system prompt change
  const handleSystemPromptChange = (e) => {
    setSystemPromptStatus('saving');
  };

  const saveSystemPrompt = () => {
    // Your existing save logic
    setSystemPromptStatus('saved');
    
    // Show status for 3 seconds then return to idle
    setTimeout(() => {
      setSystemPromptStatus('idle');
    }, 3000);
  };

  // Don't render anything if not open and not visible
  if (!isOpen && !isVisible) {
    return null;
  }

  // Generate CSS classes for animation states
  const containerClasses = [
    'settings-container',
    isVisible ? 'visible' : '',
    isPanelVisible ? 'panel-visible' : '',
    isContentVisible ? 'content-visible' : '',
    showOutline ? 'show-outline' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Backdrop */}
      <div className="settings-backdrop" onClick={onClose}></div>
      
      {/* SVG Circuit Board Outline Animation */}
      <div className="settings-outline-container">
        <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="none">
          {/* Upper half path - starts from top left and traces clockwise */}
          <path 
            className="settings-outline-path settings-outline-path-upper"
            d="M 15,0 
               L 475,0 
               L 500,15 
               L 960,15 
               L 960,0 
               L 1000,0 
               L 1000,400"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          
          {/* Lower half path - starts from bottom right and traces counterclockwise */}
          <path 
            className="settings-outline-path settings-outline-path-lower"
            d="M 1000,400
               L 1000,770 
               L 985,800 
               L 700,800 
               L 680,790 
               L 300,790 
               L 280,800 
               L 15,800 
               L 0,785 
               L 0,15
               L 15,0"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
        
        {/* Inner glow effect that appears as the outline completes */}
        <div className="settings-panel-glow"></div>
      </div>
      
      {/* Panel */}
      <div className="settings-panel">
        {/* Circuit board decorative elements */}
        <div className="circuit-element circuit-trace-h" style={{ top: '70px', left: '20px', width: '60px' }}></div>
        <div className="circuit-element circuit-trace-h" style={{ top: '120px', right: '40px', width: '80px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ top: '70px', left: '20px', height: '100px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ top: '120px', right: '40px', height: '160px' }}></div>
        <div className="circuit-element circuit-connector" style={{ top: '70px', left: '20px' }}></div>
        <div className="circuit-element circuit-connector" style={{ top: '120px', right: '40px' }}></div>
        
        <div className="circuit-element circuit-node" style={{ top: '170px', left: '20px' }}></div>
        <div className="circuit-element circuit-node" style={{ top: '280px', right: '40px' }}></div>
        
        <div className="circuit-element circuit-dot" style={{ top: '50px', left: '80px' }}></div>
        <div className="circuit-element circuit-dot" style={{ top: '100px', right: '80px' }}></div>
        <div className="circuit-element circuit-dot" style={{ top: '210px', left: '50px' }}></div>
        <div className="circuit-element circuit-dot" style={{ bottom: '100px', right: '60px' }}></div>
        
        {/* Header */}
        <div className="settings-panel-header">
          <h2 className="text-xl text-blue-300 font-light tracking-wider">SYSTEM SETTINGS</h2>
          <div onClick={onClose} className="settings-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        </div>
        
        {/* Panel body */}
        <div className="settings-panel-body">
          {/* Show restart required notification if applicable */}
          {restartRequired && isVoiceActive && (
            <div className="mb-4 p-3 bg-amber-900/30 text-amber-300 border border-amber-500/20 rounded text-xs">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="font-semibold mb-1">Voice Assistant Restart Required</div>
                  <div>Model or system prompt changes require restarting JARVIS to take effect. Turn off the voice assistant and turn it back on to apply your changes.</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tool Menu Toggle */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">TOOL MENU</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-blue-200/80 text-xs mb-1">Enable tool menu on home</div>
                  <div className="text-blue-200/60 text-[11px]">Double-click to open circle menu (Measure/Keyboard/Sketch)</div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="enableToolMenu"
                    checked={!!formValues.enableToolMenu}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-blue-900/40 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600/50 transition-colors border border-blue-500/30 relative">
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-blue-200/80 rounded-full transition-all peer-checked:translate-x-5"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* Pixel-to-mm scale */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">MEASUREMENT SCALE</h3>
              <div className="mb-2">
                <label className="block text-blue-200/70 text-xs mb-1">MM PER PIXEL</label>
                <input
                  type="number"
                  step="0.001"
                  name="mmPerPixel"
                  value={formValues.mmPerPixel ?? ''}
                  onChange={handleChange}
                  placeholder="e.g. 0.265 for 96 DPI"
                  className="settings-input font-mono"
                />
                <p className="text-xs text-blue-200/50 mt-1">Used to convert pixel distances to millimeters in Measure tool</p>
              </div>
            </div>
            
            {/* Theme Settings */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tl"></div>
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <div className="settings-card-notch settings-card-notch-br"></div>
              
              <h3 className="text-blue-300/80 text-sm font-semibold mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z" />
                </svg>
                Theme
              </h3>
              
              <div className="mb-2">
                <label className="block text-blue-200/70 text-xs mb-1">TOOLS OVERLAY THEME</label>
                <select
                  name="overlayTheme"
                  value={formValues.overlayTheme ?? 'cyber'}
                  onChange={handleChange}
                  className="settings-input"
                >
                  <option value="cyber">Cyber Blue - Classic futuristic blue</option>
                  <option value="night">Midnight Purple - Deep space purple vibes</option>
                  <option value="sunset">Solar Flare - Warm orange energy</option>
                  <option value="matrix">Digital Rain - Hacker green matrix style</option>
                  <option value="arctic">Ice Crystal - Cool cyan frost</option>
                </select>
                <p className="text-xs text-blue-200/50 mt-1">Color theme for rulers, protractor, and measurement overlays</p>
              </div>
              
              <div className="mb-2">
                <label className="block text-blue-200/70 text-xs mb-1">APP ICON THEME</label>
                <select
                  name="appIconTheme"
                  value={formValues.appIconTheme ?? 'cyber'}
                  onChange={handleChange}
                  className="settings-input"
                >
                  <option value="cyber">Cyber Blue - Classic futuristic blue</option>
                  <option value="night">Midnight Purple - Deep space purple vibes</option>
                  <option value="sunset">Solar Flare - Warm orange energy</option>
                  <option value="matrix">Digital Rain - Hacker green matrix style</option>
                  <option value="arctic">Ice Crystal - Cool cyan frost</option>
                </select>
                <p className="text-xs text-blue-200/50 mt-1">Color theme for app icons and UI accents</p>
              </div>
              
              <div className="mb-2">
                <label className="block text-blue-200/70 text-xs mb-1">BACKGROUND GRID</label>
                <select
                  name="backgroundGrid"
                  value={formValues.backgroundGrid ?? '10mm'}
                  onChange={handleChange}
                  className="settings-input"
                >
                  <option value="10mm">10mm Grid - Metric grid spacing</option>
                  <option value="inches">Inch Grid - Imperial grid spacing</option>
                  <option value="none">None - Clean background</option>
                </select>
                <p className="text-xs text-blue-200/50 mt-1">Background grid pattern - always blue</p>
              </div>
              
              <div className="mb-2">
                <label className="flex items-center text-blue-200/70 text-xs">
                  <input
                    type="checkbox"
                    name="backgroundGradient"
                    checked={formValues.backgroundGradient ?? false}
                    onChange={handleChange}
                    className="mr-2 w-3 h-3 text-blue-600 bg-blue-900/20 border-blue-800/30 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  BACKGROUND GRADIENT
                </label>
                <p className="text-xs text-blue-200/50 mt-1">Add subtle gradient fade to grid backgrounds</p>
              </div>
              
              <div className="mb-2">
                <label className="block text-blue-200/70 text-xs mb-1">OVERLAY TOOLS</label>
                <select
                  name="overlayTool"
                  value={formValues.overlayTool ?? 'none'}
                  onChange={handleChange}
                  className="settings-input"
                >
                  <option value="none">None - Clean workspace</option>
                  <option value="protractor">Protractor - Angular measurements</option>
                  <option value="ruler-inches">Ruler (Inches) - Imperial measurements</option>
                  <option value="ruler-mm">Ruler (MM) - Metric measurements</option>
                  <option value="hardware">Hardware Reference - Bolt sizes & specs</option>
                </select>
                <p className="text-xs text-blue-200/50 mt-1">Measurement tools and references - uses theme color</p>
              </div>
            </div>
            
            {/* Voice Assistant Settings */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">VOICE ASSISTANT</h3>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">MODEL</label>
                <select 
                  name="voiceModel" 
                  value={formValues.voiceModel} 
                  onChange={handleChange}
                  className="settings-select"
                >
                  <option value="gpt-4o-mini-realtime-preview">GPT-4o Mini Realtime</option>
                  <option value="gpt-4o-realtime-preview">GPT-4o Realtime</option>
                </select>
                {isVoiceActive && formValues.voiceModel !== settings.voiceModel && (
                  <p className="text-amber-300 text-xs mt-1">Model change will apply on restart.</p>
                )}
              </div>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">VOICE</label>
                <select 
                  name="voiceType" 
                  value={formValues.voiceType} 
                  onChange={handleChange}
                  className="settings-select"
                >
                  <option value="echo">Male (Echo)</option>
                  <option value="alloy">Female (Alloy)</option>
                </select>
                {isVoiceActive && formValues.voiceType !== settings.voiceType && (
                  <p className="text-blue-300 text-xs mt-1">Voice will update immediately.</p>
                )}
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-blue-200/70 text-xs">SYSTEM PROMPT</label>
                  {isVoiceActive && systemPromptStatus === 'saved' && (
                    <span className="text-green-400 text-xs">Instructions sent</span>
                  )}
                  {isVoiceActive && systemPromptStatus === 'saving' && (
                    <span className="text-amber-300 text-xs">Sending...</span>
                  )}
                </div>
                <textarea 
                  name="systemPrompt" 
                  value={formValues.systemPrompt} 
                  onChange={handleChange}
                  className="settings-select h-24"
                ></textarea>
                {isVoiceActive && formValues.systemPrompt !== settings.systemPrompt && (
                  <p className="text-amber-300 text-xs mt-1">System prompt change requires restart to apply.</p>
                )}
              </div>
              
              {/* Web Search Settings */}
              <div className="border-t border-blue-500/20 pt-4 mt-4">
                <h4 className="text-blue-300 text-xs font-medium mb-3 tracking-wider">WEB SEARCH</h4>
                
                <div className="mb-3">
                  <label className="block text-blue-200/70 text-xs mb-1">SEARCH MODEL</label>
                  <select 
                    name="searchModel" 
                    value={formValues.searchModel || 'gpt-4o-search-preview'} 
                    onChange={handleChange}
                    className="settings-select"
                  >
                    <option value="gpt-4o-search-preview">GPT-4o Search Preview</option>
                    <option value="gpt-4o-mini-search-preview">GPT-4o Mini Search Preview</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="block text-blue-200/70 text-xs mb-1">SEARCH CONTEXT SIZE</label>
                  <select 
                    name="searchContextSize" 
                    value={formValues.searchContextSize || 'medium'} 
                    onChange={handleChange}
                    className="settings-select"
                  >
                    <option value="low">Low (Fastest)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Most Comprehensive)</option>
                  </select>
                </div>
              </div>
              
              {/* Image Generation Settings */}
              <div className="border-t border-blue-500/20 pt-4 mt-4">
                <h4 className="text-blue-300 text-xs font-medium mb-3 tracking-wider">IMAGE GENERATION</h4>
                
                <div className="mb-3">
                  <label className="block text-blue-200/70 text-xs mb-1">IMAGE MODEL</label>
                  <select 
                    name="imageModel" 
                    value={formValues.imageModel || 'gpt-image-1'} 
                    onChange={handleChange}
                    className="settings-select"
                  >
                    <option value="gpt-image-1">GPT Image 1 (Recommended)</option>
                    <option value="dall-e-3">DALL-E 3</option>
                    <option value="dall-e-2">DALL-E 2</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="block text-blue-200/70 text-xs mb-1">IMAGE QUALITY</label>
                  <select 
                    name="imageQuality" 
                    value={formValues.imageQuality || 'standard'} 
                    onChange={handleChange}
                    className="settings-select"
                  >
                    <option value="standard">Standard</option>
                    <option value="hd">HD (Higher Cost)</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="block text-blue-200/70 text-xs mb-1">IMAGE SIZE</label>
                  <select 
                    name="imageSize" 
                    value={formValues.imageSize || '1024x1024'} 
                    onChange={handleChange}
                    className="settings-select"
                  >
                    <option value="1024x1024">Square (1024x1024)</option>
                    <option value="1792x1024">Landscape (1792x1024)</option>
                    <option value="1024x1792">Portrait (1024x1792)</option>
                  </select>
                </div>
                
                <div className="mb-3">
                  <label className="block text-blue-200/70 text-xs mb-1">STREAMING PARTIALS</label>
                  <select 
                    name="partialImages" 
                    value={formValues.partialImages || 2} 
                    onChange={handleChange}
                    className="settings-select"
                  >
                    <option value={0}>No Partials (Final Only)</option>
                    <option value={1}>1 Partial Image</option>
                    <option value={2}>2 Partial Images</option>
                    <option value={3}>3 Partial Images</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bambu Labs Account Login */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">Bambu Labs Account Login</h3>
              {!showVerifyForm ? (
                <>
                  <div className="mb-3">
                    <label className="block text-blue-200/70 text-xs mb-1">Username (Email)</label>
                    <input
                      type="email"
                      value={bambuEmail}
                      onChange={e => setBambuEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="settings-input"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-blue-200/70 text-xs mb-1">Password</label>
                    <input
                      type="password"
                      value={bambuPassword}
                      onChange={e => setBambuPassword(e.target.value)}
                      placeholder="Password"
                      className="settings-input"
                    />
                  </div>
                  <button
                    onClick={handleBambuLogin}
                    disabled={!bambuEmail || !bambuPassword || isLoggingIn}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded text-white text-xs disabled:opacity-50"
                  >{isLoggingIn ? 'Logging in...' : 'Login'}</button>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="block text-blue-200/70 text-xs mb-1">Verification Code</label>
                    <input
                      type="text"
                      value={bambuCode}
                      onChange={e => setBambuCode(e.target.value)}
                      placeholder="123456"
                      className="settings-input"
                    />
                  </div>
                  <button
                    onClick={handleVerifyCode}
                    disabled={!bambuCode || isVerifyingCode}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded text-white text-xs disabled:opacity-50"
                  >{isVerifyingCode ? 'Verifying...' : 'Verify Code'}</button>
                </>
              )}
              <div className="text-xs mt-2">
                {bambuAuthStatus === 'success' && <div className="text-green-400">Logged In</div>}
                {bambuAuthStatus === 'error' && <div className="text-red-400">{bambuAuthMessage}</div>}
                {bambuAuthMessage && showVerifyForm && <div className="text-blue-200/80">{bambuAuthMessage}</div>}
              </div>
            </div>
            {/* API Key Section */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">API KEY</h3>
              
              {!apiKey && (
                <div className="mb-3 p-2 bg-amber-700/20 border border-amber-500/30 rounded">
                  <p className="text-amber-300 text-xs">
                    <strong>Required:</strong> Please enter your OpenAI API key to use the voice assistant.
                  </p>
                </div>
              )}
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">OPENAI API KEY</label>
                <div className="relative">
                  <input
                    type={apiKeyVisible ? "text" : "password"}
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="Enter your OpenAI API key"
                    className="settings-input pr-10 font-mono"
                  />
                  <button
                    onClick={toggleApiKeyVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-300/70 hover:text-blue-300 text-xs"
                  >
                    {apiKeyVisible ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <p className="text-xs text-blue-200/50 mt-1">
                  Your key is stored locally and never sent to our servers
                </p>
                <p className="text-xs text-blue-200/70 mt-2">
                  You must have access to OpenAI's real-time voice API models
                </p>
              </div>
              
              <div>
                <button 
                  onClick={saveApiKey}
                  className="bg-blue-600/30 hover:bg-blue-500/40 text-blue-300 text-xs py-1 px-3 rounded border border-blue-500/30 transition-all duration-200"
                >
                  {apiKeySaved ? "SAVED!" : "SAVE API KEY"}
                </button>
              </div>
            </div>            {/* ML Server Section */}
            <div className="settings-card">
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">Machine Learning Server</h3>
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">ML Server IP Address</label>
                <input
                  type="text"
                  name="mlServerIP"
                  value={formValues.mlServerIP || ''}
                  onChange={handleChange}
                  placeholder="e.g. 192.168.1.42:8000"
                  className="settings-input font-mono"
                />                <p className="text-xs text-blue-200/50 mt-1">
                  IP address and port of your ML server for the 3D Model Creator app
                </p>
              </div>
            </div>
            
            {/* Spotify Configuration Section */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">SPOTIFY INTEGRATION</h3>
              
              <div className="mb-3 p-2 bg-blue-700/20 border border-blue-500/30 rounded">
                <p className="text-blue-300 text-xs">
                  <strong>Info:</strong> Configure your Spotify Developer app credentials for music control.
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">SPOTIFY CLIENT ID</label>
                <input
                  type="text"
                  value={spotifyClientId}
                  onChange={(e) => {
                    setSpotifyClientId(e.target.value);
                    setSpotifyConfigSaved(false);
                  }}
                  placeholder="Your Spotify app client ID"
                  className="settings-input font-mono"
                />
                <p className="text-xs text-blue-200/50 mt-1">
                  Get this from your Spotify Developer Dashboard
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">SPOTIFY CLIENT SECRET</label>
                <input
                  type="password"
                  value={spotifyClientSecret}
                  onChange={(e) => {
                    setSpotifyClientSecret(e.target.value);
                    setSpotifyConfigSaved(false);
                  }}
                  placeholder="Your Spotify app client secret"
                  className="settings-input font-mono"
                />
                <p className="text-xs text-blue-200/50 mt-1">
                  Keep this secret and secure
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">SPOTIFY USERNAME</label>
                <input
                  type="text"
                  value={spotifyUsername}
                  onChange={(e) => {
                    setSpotifyUsername(e.target.value);
                    setSpotifyConfigSaved(false);
                  }}
                  placeholder="Your Spotify username"
                  className="settings-input"
                />
                <p className="text-xs text-blue-200/50 mt-1">
                  Your Spotify account username
                </p>
              </div>
              
              <div>
                <button 
                  onClick={saveSpotifyConfig}
                  className="bg-green-600/30 hover:bg-green-500/40 text-green-300 text-xs py-1 px-3 rounded border border-green-500/30 transition-all duration-200"
                >
                  {spotifyConfigSaved ? "SAVED!" : "SAVE SPOTIFY CONFIG"}
                </button>
              </div>
            </div>
            
            {/* Hugging Face Integration Section */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">HUGGING FACE INTEGRATION</h3>
              
              <div className="mb-3 p-2 bg-blue-700/20 border border-blue-500/30 rounded">
                <p className="text-blue-300 text-xs">
                  <strong>Info:</strong> Enter your Hugging Face token to access APIs with higher quotas and avoid rate limits.
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-blue-200/70 text-xs mb-1">HUGGING FACE TOKEN</label>
                <input
                  type="password"
                  value={huggingFaceToken}
                  onChange={(e) => {
                    setHuggingFaceToken(e.target.value);
                    setHfConfigSaved(false);
                  }}
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="settings-input font-mono"
                />
                <p className="text-xs text-blue-200/50 mt-1">
                  Get your token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">huggingface.co/settings/tokens</a>
                </p>
              </div>
              
              <div>
                <button 
                  onClick={saveHuggingFaceConfig}
                  className="bg-green-600/30 hover:bg-green-500/40 text-green-300 text-xs py-1 px-3 rounded border border-green-500/30 transition-all duration-200"
                >
                  {hfConfigSaved ? "SAVED!" : "SAVE HF TOKEN"}
                </button>
              </div>
            </div>
            
            {/* About Section */}
            <div className="settings-card">
              {/* Card notches */}
              <div className="settings-card-notch settings-card-notch-tr"></div>
              <div className="settings-card-notch settings-card-notch-bl"></div>
              
              <h3 className="settings-section-label text-blue-400 font-light mb-3 tracking-wider text-sm">ABOUT</h3>
              
              <div className="text-blue-200/70 text-xs leading-relaxed">
                <p className="mb-2">HoloMat V3 with JARVIS Integration</p>
                <p className="mb-2">Version: 3.0.1</p>
                <p>Using OpenAI Real-time Voice API</p>
              </div>
              
              <div className="mt-4">
                <button 
                  className="px-3 py-1.5 bg-blue-900/30 text-blue-300 text-xs rounded border border-blue-500/30 hover:bg-blue-800/40 transition-colors"
                  style={{clipPath: "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"}}
                >
                  CHECK FOR UPDATES
                </button>
              </div>
            </div>
          </div>

          {/* Debug Section */}
          <div className="settings-card mt-4">
            <div className="settings-card-notch settings-card-notch-tr"></div>
            <div className="settings-card-notch settings-card-notch-bl"></div>
            
            <h3 className="settings-section-label text-red-400 font-light mb-3 tracking-wider text-sm">DEBUG TOOLS</h3>
            
            <div className="space-y-2">
              <button 
                className="px-3 py-1.5 bg-red-900/30 text-red-300 text-xs rounded border border-red-500/30 hover:bg-red-800/40 transition-colors w-full"
                onClick={() => {
                  const raw = settingsService.getRawStoredSettings();
                  console.log("Raw stored settings:", raw);
                  console.log("Current form values:", formValues);
                  console.log("Settings from context:", settings);
                  alert("Check browser console for detailed settings dump");
                }}
              >
                DUMP CURRENT SETTINGS TO CONSOLE
              </button>
              
              <button 
                className="px-3 py-1.5 bg-red-900/30 text-red-300 text-xs rounded border border-red-500/30 hover:bg-red-800/40 transition-colors w-full"
                onClick={() => {
                  if (window.confirm("This will reset ALL settings to defaults. Are you sure?")) {
                    settingsService.resetSettings();
                    window.location.reload();
                  }
                }}
              >
                RESET ALL SETTINGS TO DEFAULTS
              </button>
            </div>
          </div>

          {/* Save button */}
          <div className="mt-6 flex justify-end">
            <button 
              className="settings-save-btn"
              onClick={handleSaveAndClose}
            >
              SAVE & CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
