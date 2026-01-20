// Sound Service for managing audio effects
class SoundService {
  constructor() {
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.5;
    this.currentlyPlaying = {}; // Track currently playing sounds
    
    // Preload common sounds from public directory
    const basePath = process.env.PUBLIC_URL || '';
    this.loadSound('app_close', `${basePath}/assets/SFX/app_close.mp3`);
    this.loadSound('click', `${basePath}/assets/SFX/click_sfx.wav`);
    this.loadSound('notification', `${basePath}/assets/SFX/notification.wav`);
    this.loadSound('settings_open', `${basePath}/assets/SFX/sfx_settings_open.mp3`);
    this.loadSound('intro', `${basePath}/assets/SFX/intro_sfx.mp3`);
    this.loadSound('loading', `${basePath}/assets/SFX/loading.mp3`);
    this.loadSound('select', `${basePath}/assets/SFX/select.mp3`);
  }
  
  loadSound(name, path) {
    try {
      console.log(`Loading sound: ${name} from ${path}`);
      const audio = new Audio(path);
      audio.preload = 'auto';
      audio.volume = this.volume;
      
      // Add event listeners to track loading
      audio.addEventListener('canplaythrough', () => {
        console.log(`Sound loaded successfully: ${name}`);
      });
      
      audio.addEventListener('error', (e) => {
        console.error(`Failed to load sound: ${name}`, e);
      });
      
      this.sounds[name] = audio;
    } catch (error) {
      console.warn(`Failed to load sound: ${name}`, error);
    }
  }
  
  play(soundName) {
    if (!this.enabled) {
      console.log(`Sound disabled, not playing: ${soundName}`);
      return;
    }
    
    const sound = this.sounds[soundName];
    if (sound) {
      try {
        console.log(`Attempting to play sound: ${soundName}`);
        console.log(`Sound readyState: ${sound.readyState}, volume: ${this.volume}`);
        
        // Clone the audio to allow multiple simultaneous plays
        const audioClone = sound.cloneNode();
        audioClone.volume = this.volume;
        
        // Track this sound instance
        if (!this.currentlyPlaying[soundName]) {
          this.currentlyPlaying[soundName] = [];
        }
        this.currentlyPlaying[soundName].push(audioClone);
        
        // Clean up when sound ends
        audioClone.addEventListener('ended', () => {
          this.removeFromCurrentlyPlaying(soundName, audioClone);
        });
        
        // Add more detailed error handling
        audioClone.play().then(() => {
          console.log(`✅ Sound played successfully: ${soundName}`);
        }).catch(error => {
          console.error(`❌ Failed to play sound: ${soundName}`, {
            error: error.message,
            name: error.name,
            readyState: audioClone.readyState,
            networkState: audioClone.networkState,
            src: audioClone.src
          });
          // Remove from tracking if failed to play
          this.removeFromCurrentlyPlaying(soundName, audioClone);
        });
      } catch (error) {
        console.error(`❌ Error playing sound: ${soundName}`, error);
      }
    } else {
      console.warn(`❌ Sound not found: ${soundName}`);
      console.log('Available sounds:', Object.keys(this.sounds));
      console.log('All sounds:', this.sounds);
    }
  }

  // Stop all instances of a specific sound
  stop(soundName) {
    if (this.currentlyPlaying[soundName]) {
      console.log(`Stopping all instances of sound: ${soundName}`);
      this.currentlyPlaying[soundName].forEach(audioInstance => {
        try {
          audioInstance.pause();
          audioInstance.currentTime = 0;
        } catch (error) {
          console.warn(`Error stopping sound instance: ${soundName}`, error);
        }
      });
      this.currentlyPlaying[soundName] = [];
    }
  }

  // Helper method to remove sound from tracking
  removeFromCurrentlyPlaying(soundName, audioInstance) {
    if (this.currentlyPlaying[soundName]) {
      const index = this.currentlyPlaying[soundName].indexOf(audioInstance);
      if (index > -1) {
        this.currentlyPlaying[soundName].splice(index, 1);
      }
    }
  }
  
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    Object.values(this.sounds).forEach(sound => {
      sound.volume = this.volume;
    });
  }
  
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  
  // Test method to verify sound system is working
  test() {
    console.log('Testing sound system...');
    console.log('Enabled:', this.enabled);
    console.log('Volume:', this.volume);
    console.log('Loaded sounds:', Object.keys(this.sounds));
    this.playAppClose();
  }
  
  // Specific sound methods for common actions
  playAppClose() {
    this.play('app_close');
  }
  
  playClick() {
    this.play('click');
  }
  
  playNotification() {
    this.play('notification');
  }
  
  playSettingsOpen() {
    this.play('settings_open');
  }
  
  playIntro() {
    this.play('intro');
  }

  playLoading() {
    this.play('loading');
  }

  stopLoading() {
    this.stop('loading');
  }

  playSelect() {
    // Stop any loading sounds before playing select
    this.stop('loading');
    this.play('select');
  }

  // Test methods for debugging
  testLoading() {
    console.log('🔊 Testing loading sound...');
    this.playLoading();
  }

  testSelect() {
    console.log('🔊 Testing select sound...');
    this.playSelect();
  }

  testAllSounds() {
    console.log('🔊 Testing all sounds...');
    const sounds = Object.keys(this.sounds);
    sounds.forEach((sound, index) => {
      setTimeout(() => {
        console.log(`Testing sound ${index + 1}/${sounds.length}: ${sound}`);
        this.play(sound);
      }, index * 500);
    });
  }
}

// Create singleton instance
const soundService = new SoundService();

// Expose globally for debugging
if (typeof window !== 'undefined') {
  window.soundService = soundService;
}

export default soundService;
