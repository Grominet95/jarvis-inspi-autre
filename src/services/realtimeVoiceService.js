/**
 * Voice service using WebRTC to connect directly to OpenAI's Realtime API
 * Based on the OpenAI realtime console implementation
 */
import { logInfo, logError, getFromStorage, saveToStorage } from './serviceUtils';
import functionManagerService from '../functions/functionManagerService';

class RealtimeVoiceService {
  constructor() {
    this.isActive = false;
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioElement = null;
    this.responseCallback = null;
    this.errorCallback = null;
    this.functionCallCallback = null;
    this.mediaStream = null;
    this.onMediaStreamReady = null;
    this.currentVoice = "echo"; // Default voice
    this.currentModel = "gpt-4o-mini-realtime-preview";
    this.currentSystemPrompt = "You are JARVIS, an AI assistant integrated with the HoloMat interface.";
    this.settingsUpdateListeners = [];
    
    // Get API key from localStorage using utility function
    this.apiKey = getFromStorage('openai_api_key', '');
  }

  // Set callback for function calls
  setFunctionCallCallback(callback) {
    this.functionCallCallback = callback;
  }

  // Get the media stream for audio visualization
  getMediaStream() {
    return this.mediaStream;
  }

  // Set callback for when media stream is ready
  setMediaStreamCallback(callback) {
    logInfo("Setting media stream callback");
    this.onMediaStreamReady = callback;
    
    // If we already have a media stream, call the callback immediately
    if (this.mediaStream && callback) {
      logInfo("Media stream already available, calling callback immediately");
      callback(this.mediaStream);
    } else if (!this.mediaStream) {
      logInfo("No media stream available yet, will call callback when ready");
    }
  }

  // Add a listener to be notified when settings change
  addSettingsUpdateListener(callback) {
    if (typeof callback === 'function') {
      this.settingsUpdateListeners.push(callback);
    }
  }

  // Remove a settings update listener
  removeSettingsUpdateListener(callback) {
    this.settingsUpdateListeners = this.settingsUpdateListeners.filter(cb => cb !== callback);
  }

  // Notify listeners about settings changes
  notifySettingsUpdated(settings) {
    this.settingsUpdateListeners.forEach(callback => {
      try {
        callback(settings);
      } catch (error) {
        logError("Error in settings update listener:", error);
      }
    });
  }

  // Set the API key
  setApiKey(newApiKey) {
    this.apiKey = newApiKey;
    saveToStorage('openai_api_key', newApiKey);
    logInfo("API key updated");
  }

