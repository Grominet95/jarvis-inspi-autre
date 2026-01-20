import React, { useState, useEffect, useRef, useMemo } from 'react';
import AppCarousel from './components/AppCarousel';
import OnscreenKeyboard from './components/OnscreenKeyboard';
import AIResponse from './components/AIResponse';
import SettingsPanel from './components/SettingsPanel';
import NotificationSystem from './components/NotificationSystem';
// import AppContainer from './components/AppContainer';
import AppWindow from './components/AppWindow';
import IntroScreen from './components/IntroScreen';
import TextChatPanel from './components/TextChatPanel';
import DesktopManager from './components/DesktopManager';
import DocumentViewer from './components/DocumentViewer';
import ImageViewer from './components/ImageViewer';
import imageService from './services/imageService';
import holomatButtonImg from './assets/buttons/holomat_button.png';
import trashButtonImg from './assets/buttons/trash.png';
import trashOpenButtonImg from './assets/buttons/trash_open.png';
import realtimeVoiceService from './services/realtimeVoiceService';
import audioAnalyzerService from './services/audioAnalyzerService';
import wakeWordService from './services/wakeWordService';
import VoiceVisualizer from './components/VoiceVisualizer';
import ReactiveRing from './components/ReactiveRing';
import { apps } from './data/apps';
import settingsService from './services/settingsService';
// import appLaunchService from './services/appLaunchService';
import soundService from './services/soundService';
import gridService from './services/gridService';
import functionManagerService from './functions/functionManagerService';
import * as functionHandlers from './functions/functionHandlers';
import { InchesRulerOverlay, AnglesProtractorOverlay, HardwareReferenceOverlay, MmRulerOverlay } from './components/GridOverlays';
import { useSettings } from './contexts/SettingsContext';
// Import consolidated styles instead of individual files
import './styles/main.css';
import './styles/intro-screen.css';
import './styles/holomat-button.css';

