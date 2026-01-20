/**
 * Wake Word Service - Continuously listens for "Jarvis" wake word
 * Uses Speech Recognition API to detect the wake word and trigger the main voice system
 */
import { logInfo, logError } from './serviceUtils';

class WakeWordService {
  constructor() {
    this.isListening = false;
    this.isMuted = false;
    this.recognition = null;
    this.wakeWordCallback = null;
    this.statusCallback = null;
    this.restartTimeout = null;
    this.consecutiveErrors = 0;
    this.maxErrors = 3;
    this.isPaused = false;
    this.pauseTimeout = null;
    this.lastTriggerTime = 0;
    this.triggerCooldown = 2000; // 2 second cooldown between triggers
    this.healthCheckInterval = null; // Health check timer
    this.lastHealthCheck = Date.now(); // Track last activity
    
    // Wake word patterns to detect
    this.wakeWords = [
      'jarvis',
      'jarvis.', 
      'jarvis!',
      'jarvis?',
      'jervis',  // Common mis-recognition
      'jarviss'  // Common mis-recognition
    ];
  }

  // Set callback for when wake word is detected
  setWakeWordCallback(callback) {
    this.wakeWordCallback = callback;
    logInfo("Wake word callback set");
  }

  // Set callback for status updates (listening/stopped/error)
  setStatusCallback(callback) {
    this.statusCallback = callback;
  }

  // Notify status change
  notifyStatus(status, message = '') {
    if (this.statusCallback) {
      this.statusCallback(status, message);
    }
  }

