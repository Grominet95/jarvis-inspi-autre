/**
 * Service for analyzing audio input and providing volume levels
 * Used for voice visualizations
 */
class AudioAnalyzerService {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.isAnalyzing = false;
    this.volumeCallback = null;
    this.animationFrame = null;
  }

  /**
   * Initialize the audio analyzer with a media stream
   * @param {MediaStream} mediaStream - The microphone input stream
   * @param {Function} volumeCallback - Callback that receives volume level (0-1)
   */
  initAnalyzer(mediaStream, volumeCallback) {
    if (!mediaStream || !volumeCallback) {
      console.error("Media stream and volume callback are required");
      return false;
    }

    try {
      // Clean up any previous instances
      this.stopAnalyzing();
      
      // Create audio context and analyzer
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyzer with more sensitive settings
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Connect media stream to analyzer
      const source = this.audioContext.createMediaStreamSource(mediaStream);
      source.connect(this.analyser);
      
      // Save callback function
      this.volumeCallback = volumeCallback;
      this.isAnalyzing = true;
      
      // Start analyzing
      this.analyzeVolume();
      
      return true;
    } catch (error) {
      console.error("Error initializing audio analyzer:", error);
      return false;
    }
  }

  /**
   * Continuously analyze volume and call the callback with the current level
   */
  analyzeVolume = () => {
    if (!this.isAnalyzing || !this.analyser || !this.dataArray) {
      return;
    }
    
    // Get volume data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume (0-255)
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    
    // Normalize to 0-1 range with amplification for better visual effect
    let normalizedVolume = Math.min(average / 128, 1);
    
    // Apply non-linear scaling for better visual response
    normalizedVolume = Math.pow(normalizedVolume, 0.6) * 1.5;
    
    // Send volume level to callback
    if (this.volumeCallback) {
      this.volumeCallback(normalizedVolume);
    }
    
    // Continue analyzing
    this.animationFrame = requestAnimationFrame(this.analyzeVolume);
  }

  /**
   * Stop analyzing audio
   */
  stopAnalyzing() {
    this.isAnalyzing = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.audioContext) {
      if (this.audioContext.state !== 'closed' && this.audioContext.close) {
        this.audioContext.close().catch(err => console.error("Error closing audio context:", err));
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.volumeCallback = null;
  }
}

const audioAnalyzerService = new AudioAnalyzerService();
export default audioAnalyzerService;