  // Update settings while the voice assistant is running
  updateSettings(settings) {
    let requiresRestart = false;
    
    if (settings.voiceType && settings.voiceType !== this.currentVoice) {
      this.currentVoice = settings.voiceType;
      logInfo("Voice updated to:", this.currentVoice);
      
      // Just update voice through the data channel if active
      if (this.isActive) {
        this.sendSessionUpdate();
      }
    }
    
    if (settings.systemPrompt && settings.systemPrompt !== this.currentSystemPrompt) {
      this.currentSystemPrompt = settings.systemPrompt;
      logInfo("System prompt updated to:", this.currentSystemPrompt);
      // ALWAYS require restart for system prompt changes - that's the only way to apply them
      requiresRestart = true;
      
      // Add more visible logging about this
      logInfo("⚠️ System prompt changes require restarting the voice assistant");
    }
    
    if (settings.voiceModel && settings.voiceModel !== this.currentModel) {
      this.currentModel = settings.voiceModel;
      requiresRestart = true;
    }
    
    // Notify listeners about updates, including if restart is required
    if (requiresRestart) {
      this.notifySettingsUpdated({
        ...settings,
        requiresRestart: true
      });
    } else {
      this.notifySettingsUpdated(settings);
    }
  }
  // Start the voice assistant
  async startVoiceAssistant(options = {}, onResponse, onError) {
    if (this.isActive) {
      logInfo("Voice assistant is already active");
      return false;
    }

    // Store the settings from options
    this.currentVoice = options.voice || "echo";
    this.currentModel = options.model || "gpt-4o-mini-realtime-preview";
    this.currentSystemPrompt = options.initial_prompt || "You are JARVIS, an AI assistant integrated with the HoloMat interface.";
    
    // Validate voice parameter
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    if (!validVoices.includes(this.currentVoice)) {
      logError("Invalid voice specified:", this.currentVoice, "- defaulting to echo");
      this.currentVoice = "echo";
    }
    
    logInfo("🎙️ Using voice:", this.currentVoice);
    logInfo("🤖 Using model:", this.currentModel);
    logInfo("🧠 Using system prompt:", this.currentSystemPrompt);
    
    this.responseCallback = onResponse;
    this.errorCallback = onError;

    try {
      // Check for API key in localStorage
      const OPENAI_KEY = this.apiKey;
      
      if (!OPENAI_KEY) {
        throw new Error("No OpenAI API key found. Please add your API key in the settings.");
      }

      // Create a peer connection
      const pc = new RTCPeerConnection();
      this.peerConnection = pc;

      // Set up to play remote audio from the model
      this.audioElement = document.createElement("audio");
      this.audioElement.autoplay = true;
      pc.ontrack = (e) => (this.audioElement.srcObject = e.streams[0]);

      // Add local audio track for microphone input in the browser
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // Disable auto gain for better volume detection
        }
      });
      pc.addTrack(this.mediaStream.getTracks()[0]);
      
      // Notify about media stream availability
      logInfo("Media stream obtained, notifying callback if registered");
      if (this.onMediaStreamReady) {
        this.onMediaStreamReady(this.mediaStream);
      }

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");
      this.dataChannel = dc;

      // Add dataChannel event listeners
      this.setupDataChannelEvents();

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // HYBRID APPROACH: Only send model as URL parameter
      // Voice and system instructions will be sent via session.update immediately after connection
      const baseUrl = "https://api.openai.com/v1/realtime";
      
      // Debug what we're setting up
      logInfo("System prompt to be sent via session.update:", this.currentSystemPrompt);
      logInfo("Voice to be sent via session.update:", this.currentVoice);
      
      // Build URL with only the model (voice and instructions ignored by OpenAI in URL)
      let url = `${baseUrl}?model=${encodeURIComponent(this.currentModel)}`;
      
      logInfo("Using URL (model only):", url);
      
      // Make the API request with correct content type
      const sdpResponse = await fetch(url, {
        method: "POST",
        body: offer.sdp, // Send SDP directly as the body
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/sdp", // Correct content type for realtime API
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        logError("OpenAI API Error:", errorText);
        throw new Error(`Connection failed: ${errorText}`);
      }

      // Get the SDP response directly as text
      const sdpAnswerText = await sdpResponse.text();
      
      const answer = {
        type: "answer",
        sdp: sdpAnswerText,
      };
      
      await pc.setRemoteDescription(answer);
      
      this.isActive = true;
      return true;
    } catch (error) {
      logError("Error starting voice assistant:", error);
      if (this.errorCallback) {
        // Format the error for better display in notifications
        let errorMessage = error.message || "Unknown error";
        
        // Clean up JSON error messages for better display
        if (errorMessage.includes("{") && errorMessage.includes("}")) {
          try {
            const jsonStart = errorMessage.indexOf("{");
            const jsonPart = errorMessage.substring(jsonStart);
            const errorObj = JSON.parse(jsonPart);
            
            if (errorObj.error && errorObj.error.message) {
              errorMessage = `Connection failed: ${errorObj.error.message}`;
            }
          } catch (e) {
            // Keep original error message if parsing fails
          }
        }
        
        this.errorCallback(errorMessage);
      }
      this.stopVoiceAssistant();
      return false;
    }
  }
  // Set up data channel events
  setupDataChannelEvents() {
    if (!this.dataChannel) return;

    this.dataChannel.addEventListener("open", () => {
      logInfo("WebRTC data channel open");
      // Send combined session configuration with functions, voice, and instructions
      this.sendCombinedSessionConfig();
    });

    this.dataChannel.addEventListener("message", (e) => {
      try {
        const event = JSON.parse(e.data);
        
        // Log incoming events for debugging
        logInfo("Received event:", event);
        // Handle different event types from the server
        if (event.type === "session.created") {
          logInfo("🎉 Session created successfully:", event);
          if (event.session) {
            logInfo("📋 Session details:", {
              voice: event.session.voice,
              model: event.session.model,
              instructions: event.session.instructions ? event.session.instructions.substring(0, 100) + "..." : "None"
            });
          }
          // HYBRID APPROACH: Session is created, but our combined config should have already been sent
          // No need to send additional updates since we combined everything in one call
          logInfo("🎉 Session created, combined config already sent");
        } else if (event.type === "session.updated") {
          logInfo("✅ Session updated successfully:", event);
          if (event.session) {
            logInfo("📋 Updated session details:", {
              voice: event.session.voice,
              model: event.session.model,
              instructions: event.session.instructions ? event.session.instructions.substring(0, 100) + "..." : "None"
            });
            
            // Verify that our instructions were applied correctly
            if (event.session.instructions && event.session.instructions.includes("JARVIS")) {
              logInfo("✅ JARVIS instructions successfully applied!");
            } else {
              logError("❌ JARVIS instructions may not have been applied correctly");
              logError("Expected instructions containing 'JARVIS', got:", event.session.instructions);
            }
          }
        } else if (event.type === "response.text.done") {
          const text = event.text || "";
          if (text && this.responseCallback) {
            this.responseCallback({ type: "text", content: text });
          }
          try {
            if (text) {
              window.dispatchEvent(new CustomEvent('voice-text-delta', { detail: text }));
            }
            window.dispatchEvent(new CustomEvent('voice-text-end'));
          } catch {}
        } else if (event.type === "response.content_part.done" && event.part?.type === "text") {
          const text = event.part.text || "";
          if (text && this.responseCallback) {
            this.responseCallback({ type: "text", content: text });
          }
          try {
            if (text) {
              window.dispatchEvent(new CustomEvent('voice-text-delta', { detail: text }));
            }
          } catch {}
        } else if (event.type === 'response.output_text.delta') {
          try {
            const delta = event.delta || '';
            if (delta) {
              window.dispatchEvent(new CustomEvent('voice-text-delta', { detail: delta }));
            }
          } catch {}
        } else if (event.type === 'response.output_text.done' || event.type === 'response.completed' || event.type === 'response.output_audio.done') {
          try {
            window.dispatchEvent(new CustomEvent('voice-text-end'));
          } catch {}
        } else if (event.type === "response.function_call_arguments.done") {
          // Handle function call completion
          logInfo("Function call completed:", event);
          if (event.call_id && event.arguments && this.functionCallCallback) {
            try {
              const args = JSON.parse(event.arguments);
              this.functionCallCallback(event.name, args, event.call_id);
            } catch (parseError) {
              logError("Error parsing function call arguments:", parseError);
            }
          }
        } else if (event.type === "response.output_item.done" && event.item?.type === "function_call") {
          // Alternative function call handling for different API versions - only if not already handled
          logInfo("Function call item completed:", event);
          // Only handle this if we haven't already processed a function_call_arguments.done for this call_id
          if (event.item?.call_id && event.item?.arguments && this.functionCallCallback) {
            // Check if this is a duplicate by looking for the same call_id in recent logs
            // For now, we'll skip this alternative handler to prevent duplicates
            logInfo("Skipping duplicate function call handling via output_item.done");
          }
        }
      } catch (err) {
        logError("Error processing message:", err);
      }
    });

    this.dataChannel.addEventListener("close", () => {
      logInfo("WebRTC data channel closed");
      this.stopVoiceAssistant();
    });

    this.dataChannel.addEventListener("error", (error) => {
      logError("Data channel error:", error);
      if (this.errorCallback) this.errorCallback(`Communication error: ${error.message || "Unknown error"}`);
    });
  }  // Send combined session configuration with functions, voice, and instructions
  sendCombinedSessionConfig() {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      logInfo("Data channel not ready, can't send combined session config");
      return;
    }
    
    // Get all function schemas dynamically from functionManagerService
    const tools = functionManagerService.getFunctionSchema();
    
    // HYBRID APPROACH: Send everything in one session.update call
    const sessionConfig = {
      type: "session.update",
      session: {
        tools: tools,
        voice: this.currentVoice,
        instructions: this.currentSystemPrompt
      }
    };
    
    logInfo(`Sending combined session config with ${tools.length} functions, voice: ${this.currentVoice}, and JARVIS instructions:`, {
      voice: sessionConfig.session.voice,
      instructions: sessionConfig.session.instructions ? sessionConfig.session.instructions.substring(0, 100) + "..." : "None",
      tools: tools.map(t => t.name)
    });
    
    this.dataChannel.send(JSON.stringify(sessionConfig));
  }

  // Legacy method - keep for compatibility but now calls combined version
  sendSessionConfig() {
    this.sendCombinedSessionConfig();
  }

  // Send function call result back to the assistant
  sendFunctionCallResult(callId, result) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      logInfo("Data channel not ready, can't send function call result");
      return;
    }
    
    const functionResult = {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(result)
      }
    };
    
    logInfo("Sending function call result:", functionResult);
    this.dataChannel.send(JSON.stringify(functionResult));
    
    // Trigger response generation
    const responseCreate = {
      type: "response.create"
    };
    
    this.dataChannel.send(JSON.stringify(responseCreate));
  }

  // Keep a method to send voice updates if needed, but remove system instructions sending
  sendSessionUpdate() {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      logInfo("Data channel not ready, can't send session update");
      return;
    }
    
    // Send session.update with voice change (for live voice updates)
    const sessionUpdate = {
      type: "session.update",
      session: {
        voice: this.currentVoice
      }
    };
    
    logInfo("Sending session.update with voice change:", sessionUpdate);
    this.dataChannel.send(JSON.stringify(sessionUpdate));
  }

  // Send voice and system instructions immediately after session creation
  sendVoiceAndInstructionsUpdate() {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      logInfo("Data channel not ready, can't send voice and instructions update");
      return;
    }
    
    // Send session.update with both voice and system instructions
    // This is the hybrid approach: model via URL, voice+instructions via session.update
    const sessionUpdate = {
      type: "session.update",
      session: {
        voice: this.currentVoice,
        instructions: this.currentSystemPrompt
      }
    };
    
    logInfo("Sending session.update with voice and instructions:", {
      voice: sessionUpdate.session.voice,
      instructions: sessionUpdate.session.instructions ? sessionUpdate.session.instructions.substring(0, 100) + "..." : "None"
    });
    
    this.dataChannel.send(JSON.stringify(sessionUpdate));
  }

  // Stop the voice assistant
  async stopVoiceAssistant() {
    if (!this.isActive) return true;
    
    try {
      // Close data channel
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      // Stop all media tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.getSenders().forEach((sender) => {
          if (sender.track) {
            sender.track.stop();
          }
        });
        
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // Clean up audio
      if (this.audioElement) {
        if (this.audioElement.srcObject) {
          const tracks = this.audioElement.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          this.audioElement.srcObject = null;
        }
        this.audioElement = null;
      }

      this.isActive = false;
      return true;
    } catch (error) {
      logError("Error stopping voice assistant:", error);
      return false;
    }
  }
}

export default new RealtimeVoiceService();