  // Initialize Speech Recognition
  async initializeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      logError('Speech Recognition API not supported in this browser');
      this.notifyStatus('error', 'Speech Recognition not supported');
      return false;
    }

    // Check microphone permissions first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Clean up immediately
      logInfo("Microphone permission granted for wake word detection");
    } catch (error) {
      logError("Microphone permission denied:", error);
      this.notifyStatus('error', `Microphone access denied: ${error.message}`);
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;

      this.setupRecognitionHandlers();
      logInfo("Speech Recognition initialized successfully");
      return true;
    } catch (error) {
      logError("Failed to initialize Speech Recognition:", error);
      this.notifyStatus('error', `Recognition initialization failed: ${error.message}`);
      return false;
    }
  }

  // Setup recognition event handlers
  setupRecognitionHandlers() {

    // Handle speech recognition results
    this.recognition.onresult = (event) => {
      if (this.isMuted || this.isPaused) return;
      
      // Update health check on any recognition activity
      this.updateHealthCheck();
      
      // Check cooldown to prevent rapid triggering
      const now = Date.now();
      if (now - this.lastTriggerTime < this.triggerCooldown) {
        return;
      }
      
      // Process all results for wake word detection
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // Check both final and interim results for responsiveness
        if (result.length > 0) {
          const transcript = result[0].transcript.toLowerCase().trim();
          
          // Check if any wake word is detected
          const wakeWordDetected = this.wakeWords.some(word => {
            return transcript.includes(word) || transcript.startsWith(word) || transcript.endsWith(word);
          });
          
          if (wakeWordDetected) {
            this.lastTriggerTime = now;
            logInfo(`Wake word detected: "${transcript}"`);
            this.notifyStatus('triggered', transcript);
            
            // Trigger the main voice system
            if (this.wakeWordCallback) {
              this.wakeWordCallback();
            }
            
            // Longer pause to avoid immediate re-triggering
            this.pauseListening(3000);
            break;
          }
        }
      }
    };

    // Handle recognition start
    this.recognition.onstart = () => {
      logInfo("Wake word listener started");
      this.notifyStatus('listening');
      this.consecutiveErrors = 0; // Reset error count on successful start
    };

    // Handle recognition end
    this.recognition.onend = () => {
      logInfo("Wake word listener ended");
      
      // Auto-restart if still supposed to be listening and not muted
      if (this.isListening && !this.isMuted && !this.isPaused) {
        // Clear any existing timeout first
        if (this.restartTimeout) {
          clearTimeout(this.restartTimeout);
        }
        
        // Use exponential backoff for restart attempts to avoid rapid failures
        const restartDelay = Math.min(500 * Math.pow(1.5, this.consecutiveErrors), 10000); // Max 10 seconds
        
        this.restartTimeout = setTimeout(() => {
          if (this.isListening && !this.isMuted && !this.isPaused) {
            logInfo(`Auto-restarting wake word listener (attempt ${this.consecutiveErrors + 1})`);
            try {
              this.recognition.start();
            } catch (error) {
              logError("Error restarting wake word listener:", error);
              this.consecutiveErrors++;
              
              // If too many restart failures, stop trying
              if (this.consecutiveErrors >= this.maxErrors) {
                logError("Too many restart failures, stopping wake word listener");
                this.stopListening();
                return;
              }
              
              // Try again after a longer delay
              setTimeout(() => {
                if (this.isListening && !this.isMuted && !this.isPaused) {
                  this.startListening().catch(err => logError("Retry start failed:", err));
                }
              }, 5000);
            }
          }
        }, restartDelay);
      } else {
        this.notifyStatus('stopped');
      }
    };

    // Handle recognition errors
    this.recognition.onerror = (event) => {
      logError("Wake word recognition error:", event.error);
      
      // Handle permission issues specifically
      if (event.error === 'not-allowed') {
        logError("Microphone permission denied. Wake word detection requires microphone access.");
        this.notifyStatus('error', 'Microphone permission denied');
        this.stopListening();
        return;
      }
      
      // Handle aborted errors (common when switching between recognition instances)
      if (event.error === 'aborted') {
        logInfo("Recognition aborted - this is normal during restarts");
        return; // Don't count as consecutive error
      }
      
      this.consecutiveErrors++;
      
      if (this.consecutiveErrors >= this.maxErrors) {
        logError("Too many consecutive errors, stopping wake word listener");
        this.notifyStatus('error', `Recognition failed: ${event.error}`);
        this.stopListening();
        return;
      }
      
      // For recoverable errors, try to restart with exponential backoff
      if (event.error === 'network' || event.error === 'audio-capture' || event.error === 'service-not-allowed') {
        const retryDelay = Math.min(2000 * Math.pow(2, this.consecutiveErrors - 1), 30000); // Max 30 seconds
        this.notifyStatus('error', `${event.error} - retrying in ${retryDelay/1000}s...`);
        setTimeout(() => {
          if (this.isListening && !this.isMuted) {
            this.startListening().catch(err => logError("Retry start failed:", err));
          }
        }, retryDelay);
      }
    };

    return true;
  }

  // Start wake word listening
  async startListening() {
    if (this.isMuted) {
      logInfo("Wake word listener is muted, not starting");
      return false;
    }
    
    if (this.isPaused) {
      logInfo("Wake word listener is paused, not starting");
      return false;
    }

    if (this.isListening && this.recognition) {
      // Check if recognition is actually running
      try {
        // If we're already supposed to be listening but recognition ended, restart it
        this.recognition.start();
        logInfo("Restarted existing wake word listener");
        return true;
      } catch (error) {
        // If already running, that's fine
        if (error.name === 'InvalidStateError') {
          logInfo("Wake word listener already active");
          return true;
        }
        logError("Error restarting recognition:", error);
      }
    }

    if (!this.recognition && !await this.initializeRecognition()) {
      logError("Failed to initialize recognition service");
      return false;
    }

    try {
      this.isListening = true;
      
      // Double-check recognition exists before starting
      if (!this.recognition) {
        logError("Recognition service is null, cannot start");
        this.isListening = false;
        return false;
      }
      
      this.recognition.start();
      
      // Start health monitoring
      this.startHealthCheck();
      
      logInfo("🎤 Wake word listener activated - listening for 'Jarvis'");
      return true;
    } catch (error) {
      // Handle the case where recognition is already running
      if (error.name === 'InvalidStateError') {
        logInfo("Wake word listener already running");
        this.isListening = true;
        return true;
      }
      
      logError("Error starting wake word listener:", error);
      this.isListening = false;
      this.notifyStatus('error', error.message);
      return false;
    }
  }

  // Stop wake word listening
  stopListening() {
    if (!this.isListening) {
      return true;
    }

    try {
      this.isListening = false;
      
      // Clear all timers
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Stop recognition
      if (this.recognition) {
        this.recognition.stop();
      }

      logInfo("🔇 Wake word listener deactivated");
      this.notifyStatus('stopped');
      return true;
    } catch (error) {
      logError("Error stopping wake word listener:", error);
      return false;
    }
  }

  // Temporarily pause listening for a specified duration
  pauseListening(duration = 1000) {
    logInfo(`🔇 Pausing wake word listener for ${duration}ms (isPaused: ${this.isPaused})`);
    
    this.isPaused = true;
    
    // Stop current recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        logError("Error stopping recognition during pause:", error);
      }
    }
    
    // Clear any existing timeouts
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
    }
    
    // Set new timeout to resume
    this.pauseTimeout = setTimeout(() => {
      this.isPaused = false;
      logInfo(`🔊 Wake word pause period ended, resuming... (isListening: ${this.isListening}, isMuted: ${this.isMuted})`);
      if (this.isListening && !this.isMuted) {
        logInfo("Resuming wake word listener after pause");
        try {
          this.recognition.start();
        } catch (error) {
          logError("Error resuming after pause:", error);
          // Fallback to full restart
          this.startListening().catch(err => logError("Restart after pause failed:", err));
        }
      }
    }, duration);
  }

  // Mute/unmute the wake word listener
  setMuted(muted) {
    const wasListening = this.isListening;
    this.isMuted = muted;
    
    if (muted) {
      logInfo("🔇 Wake word listener muted");
      if (wasListening) {
        this.stopListening();
      }
      this.notifyStatus('muted');
    } else {
      logInfo("🔊 Wake word listener unmuted");
      // Always restart when unmuting, regardless of previous state
      this.startListening().catch(error => {
        logError("Error starting wake word listener after unmute:", error);
      });
      this.notifyStatus('listening');
    }
  }

  // Get current status
  getStatus() {
    if (this.isMuted) return 'muted';
    if (this.isListening) return 'listening';
    return 'stopped';
  }

  // Check if currently listening
  isActive() {
    return this.isListening && !this.isMuted;
  }

  // Check if muted
  isMutedStatus() {
    return this.isMuted;
  }

  // Start health check monitoring
  startHealthCheck() {
    // Clear any existing health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.lastHealthCheck = Date.now();
    
    // Check every 30 seconds for stuck states
    this.healthCheckInterval = setInterval(() => {
      if (!this.isListening || this.isPaused || this.isMuted) {
        return;
      }
      
      const now = Date.now();
      const timeSinceLastCheck = now - this.lastHealthCheck;
      
      // If more than 60 seconds since last activity, restart service
      if (timeSinceLastCheck > 60000) {
        logInfo("Health check detected inactive state, restarting service...");
        this.restartService();
      }
      
      this.lastHealthCheck = now;
    }, 30000);
  }

  // Restart the entire service
  async restartService() {
    logInfo("🔄 Restarting wake word service for health recovery...");
    
    const wasListening = this.isListening;
    
    // Stop everything cleanly
    this.stopListening();
    
    // Wait before restart
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restart if we were previously listening
    if (wasListening && !this.isMuted) {
      this.startListening().catch(err => logError("Health restart failed:", err));
    }
  }

  // Update health check timestamp (call on any recognition activity)
  updateHealthCheck() {
    this.lastHealthCheck = Date.now();
  }

  // Cleanup
  destroy() {
    this.stopListening();
    
    // Clear all timeouts and intervals
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    
    if (this.pauseTimeout) {
      clearTimeout(this.pauseTimeout);
      this.pauseTimeout = null;
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.recognition) {
      this.recognition = null;
    }
    this.wakeWordCallback = null;
    this.statusCallback = null;
    this.isPaused = false;
    this.lastTriggerTime = 0;
  }
}

export default new WakeWordService();
