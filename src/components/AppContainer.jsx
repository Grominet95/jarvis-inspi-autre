import React, { useState, useEffect } from 'react';
import '../styles/app-container.css';
import VoiceVisualizer from './VoiceVisualizer';
import ReactiveRing from './ReactiveRing';
import realtimeVoiceService from '../services/realtimeVoiceService';
import audioAnalyzerService from '../services/audioAnalyzerService';
import settingsService from '../services/settingsService';
import AIResponse from './AIResponse';

const AppContainer = ({ app, onClose }) => {
  // Animation state for opening and closing transitions
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showGridEffect, setShowGridEffect] = useState(false);

  // Voice assistant states
  const [micActive, setMicActive] = useState(false);
  const [connectionState, setConnectionState] = useState("idle");
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [aiResponse, setAiResponse] = useState('');
  const [responseVisible, setResponseVisible] = useState(false);

  // Dynamic import of the app component based on its path
  const [AppComponent, setAppComponent] = useState(null);

  useEffect(() => {
    // Import app component dynamically
    const importApp = async () => {
      try {
        const module = await import(`../apps/${app.componentPath}`);
        setAppComponent(() => module.default);
      } catch (err) {
        console.error(`Failed to load app component: ${app.componentPath}`, err);
      }
    };
    
    importApp();
  }, [app.componentPath]);
  // Animation sequence handling
  useEffect(() => {
    // First show the container
    setIsVisible(true);
    
    // Then show the grid hologram effect
    setTimeout(() => {
      setShowGridEffect(true);
    }, 100);
    
    // After the hologram grid effect starts, show panel
    const timer1 = setTimeout(() => {
      setIsPanelVisible(true);
      
      // Fade grid effect after panel appears
      setTimeout(() => {
        setShowGridEffect(false);
      }, 500);
    }, 800);
    
    // After panel appears, show content
    const timer2 = setTimeout(() => {
      setIsContentVisible(true);
        // Show a brief notification about Jarvis availability after app loads
      const timer3 = setTimeout(() => {
        // Only show if window.notify exists and we haven't shown a response already
        if (window.notify && !responseVisible) {
          window.notify({
            title: 'Jarvis Ready',
            message: 'Voice assistant is available in this app. Click the mic button to activate.',
            type: 'info',
            duration: 3000
          });
        }
      }, 1500);
      
      return () => clearTimeout(timer3);
    }, 1100);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Audio analysis for voice volume visualization
  useEffect(() => {
    if (micActive) {
      realtimeVoiceService.setMediaStreamCallback((mediaStream) => {
        if (mediaStream) {
          audioAnalyzerService.initAnalyzer(mediaStream, handleVolumeChange);
        }
      });
    } else {
      audioAnalyzerService.stopAnalyzing();
      setVoiceVolume(0);
    }

    return () => {
      audioAnalyzerService.stopAnalyzing();
    };
  }, [micActive]);
  // Handler for voice volume changes with improved scaling
  const handleVolumeChange = (volume) => {
    // Scale up the volume slightly for better visualization while keeping max at 1
    const scaledVolume = Math.min(volume * 1.5, 1);
    
    // Only update if significant change to avoid excessive renders
    if (Math.abs(scaledVolume - voiceVolume) > 0.05) {
      setVoiceVolume(scaledVolume);
    }
  };  // Handle voice assistant responses with identical implementation as main app
  const handleResponse = (response) => {
    if (response.type === 'text') {
      setAiResponse(response.content);
      setResponseVisible(true);
    }
  };
    // Handle voice assistant errors with improved notification  
  const handleError = (errorMessage) => {
    console.log("Voice assistant error:", errorMessage);
    setConnectionState("error");
    
    // Reset state after error
    setTimeout(() => {
      setConnectionState("idle");
    }, 2000);
    
    if (window.notify) {
      window.notify({
        title: 'Jarvis Connection Failed',
        message: errorMessage,
        type: 'error',
        duration: 8000
      });
    }
  };
  // Toggle microphone for voice assistant
  const toggleMic = async () => {
    const newMicState = !micActive;
    
    if (newMicState) {
      setConnectionState("connecting");
      
      try {
        const settings = settingsService.loadSettings();
        
        const success = await realtimeVoiceService.startVoiceAssistant(
          {
            model: settings.voiceModel,
            initial_prompt: settings.systemPrompt,
            voice: settings.voiceType
          },
          handleResponse,
          handleError
        );
        
        if (success) {
          setMicActive(true);
          setResponseVisible(true);
          setConnectionState("connected");
        } else {
          setConnectionState("error");
          setTimeout(() => {
            setConnectionState("idle");
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to start voice assistant:', error);
        setConnectionState("error");
        setTimeout(() => {
          setConnectionState("idle");
        }, 1000);
      }
    } else {
      setMicActive(false);
      setConnectionState("idle");
      await realtimeVoiceService.stopVoiceAssistant();
      setTimeout(() => {
        setResponseVisible(false);
        setTimeout(() => setAiResponse(''), 400);
      }, 500);
    }
  };
  // Handle graceful closing with animations and cleanup
  const handleClose = () => {
    // Stop voice assistant if active when closing the app
    if (micActive) {
      try {
        realtimeVoiceService.stopVoiceAssistant();
        audioAnalyzerService.stopAnalyzing();
        setVoiceVolume(0);
      } catch (error) {
        console.error("Error stopping voice assistant:", error);
      }
      setMicActive(false);
    }
    
    // Fade out any visible response
    if (responseVisible) {
      const responseElement = document.querySelector('.jarvis-in-app-response');
      if (responseElement) {
        responseElement.style.animation = 'fadeOutDown 0.3s ease-out forwards';
      }
      setTimeout(() => {
        setResponseVisible(false);
        setAiResponse('');
      }, 300);
    }
    
    // Reverse animation sequence
    setIsContentVisible(false);
    
    setTimeout(() => {
      setIsPanelVisible(false);
      
      setTimeout(() => {
        setIsVisible(false);
        
        // Call the actual onClose after animations
        setTimeout(onClose, 300);
      }, 300);
    }, 150);
  };

  // Generate CSS classes for animation states
  const containerClasses = [
    'app-container-wrapper',
    isVisible ? 'visible' : '',
    isPanelVisible ? 'panel-visible' : '',
    isContentVisible ? 'content-visible' : '',
    showGridEffect ? 'show-grid-effect' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {/* Backdrop */}
      <div className="app-backdrop" onClick={handleClose}></div>
      
      {/* Holographic Grid Animation */}
      <div className="hologram-grid-container">
        <div className="hologram-grid horizontal-grid"></div>
        <div className="hologram-grid vertical-grid"></div>
        <div className="hologram-scan-effect"></div>
        <div className="hologram-corners">
          <div className="corner top-left"></div>
          <div className="corner top-right"></div>
          <div className="corner bottom-right"></div>
          <div className="corner bottom-left"></div>
        </div>
      </div>
      
      {/* App Container */}
      <div className="app-container">
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
        
        {/* App Header */}
        <div className="app-header">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center panel-icon-premium">
              <img src={app.icon} alt={app.name} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg text-blue-300 font-light tracking-wider">{app.name}</h2>
              <div className="text-xs text-blue-500/70">{app.category}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Jarvis Voice Assistant Button */}
            <div 
              className={`app-jarvis-button w-[42px] h-[42px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                micActive 
                  ? 'mic-active voice-active' 
                  : connectionState === "connecting" 
                    ? 'mic-connecting' 
                    : 'mic-inactive'
              }`}
              onClick={toggleMic}
            >
              <div className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center ${micActive ? 'mic-active-inner' : connectionState === "connecting" ? 'mic-connecting-inner' : 'mic-inactive-inner'}`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="18" 
                  height="18" 
                  viewBox="0 0 20 20" 
                  fill="none" 
                  stroke="currentColor" 
                  className={`text-blue-200 ${micActive ? 'opacity-100' : 'opacity-70'}`}
                >
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
                
                <div className="absolute inset-0 mic-inner-reflection pointer-events-none"></div>
                
                {connectionState === "connecting" && (
                  <div className="absolute inset-[-4px] rounded-full border-2 border-blue-500/30 border-t-blue-500/80 animate-spin"></div>
                )}
                
                {micActive && (
                  <VoiceVisualizer 
                    isActive={micActive} 
                    volume={voiceVolume} 
                  />
                )}
              </div>
              
              {micActive && (
                <>
                  <ReactiveRing
                    inset="-4px"
                    borderStyle="1px solid rgba(59, 130, 246, 0.6)"
                    volume={voiceVolume}
                    delay={0.1}
                    baseOpacity={0.7}
                    volumeImpact={0.25}
                  />
                  <ReactiveRing
                    inset="-10px"
                    borderStyle="1px solid rgba(59, 130, 246, 0.4)"
                    volume={voiceVolume}
                    delay={0.2}
                    baseOpacity={0.5}
                    volumeImpact={0.15}
                  />
                </>
              )}
            </div>
            
            {/* Close Button */}
            <div onClick={handleClose} className="app-close-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
          </div>
        </div>
        
        {/* App Content */}
        <div className="app-content">
          {AppComponent ? <AppComponent onClose={handleClose} /> : (
            <div className="flex items-center justify-center h-full">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
          {/* Jarvis Response */}
        {responseVisible && (
          <div className="jarvis-in-app-response">
            <AIResponse text={aiResponse} context="in-app" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AppContainer;