function App() {
  const { settings, settingsLoaded } = useSettings();
  const [showIntro, setShowIntro] = useState(true);
  const [systemTime, setSystemTime] = useState(new Date());
  const [windows, setWindows] = useState([]);
  const [nextWindowId, setNextWindowId] = useState(1);
  const [cpuLoad, setCpuLoad] = useState(42);
  const [memoryUsage, setMemoryUsage] = useState(3.2);
  const [networkSpeed, setNetworkSpeed] = useState(215);
  const [micActive, setMicActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  // const [wakeWordActive, setWakeWordActive] = useState(false);
  const [micToggleLocked, setMicToggleLocked] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [responseVisible, setResponseVisible] = useState(false);
  const [connectionState, setConnectionState] = useState("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  // const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [activeTool, setActiveTool] = useState(null); // measure | keyboard | sketch
  const [holomatPressed, setHolomatPressed] = useState(false);
  const [trashHover, setTrashHover] = useState(false);
  const [trayCollapsed, setTrayCollapsed] = useState(false);
  const [documentViewer, setDocumentViewer] = useState({
    isVisible: false,
    title: '',
    content: '',
    sources: []
  });
  const [imageViewer, setImageViewer] = useState({
    isVisible: false,
    imageData: null,
    originalPrompt: '',
    revisedPrompt: ''
  });
  const keyboardRef = useRef(null);
  const volumeThreshold = 0.05; // Threshold to detect speech
  const inactiveSpeechTimeout = useRef(null);
  const outlineRef = useRef(null);

  // Subscribe to realtime text streaming for bubble UI
  useEffect(() => {
    const onDelta = (e) => {
      setBubbleVisible(true);
      setBubbleText((prev) => (prev + String(e.detail)));
    };
    const onEnd = () => {
      // Keep bubble for a moment, then hide
      setTimeout(() => {
        setBubbleVisible(false);
        setBubbleText("");
      }, 900);
    };
    const handleDesktopFileDrag = (event) => {
      setTrashHover(event.detail.nearTrash);
    };

    window.addEventListener('voice-text-delta', onDelta);
    window.addEventListener('voice-text-end', onEnd);
    window.addEventListener('desktop-file-drag', handleDesktopFileDrag);
    return () => {
      window.removeEventListener('voice-text-delta', onDelta);
      window.removeEventListener('voice-text-end', onEnd);
      window.removeEventListener('desktop-file-drag', handleDesktopFileDrag);
    };
  }, []);

  // Document viewer event listener
  useEffect(() => {
    const handleOpenDocumentViewer = (event) => {
      setDocumentViewer({
        isVisible: true,
        title: event.detail.title,
        content: event.detail.content,
        sources: event.detail.sources || []
      });
    };

    window.addEventListener('open-document-viewer', handleOpenDocumentViewer);
    
    return () => {
      window.removeEventListener('open-document-viewer', handleOpenDocumentViewer);
    };
  }, []);

  // Image viewer event listeners
  useEffect(() => {
    const handleOpenImageViewer = (event) => {
      setImageViewer({
        isVisible: true,
        imageData: null, // Reset image data
        originalPrompt: event.detail.prompt,
        revisedPrompt: ''
      });
    };

    const handleImageUpdate = (event) => {
      setImageViewer(prev => ({
        ...prev,
        imageData: event.detail,
        revisedPrompt: event.detail.revisedPrompt || prev.revisedPrompt
      }));
    };

    const handleCloseImageViewer = () => {
      setImageViewer({
        isVisible: false,
        imageData: null,
        originalPrompt: '',
        revisedPrompt: ''
      });
    };

    window.addEventListener('open-image-viewer', handleOpenImageViewer);
    window.addEventListener('image-generation-update', handleImageUpdate);
    window.addEventListener('close-image-viewer', handleCloseImageViewer);
    
    return () => {
      window.removeEventListener('open-image-viewer', handleOpenImageViewer);
      window.removeEventListener('image-generation-update', handleImageUpdate);
      window.removeEventListener('close-image-viewer', handleCloseImageViewer);
    };
  }, []);

  // Clean up console.log statements in production
  const logInfo = (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, data);
    }
  };

  // Long-press functionality for mute toggle
  const longPressTimeout = useRef(null);
  const isLongPressing = useRef(false);

  const handleMouseDown = () => {
    setHolomatPressed(true);
    isLongPressing.current = false;
    longPressTimeout.current = setTimeout(() => {
      isLongPressing.current = true;
      toggleMute();
    }, 2000); // 2 seconds for long press
  };

  const handleMouseUp = () => {
    setHolomatPressed(false);
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    
    // Only trigger regular click if it wasn't a long press and not muted
    if (!isLongPressing.current && !micMuted && !micToggleLocked) {
      // Additional check to prevent rapid toggling during cooldowns
      if (connectionState !== "connecting") {
        toggleMic();
      }
    }
  };

  const handleMouseLeave = () => {
    setHolomatPressed(false);
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    isLongPressing.current = false;
  };

  // Toggle mute functionality
  const toggleMute = () => {
    const newMutedState = !micMuted;
    setMicMuted(newMutedState);
    
    if (newMutedState) {
      // If muting, stop the microphone if active
      if (micActive) {
        toggleMic();
      }
      logInfo("🔇 Microphone muted - wake word detection disabled");
    } else {
      logInfo("🔊 Microphone unmuted - wake word detection enabled");
    }
  };

  // Enhanced toggleMic with voice assistant integration
  const toggleMic = async () => {
    // Prevent multiple rapid calls
    if (micToggleLocked) {
      logInfo("Microphone toggle locked, ignoring call");
      return;
    }
    
    setMicToggleLocked(true);
    
    const newMicState = !micActive;
    
    if (newMicState) {
      // Starting voice session - pause wake word service longer to prevent interference
      wakeWordService.pauseListening(3000); // 3 second pause - reduced for better responsiveness
      
      setOutlineVisible(true);
      
      requestAnimationFrame(() => {
        if (outlineRef.current) {
          outlineRef.current.classList.remove('outline-active', 'outline-pulsing', 'outline-retracting', 'step-2', 'step-3');
          void outlineRef.current.offsetWidth;
          outlineRef.current.classList.add('outline-active');
          setTimeout(() => {
            if (outlineRef.current) {
              outlineRef.current.classList.add('outline-pulsing');
            }
          }, 1300);
        }
      });
        setConnectionState("connecting");
      
      // Set up function call handler
      realtimeVoiceService.setFunctionCallCallback(handleFunctionCall);
      
      try {
        const settings = await settingsService.loadSettings();
        
        logInfo("Using voice settings:", {
          model: settings.voiceModel,
          voice: settings.voiceType,
          prompt: settings.systemPrompt
        });
          const success = await realtimeVoiceService.startVoiceAssistant(
          {
            model: settings.voiceModel,
            initial_prompt: settings.systemPrompt + " You can launch applications by calling the launch_app function when users request to open or launch specific apps like 'open the calendar app' or 'launch the file explorer'.",
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
            startRetractionAnimation();
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to start voice assistant:', error);
        setConnectionState("error");
        setTimeout(() => {
          startRetractionAnimation();
        }, 1000);
      }
    } else {
      // User manually stopping - pause wake word service to prevent immediate restart
      logInfo("User manually stopping voice session");
      wakeWordService.pauseListening(2000); // 2 second cooldown as requested
      
      setMicActive(false);
      setConnectionState("idle");
      await realtimeVoiceService.stopVoiceAssistant();
      startRetractionAnimation();
    }
    
    // Release the lock after a delay to prevent rapid toggling
    setTimeout(() => {
      setMicToggleLocked(false);
    }, 2000);
  };
  
  const startRetractionAnimation = () => {
    if (!outlineRef.current) return;
    
    outlineRef.current.classList.remove('outline-active', 'outline-pulsing');
    outlineRef.current.classList.add('outline-retracting');
    
    setTimeout(() => {
      if (!outlineRef.current) return;
      outlineRef.current.classList.add('step-2');
      
      setTimeout(() => {
        if (!outlineRef.current) return;
        outlineRef.current.classList.add('step-3');
        
        setTimeout(() => {
          if (!outlineRef.current) return;
          outlineRef.current.classList.remove('outline-active', 'outline-pulsing', 'outline-retracting', 'step-2', 'step-3');
          setOutlineVisible(false);
          if (!micActive) {
            setResponseVisible(false);
            setTimeout(() => setAiResponse(''), 400);
          }
        }, 700);
      }, 500);  
    }, 500);
  };
  const handleResponse = (response) => {
    if (response.type === 'text') {
      const text = String(response.content || '');
      setAiResponse(text);
      setBubbleVisible(true);
      setBubbleText((prev) => prev ? prev + text : text);
      // safety debounce auto-hide
      if (window.__bubbleHideTimer) clearTimeout(window.__bubbleHideTimer);
      window.__bubbleHideTimer = setTimeout(() => {
        setBubbleVisible(false);
        setBubbleText("");
      }, 2000);
    }
  };  const handleFunctionCall = async (functionName, args, callId) => {
    logInfo(`Function call received: ${functionName}`, args);
    
    try {
      // Get function definition from our dynamic function system
      const functionDef = functionManagerService.getFunction(functionName);
      
      if (!functionDef) {
        const errorResult = {
          success: false,
          message: `Unknown function: ${functionName}`
        };
        realtimeVoiceService.sendFunctionCallResult(callId, errorResult);
        setAiResponse(errorResult.message);
        return;
      }
      
      let result;
      
      // Execute function based on handler type
      switch (functionName) {
        case 'launch_app': {
          const appNameRaw = args.app_name || '';
          const nameLc = String(appNameRaw).toLowerCase().trim();
          const foundApp = apps.find(a => a.name.toLowerCase() === nameLc)
            || apps.find(a => a.componentPath.toLowerCase().includes(nameLc));
          if (foundApp) {
            setWindows(prev => [
              ...prev,
              {
                id: nextWindowId,
                app: foundApp,
                x: Math.max(12, window.innerWidth / 2 - 360),
                y: Math.max(12, window.innerHeight / 2 - 200),
                z: (prev.length ? Math.max(...prev.map(w => w.z)) + 1 : 100)
              }
            ]);
            setNextWindowId(id => id + 1);
            result = { success: true, message: `Launched ${foundApp.name}` };
            // Optional: do not force-stop mic here to keep flow responsive
          } else {
            result = { success: false, message: `App not found: ${appNameRaw}` };
          }
          break;
        }
            case 'set_volume':
          result = await functionHandlers.setSystemVolume(args);
          break;
          
        case 'search_web':
          result = await functionHandlers.searchWeb(args);
          break;
          
        case 'generate_image':
          result = await functionHandlers.generateImage(args);
          break;
          
        case 'take_screenshot':
          result = await functionHandlers.takeScreenshot(args);
          break;
          
        case 'send_notification':
          result = await functionHandlers.showNotification(args);
          break;
          
        case 'get_system_info':
          result = await functionHandlers.getSystemInfo(args);
          break;
            case 'control_music':
          result = await functionHandlers.controlMusic(args);
          break;
          
        case 'create_calendar_event':
          result = await functionHandlers.createCalendarEvent(args);
          break;
          
        case 'check_calendar':
          result = await functionHandlers.checkCalendarEvents(args);
          break;
          
        case 'delete_calendar_event':
          result = await functionHandlers.deleteCalendarEvent(args);
          break;
          
        default:
          result = {
            success: false,
            message: `Function handler not implemented: ${functionName}`
          };
      }
      
      // Send result back to the voice assistant
      realtimeVoiceService.sendFunctionCallResult(callId, result);
      
      // Provide voice feedback
      setAiResponse(result.message);
      
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      const errorResult = {
        success: false,
        message: `Failed to execute ${functionName}: ${error.message}`
      };
      realtimeVoiceService.sendFunctionCallResult(callId, errorResult);
      setAiResponse(errorResult.message);
    }
  };

  const handleError = (errorMessage) => {
    logInfo("Voice assistant error:", errorMessage);
    
    if (window.notify) {
      window.notify({
        title: 'Connection Failed',
        message: errorMessage,
        type: 'error',
        duration: 8000
      });
    }
  };

  const handleVolumeChange = (volume) => {
    const scaledVolume = Math.min(volume * 1.2, 1);
    setVoiceVolume(scaledVolume);
    
    if (volume > volumeThreshold) {
      // setIsUserSpeaking(true);
      
      if (inactiveSpeechTimeout.current) {
        clearTimeout(inactiveSpeechTimeout.current);
      }
      
      inactiveSpeechTimeout.current = setTimeout(() => {
        // setIsUserSpeaking(false);
      }, 300);
    }
  };

  useEffect(() => {
    if (micActive) {
      logInfo("Setting up voice visualization");
      
      realtimeVoiceService.setMediaStreamCallback((mediaStream) => {
        if (mediaStream) {
          logInfo("Media stream available, initializing analyzer");
          const success = audioAnalyzerService.initAnalyzer(mediaStream, handleVolumeChange);
          if (!success) {
            console.error("Failed to initialize audio analyzer");
          }
        } else {
          console.error("No media stream available for visualization");
        }
      });
    } else {
      audioAnalyzerService.stopAnalyzing();
      setVoiceVolume(0);
      // setIsUserSpeaking(false);
      
      if (inactiveSpeechTimeout.current) {
        clearTimeout(inactiveSpeechTimeout.current);
        inactiveSpeechTimeout.current = null;
      }
    }
    
    return () => {
      audioAnalyzerService.stopAnalyzing();
      
      if (inactiveSpeechTimeout.current) {
        clearTimeout(inactiveSpeechTimeout.current);
        inactiveSpeechTimeout.current = null;
      }
    };
  }, [micActive]);

  // Removed starfield/particle generators for the new workspace background

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date());

      setCpuLoad(prev => {
        const target = Math.floor(Math.random() * 25) + 30;
        return prev + (target - prev) * 0.3;
      });
      setMemoryUsage(prev => {
        const target = Math.random() * 1.5 + 2.5;
        return +(prev + (target - prev) * 0.3).toFixed(1);
      });
      setNetworkSpeed(prev => {
        const target = Math.floor(Math.random() * 100) + 180;
        return Math.round(prev + (target - prev) * 0.3);
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Allow internal apps to request opening another app with props via CustomEvent
  useEffect(() => {
    const handler = (e) => {
      try {
        const detail = e.detail || {};
        const name = String(detail.name || '').toLowerCase();
        const appToOpen = apps.find(a => a.name.toLowerCase() === name) || apps.find(a => a.componentPath.toLowerCase().includes(name));
        if (!appToOpen) return;
        setWindows(prev => [
          ...prev,
          {
            id: nextWindowId,
            app: appToOpen,
            x: Math.max(12, window.innerWidth / 2 - 360),
            y: Math.max(12, window.innerHeight / 2 - 200),
            z: (prev.length ? Math.max(...prev.map(w => w.z)) + 1 : 100),
            props: detail.props || undefined
          }
        ]);
        setNextWindowId(id => id + 1);
      } catch (err) {
        console.error('open-app handler error', err);
      }
    };
    window.addEventListener('open-app', handler);
    return () => window.removeEventListener('open-app', handler);
  }, [nextWindowId]);

  // TEMPORARILY DISABLED: Initialize wake word service
  // This entire section is disabled to prevent microphone permission requests on devices without mics
  // useEffect(() => {
  //   // Set up wake word detection callback
  //   wakeWordService.setWakeWordCallback(() => {
  //     // Multiple robust checks to prevent unwanted triggering
  //     logInfo("Wake word callback triggered - checking conditions...");
  //     logInfo("Current state:", { micMuted, micActive, micToggleLocked, connectionState });
  //     
  //     if (micMuted) {
  //       logInfo("Microphone is muted, ignoring wake word");
  //       return;
  //     }
  //     
  //     if (micActive) {
  //       logInfo("Microphone already active, ignoring wake word");
  //       return;
  //     }
  //     
  //     if (micToggleLocked) {
  //       logInfo("Microphone toggle locked, ignoring wake word");
  //       return;
  //     }
  //     
  //     if (connectionState !== "idle") {
  //       logInfo("Connection not idle, ignoring wake word");
  //       return;
  //     }
  //     
  //     // Additional delay to ensure state is properly updated
  //     setTimeout(() => {
  //       // Re-check conditions after delay
  //       if (!micMuted && !micActive && !micToggleLocked && connectionState === "idle") {
  //         logInfo("✅ Wake word conditions met - activating microphone");
  //         toggleMic();
  //       } else {
  //         logInfo("❌ Wake word conditions not met after delay - ignoring");
  //       }
  //     }, 200);
  //   });

  //   // Set up wake word status callback
  //   wakeWordService.setStatusCallback((status, message) => {
  //     // setWakeWordActive(status === 'listening');
  //     if (status === 'triggered') {
  //       logInfo(`Wake word triggered: ${message}`);
  //     }
  //   });

  //   // TEMPORARILY DISABLED: Start wake word listening automatically
  //   // This was causing white page on devices without microphones
  //   // wakeWordService.startListening().catch(error => {
  //   //   console.error("Failed to start wake word listener:", error);
  //   // });

  //   // Cleanup on unmount
  //   return () => {
  //     wakeWordService.destroy();
  //   };
  // }, []); // Remove dependencies to prevent re-initialization

  // TEMPORARILY DISABLED: Handle mute state changes
  // useEffect(() => {
  //   wakeWordService.setMuted(micMuted);
  // }, [micMuted]);

  const formattedTime = systemTime.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = systemTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Hide Keyboard app from tray; feature will run globally when enabled
  const enhancedApps = apps.filter(a => a.name !== 'Keyboard');

  const toggleSettings = () => {
    console.log('Settings button clicked! Current state:', settingsOpen);
    if (!settingsOpen) {
      // Only play sound when opening settings, not closing
      soundService.playSettingsOpen();
    }
    setSettingsOpen(!settingsOpen);
    console.log('Settings state changed to:', !settingsOpen);
  };
  
  // Get current grid styles with proper memoization
  const gridStyles = useMemo(() => {
    if (settings && settingsLoaded) {
      gridService.setMmPerPixel(settings.mmPerPixel || 0.265);
      gridService.setBackgroundGrid(settings.backgroundGrid || '10mm');
      gridService.setOverlayTool(settings.overlayTool || 'none');
      gridService.setBackgroundGradient(settings.backgroundGradient || false);
      gridService.setColorTheme(settings.overlayTheme || 'cyber');
      return gridService.getCurrentGridStyles();
    }
    return gridService.getCurrentGridStyles();
  }, [settings?.mmPerPixel, settings?.backgroundGrid, settings?.overlayTool, settings?.backgroundGradient, settings?.overlayTheme, settingsLoaded]);

  // Removed legacy overlay launch handlers
  return (
    <div 
      className="min-h-screen bg-black text-white flex flex-col relative"
      style={{
        ...gridStyles
      }}
    >
      {/* Intro Screen */}
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}
      
      <NotificationSystem />
      
      {/* Grid overlays - now separate from background */}
      {settings && settingsLoaded && gridService.shouldShowInchesRuler() && (
        <InchesRulerOverlay mmPerPixel={settings.mmPerPixel || 0.265} />
      )}
      {settings && settingsLoaded && gridService.shouldShowMmRuler() && (
        <MmRulerOverlay mmPerPixel={settings.mmPerPixel || 0.265} />
      )}
      {settings && settingsLoaded && gridService.shouldShowProtractor() && (
        <AnglesProtractorOverlay />
      )}
      {settings && settingsLoaded && gridService.shouldShowHardwareReference() && (
        <HardwareReferenceOverlay mmPerPixel={settings.mmPerPixel || 0.265} />
      )}
      
      {/* Global pointer zone for app opening - now handled by AppCarousel onPointerOpen */}
      
      {/* App windows */}
      {windows.map(w => (
        <AppWindow
          key={w.id}
          windowId={w.id}
          app={w.app}
          initialX={w.x}
          initialY={w.y}
          zIndex={w.z}
          appProps={w.props}
          onClose={(id) => setWindows(prev => prev.filter(win => win.id !== id))}
          onActivate={(id) => setWindows(prev => {
            const maxZ = Math.max(...prev.map(win => win.z), 0);
            return prev.map(win => win.id === id ? { ...win, z: maxZ + 1 } : win);
          })}
        />
      ))}
      
      {/* Desktop Files */}
      <DesktopManager />
      
      {/* Legacy selection overlay removed */}
      
      <svg style={{position: 'absolute', width: 0, height: 0}}>
        <filter id="glow">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="1.5" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      
      <div 
        ref={outlineRef} 
        className={`screen-outline ${outlineVisible ? 'visible' : 'hidden'}`}
      >
        <div className="outline-segment outline-horizontal outline-top">
          {outlineVisible && (
            <>
              {/* Top particles moving left to right (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal',
                animationDuration: '1.8s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal',
                animationDuration: '2.5s',
                animationDelay: '0.3s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal',
                animationDuration: '2.2s',
                animationDelay: '0.7s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-segment outline-vertical outline-right">
          {outlineVisible && (
            <>
              {/* Right particles moving top to bottom (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical',
                animationDuration: '2.5s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical',
                animationDuration: '2.0s',
                animationDelay: '0.4s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-segment outline-horizontal outline-bottom">
          {outlineVisible && (
            <>
              {/* Bottom particles moving right to left (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal-reverse',
                animationDuration: '2.2s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-horizontal-reverse',
                animationDuration: '3.5s',
                animationDelay: '0.7s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
        
        <div className="outline-segment outline-vertical outline-left">
          {outlineVisible && (
            <>
              {/* Left particles moving bottom to top (clockwise) */}
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical-reverse',
                animationDuration: '2.8s',
                animationIterationCount: 'infinite'
              }}></div>
              <div className="outline-particle" style={{
                animationName: 'move-particle-vertical-reverse',
                animationDuration: '2.3s',
                animationDelay: '0.5s',
                animationIterationCount: 'infinite'
              }}></div>
            </>
          )}
        </div>
      </div>
      
      
      <div className={`fixed right-6 top-6 pointer-events-auto transition-all duration-500 ${chatExpanded ? 'z-40 opacity-60 scale-95' : 'z-[70] opacity-100 scale-100'}`}>
        <div className="flex flex-col items-end space-y-3">
          <div className="w-48 h-auto panel-premium rounded p-4 pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
              <div className="text-blue-300/80 text-sm">{formattedDate}</div>
              <div className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-500/80 rounded-full animate-pulse mr-1.5"></div>
                <div className="text-blue-300/60 text-xs">SYNCED</div>
              </div>
            </div>
            <div className="text-3xl text-blue-100 tracking-wide text-center">
              {formattedTime.split(':').slice(0, 2).join(':')}
              <span className="text-blue-400/60 text-base ml-1">{formattedTime.split(':')[2]}</span>
            </div>
            <div className="h-px w-full bg-blue-500/10 my-3"></div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400/60">CPU LOAD</span>
                  <span className="text-blue-300">{Math.round(cpuLoad)}%</span>
                </div>
                <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/50 rounded-full" style={{width: `${cpuLoad}%`}}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400/60">MEMORY</span>
                  <span className="text-blue-300">{memoryUsage}GB</span>
                </div>
                <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400/50 rounded-full" style={{width: `${(memoryUsage/8)*100}%`}}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400/60">NETWORK</span>
                  <span className="text-blue-300">{networkSpeed} KB/s</span>
                </div>
                <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400/50 rounded-full" style={{width: `${(networkSpeed/500)*100}%`}}></div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mt-4">
              <button 
                className={`w-36 h-12 rounded-3xl bg-blue-900/30 flex items-center justify-center text-blue-300 hover:bg-blue-800/40 transition-all duration-300 ${settingsOpen ? 'bg-blue-800/60 shadow-lg shadow-blue-900/50 border border-blue-400/20' : 'border border-blue-500/10'} cursor-pointer z-[100] relative`}
                onClick={toggleSettings}
                style={{ pointerEvents: 'auto' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <span className="text-sm tracking-wider">SETTINGS</span>
              </button>
            </div>
          </div>
          {/* AI Text Chat Panel positioned just below the info tray */}
          <div className="pointer-events-auto pt-4 z-[60] relative">
            <div className="pointer-events-auto">
              <TextChatPanel onExpandedChange={setChatExpanded} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col min-h-screen relative z-10">
        <header className="pt-6 pb-2"></header>
        
        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl relative">
            
            
            
            {/* HoloMat button in bottom-right */}
            <div className="fixed z-40" style={{ bottom: '18px', right: '18px' }}>
              {/* Live speech bubble */}
              {bubbleVisible && (
                <div className="absolute" style={{ right: '90px', bottom: '72px' }}>
                  <div className="relative max-w-[320px] rounded-2xl border border-blue-400/30 bg-blue-900/30 text-white px-3 py-2 pr-8 shadow-2xl backdrop-blur-sm">
                    {bubbleText}
                    {/* Close button */}
                    <button 
                      onClick={() => {
                        setBubbleVisible(false);
                        setBubbleText("");
                        if (window.__bubbleHideTimer) clearTimeout(window.__bubbleHideTimer);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-blue-300 hover:text-white hover:bg-blue-400/20 rounded-full transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="w-3 h-3 rotate-45 -mt-1 ml-auto mr-6 bg-blue-900/30 border-r border-b border-blue-400/30" />
                </div>
              )}
              {/* Status text above button */}
              <div className="absolute -top-8 right-6 text-right">
                <div className={`flex items-center justify-end ${
                  micActive 
                    ? 'text-blue-300' 
                    : connectionState === "connecting"
                      ? 'text-blue-400/70' 
                      : connectionState === "error"
                        ? 'text-red-400/70'
                        : 'text-blue-500/40'
                }`}>
                  
                  {connectionState === "connecting" && (
                    <span className="tracking-wider font-light text-xs status-text">CONNECTING</span>
                  )}
                  {connectionState === "error" && (
                    <span className="tracking-wider font-light text-xs status-text">CONNECTION FAILED</span>
                  )}
                </div>
              </div>
              <div className="relative">
                <div 
                  className={`holomat-button w-[85px] h-[85px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                    holomatPressed ? 'pressed' : ''
                  } ${
                    micMuted
                      ? 'mic-muted'
                      : micActive 
                        ? 'mic-active voice-active' 
                        : connectionState === "connecting" 
                          ? 'mic-connecting' 
                          : 'mic-inactive'
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleMouseDown}
                  onTouchEnd={handleMouseUp}
                  onTouchCancel={handleMouseLeave}
                >
                  <div className={`relative w-full h-full rounded-full overflow-hidden flex items-center justify-center ${
                    micMuted 
                      ? 'mic-muted-inner' 
                      : micActive 
                        ? 'mic-active-inner' 
                        : connectionState === "connecting" 
                          ? 'mic-connecting-inner' 
                          : 'mic-inactive-inner'
                  }`}>
                    <img 
                      src={holomatButtonImg}
                      alt="HoloMat"
                      className={`w-20 h-20 object-cover transition-all duration-300 relative z-10 ${
                        micMuted 
                          ? 'brightness-75 saturate-50' 
                          : micActive 
                            ? 'brightness-110 saturate-110' 
                            : connectionState === "connecting" 
                              ? 'brightness-90 animate-pulse' 
                              : 'brightness-100'
                      }`}
                    />
                    
                    {micMuted && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-16 h-0.5 bg-red-500 rotate-45 shadow-lg"></div>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 mic-inner-reflection pointer-events-none"></div>
                    
                    {connectionState === "connecting" && (
                      <div className="absolute inset-[-8px] rounded-full border-2 border-blue-500/30 border-t-blue-500/80 animate-spin"></div>
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
                        inset="-6px"
                        borderStyle="2px solid rgba(59, 130, 246, 0.6)"
                        volume={voiceVolume}
                        delay={0.2}
                        baseOpacity={0.7}
                        volumeImpact={0.25}
                      />
                      <ReactiveRing
                        inset="-18px"
                        borderStyle="2px solid rgba(59, 130, 246, 0.5)"
                        volume={voiceVolume}
                        delay={0.4}
                        baseOpacity={0.6}
                        volumeImpact={0.2}
                      />
                      <ReactiveRing
                        inset="-30px"
                        borderStyle="1px solid rgba(59, 130, 246, 0.4)"
                        volume={voiceVolume}
                        delay={0.6}
                        baseOpacity={0.5}
                        volumeImpact={0.15}
                      />
                    </>
                  )}
                </div>
                
                {connectionState === "connecting" && (
                  <div className="absolute -bottom-2 flex space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
 
                {micActive && (
                  <>
                    <div className="absolute -top-5 -right-3 w-4 h-4 bg-blue-500/40 rounded-full blur-sm animate-pulse-slow"></div>
                    <div className="absolute -bottom-4 -left-2 w-3 h-3 bg-blue-500/40 rounded-full blur-sm animate-pulse-slow" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute top-3 -right-6 w-2 h-2 bg-blue-500/30 rounded-full blur-sm animate-pulse-slow" style={{animationDelay: '1s'}}></div>
                  </>
                )}
              </div>
            </div>
            
            {/* Trash button in bottom-left */}
            <div className="fixed z-40" style={{ bottom: '18px', left: '18px' }}>
              <div className="relative">
                <div 
                  className={`w-20 h-20 rounded-full bg-black/20 backdrop-blur-sm border flex items-center justify-center cursor-pointer transition-all duration-300 ${trashHover ? 'scale-105 border-2 border-red-400/50' : 'border border-blue-500/30 hover:border-blue-400/50'}`}
                  onPointerEnter={() => setTrashHover(true)}
                  onPointerLeave={() => setTrashHover(false)}
                >
                  <img 
                    src={trashHover ? trashOpenButtonImg : trashButtonImg} 
                    alt="Trash" 
                    className="w-18 h-18 object-cover rounded-full transition-all duration-200" 
                  />
                </div>
              </div>
            </div>
            
            {/* Bottom apps tray - centered to leave space for holomat and trash buttons */}
            <div 
              className={`fixed z-40 transition-transform duration-300 ease-in-out ${
                trayCollapsed ? 'transform translate-y-16' : 'transform translate-y-0'
              }`} 
              style={{ 
                left: '120px', 
                right: '120px', 
                bottom: '0'
              }}
            >
              {/* Collapse/Expand Arrow */}
              <div className="relative">
                <button
                  onClick={() => setTrayCollapsed(!trayCollapsed)}
                  className={`absolute left-1/2 transform -translate-x-1/2 w-6 h-3 flex items-center justify-center text-blue-300/60 hover:text-blue-200 transition-all duration-200 z-50 ${
                    trayCollapsed ? '-top-3' : '-top-3'
                  }`}
                  title={trayCollapsed ? 'Show Apps' : 'Hide Apps'}
                >
                  <svg 
                    className={`w-3 h-3 transition-transform duration-200 ${
                      trayCollapsed ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              <AppCarousel 
                apps={enhancedApps} 
                micActive={micActive} 
                mode="bottomBar" 
                onAppDragStart={() => {}}
                onPointerOpen={(app, clientX, clientY) => {
                  // Open a window at pointer coordinates (apply same offsets used by drop zone)
                  const x = clientX - 360;
                  const y = clientY - 80;
                  setWindows(prev => [
                    ...prev,
                    { id: nextWindowId, app, x: Math.max(12, x), y: Math.max(12, y), z: (prev.length ? Math.max(...prev.map(w => w.z)) + 1 : 100), props: undefined }
                  ]);
                  setNextWindowId(id => id + 1);
                }}
              />
            </div>
          </div>
        </main>
        
      </div>
      
      <div className="jarvis-container fixed bottom-24 right-24 z-50">
        {responseVisible && (
          <div className="relative max-w-sm bg-blue-900/20 backdrop-blur-sm border border-blue-400/30 px-4 py-3 text-white shadow-2xl" style={{ borderRadius: '16px 16px 0 16px' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
                <span className="text-xs text-blue-400 uppercase tracking-wider mr-3">JARVIS</span>
                <span className="text-sm text-white whitespace-nowrap">{aiResponse}</span>
              </div>
              <button 
                onClick={() => {
                  soundService.playAppClose();
                  setResponseVisible(false);
                  setAiResponse('');
                }}
                className="ml-3 w-5 h-5 flex items-center justify-center text-blue-300 hover:text-white hover:bg-blue-400/20 rounded-full transition-colors flex-shrink-0"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <SettingsPanel 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />

      {/* Global On-screen Keyboard overlay (double-click to spawn) */}
      {settingsLoaded && settings.enableToolMenu && (
        <OnscreenKeyboard 
          ref={keyboardRef} 
          onModeChange={(m) => setActiveTool(m)} 
          mmPerPixel={settings.mmPerPixel || 0.265}
        />
      )}
      {/* Active tool indicator and Clear button under chat */}
      {activeTool && (
        <div className="fixed right-6 top-[calc(6rem+220px)] z-[65] text-right pointer-events-auto">
          <div className="text-blue-300/80 text-xs mb-2">Tool: {activeTool}</div>
          <button
            className="px-3 py-1 text-xs rounded bg-blue-900/40 text-blue-200 border border-blue-500/30 hover:bg-blue-800/40"
            onClick={() => { keyboardRef.current?.clearArtifacts?.(); setActiveTool(null); }}
          >CLEAR</button>
        </div>
      )}

      {/* Document Viewer */}
      <DocumentViewer
        isVisible={documentViewer.isVisible}
        title={documentViewer.title}
        content={documentViewer.content}
        sources={documentViewer.sources}
        onClose={() => setDocumentViewer(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Image Viewer */}
      <ImageViewer
        isVisible={imageViewer.isVisible}
        imageData={imageViewer.imageData}
        originalPrompt={imageViewer.originalPrompt}
        revisedPrompt={imageViewer.revisedPrompt}
        onClose={() => setImageViewer(prev => ({ ...prev, isVisible: false }))}
        onSaveToDesktop={(base64Data, prompt) => {
          imageService.saveImageToDesktop(base64Data, prompt);
        }}
        onDownload={(base64Data, prompt) => {
          imageService.downloadImage(base64Data, prompt);
        }}
      />
    </div>
  );
}

export default App;

// If you looked through all 900 lines of this file you're seriously a gooner
// and need to get a hobby or something.