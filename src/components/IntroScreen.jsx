import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/intro-screen.css';
import introSfx from '../assets/SFX/intro_sfx.mp3';

const IntroScreen = ({ onComplete }) => {
  const [bootState, setBootState] = useState('initial'); // 'initial', 'booting', 'intro'
  const [loading, setLoading] = useState(0);
  const [showMainTitle, setShowMainTitle] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showTGPText, setShowTGPText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [contractTitle, setContractTitle] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const [bootButtonScale, setBootButtonScale] = useState(1);
  const [bootButtonRipple, setBootButtonRipple] = useState(false);
  const audioContext = useRef(null);
  const oscillators = useRef([]);
  const glitchIntervalRef = useRef(null);
  const audioRef = useRef(null);
    const createRandomGlitchEffect = () => {
    // Random glitch effect for the title
    const titleElement = document.querySelector('.main-title');
    if (titleElement && titleElement.classList.contains('title-glitch')) {
      // Create random interval between glitches
      const randomInterval = 1500 + Math.random() * 3000;
      
      // Clear any existing interval
      if (glitchIntervalRef.current) {
        clearInterval(glitchIntervalRef.current);
      }
      
      // Set new interval for glitches
      glitchIntervalRef.current = setInterval(() => {
        titleElement.classList.add('glitch-active');
        setTimeout(() => {
          titleElement.classList.remove('glitch-active');
        }, 200 + Math.random() * 300);
      }, randomInterval);
    }
  };
  
  const handleBootButtonClick = () => {
    // Trigger the button animation
    setBootButtonScale(0.95);
    setBootButtonRipple(true);
    
    // Play the intro sound
    playIntroSound();

    // After a brief delay, transition to booting state
    setTimeout(() => {
      setBootState('booting');
      
      // After animation completes, show the intro screen
      setTimeout(() => {
        setBootState('intro');
      }, 1000);
    }, 300);
  };const handleSkip = () => {
    // Stop all sounds
    if (oscillators.current.length) {
      oscillators.current.forEach(osc => {
        osc.stop();
      });
      oscillators.current = [];
    }
    
    // Stop the intro sound if it's playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    setContractTitle(true);
    setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => onComplete(), 1000);
    }, 800);
  };
  
  // Function to create ambient futuristic sounds
  const createAmbientSound = () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Create low hum
      const lowHum = audioContext.current.createOscillator();
      lowHum.type = 'sine';
      lowHum.frequency.value = 80;
      
      const lowHumGain = audioContext.current.createGain();
      lowHumGain.gain.value = 0.03;
      
      lowHum.connect(lowHumGain);
      lowHumGain.connect(audioContext.current.destination);
      
      // Create high ping sound that repeats
      const pingSound = () => {
        const ping = audioContext.current.createOscillator();
        ping.type = 'sine';
        ping.frequency.value = 1200;
        
        const pingGain = audioContext.current.createGain();
        pingGain.gain.value = 0;
        
        ping.connect(pingGain);
        pingGain.connect(audioContext.current.destination);
        
        ping.start();
        
        // Create ping envelope
        pingGain.gain.setValueAtTime(0, audioContext.current.currentTime);
        pingGain.gain.linearRampToValueAtTime(0.03, audioContext.current.currentTime + 0.01);
        pingGain.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.3);
        
        // Stop after envelope completes
        setTimeout(() => {
          ping.stop();
          
          // Remove from oscillators array
          oscillators.current = oscillators.current.filter(osc => osc !== ping);
        }, 500);
        
        oscillators.current.push(ping);
      };
      
      // Start low hum
      lowHum.start();
      oscillators.current.push(lowHum);
      
      // Schedule pings every few seconds
      const pingInterval = setInterval(pingSound, 3000);
      pingSound(); // Play one immediately
      
      // Return cleanup function
      return () => {
        clearInterval(pingInterval);
        if (oscillators.current.length) {
          oscillators.current.forEach(osc => {
            osc.stop();
          });
          oscillators.current = [];
        }
      };
    } catch (error) {
      console.error("Audio context error:", error);
      return () => {}; // Return empty cleanup function
    }
  };  // Function to play the intro sound file
  const playIntroSound = () => {
    try {
      // Create a new Audio element
      audioRef.current = new Audio(introSfx);
      audioRef.current.volume = 0.4; // Set volume to 40%
      
      // Since this is called after a user interaction (button click), it should work fine with autoplay policies
      audioRef.current.play().catch(error => {
        console.error("Audio playback error:", error);
      });
      
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      };
    } catch (error) {
      console.error("Audio playback error:", error);
      return () => {};
    }
  };
  useEffect(() => {
    // Only run the intro sequence if we're in the 'intro' state
    if (bootState !== 'intro') return;
    
    // Simulate loading progress
    const loadingInterval = setInterval(() => {
      setLoading(prev => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
      // Show elements in sequence
    const timeline = [
      { action: () => setShowMainTitle(true), delay: 800 },
      { action: () => setShowSubtitle(true), delay: 2000 },
      { action: () => setShowTGPText(true), delay: 3000 },
      { action: () => setShowSkipHint(true), delay: 1200 },
      { action: () => setContractTitle(true), delay: 5500 },
      { action: () => setFadeOut(true), delay: 6300 },
      { action: () => onComplete(), delay: 7300 }
    ];
    
    timeline.forEach(({ action, delay }) => {
      setTimeout(action, delay);
    });
    
    // Start ambient sound
    const cleanupSound = createAmbientSound();
    
    return () => {
      clearInterval(loadingInterval);
      cleanupSound();
      if (glitchIntervalRef.current) {
        clearInterval(glitchIntervalRef.current);
      }
    };
  }, [bootState, onComplete]);
  return (
    <AnimatePresence>
      {bootState === 'initial' && (
        <motion.div
          className="boot-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="boot-button-container"
            animate={{ scale: bootButtonScale }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            onClick={handleBootButtonClick}
          >
            {bootButtonRipple && (
              <motion.div 
                className="boot-button-ripple"
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.8 }}
                onAnimationComplete={() => setBootButtonRipple(false)}
              />
            )}
            <div className="boot-button">
              <div className="boot-button-inner">
                <span>BOOT</span>
                <span>HOLOMAT</span>
              </div>
            </div>
          </motion.div>
          <div className="boot-version">HOLOMAT V3</div>
        </motion.div>
      )}
      
      {bootState === 'booting' && (
        <motion.div
          className="transition-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="transition-circle"
            initial={{ scale: 0 }}
            animate={{ scale: 20 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </motion.div>
      )}
      
      {bootState === 'intro' && !fadeOut && (
        <motion.div
          className="intro-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          onClick={handleSkip}
        >
          <div className="hud-grid"></div>
          <div className="hud-scanner"></div>
          <div className="hud-circles"></div>
          <div className="hud-lines left-lines"></div>
          <div className="hud-lines right-lines"></div>
          
          {showSkipHint && (
            <motion.div 
              className="skip-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ duration: 0.8 }}
            >
              CLICK ANYWHERE TO SKIP
            </motion.div>
          )}
            <div className="content-container">            {showMainTitle && (
              <div className={`title-container ${contractTitle ? 'contract-active' : ''}`}>
                <motion.div 
                  className="title-line"
                  animate={{ 
                    width: contractTitle ? '100%' : undefined,
                    height: contractTitle ? '3px' : undefined,
                    marginBottom: contractTitle ? '0' : undefined,
                    opacity: contractTitle ? 1 : undefined
                  }}
                  transition={{ duration: 0.7 }}
                ></motion.div>
                <motion.h1 
                  className="main-title"
                  initial={{ opacity: 0, height: 0, y: 20 }}
                  animate={{ 
                    opacity: contractTitle ? 0 : 1, 
                    height: contractTitle ? 0 : 'auto', 
                    y: contractTitle ? -20 : 0,
                    scale: contractTitle ? 0.8 : 1
                  }}
                  transition={{ 
                    duration: contractTitle ? 0.5 : 1,
                    height: { duration: contractTitle ? 0.3 : 0.5 },
                    opacity: { duration: contractTitle ? 0.3 : 0.7, delay: contractTitle ? 0 : 0.3 }
                  }}
                  onAnimationComplete={() => {
                    if (!contractTitle) {
                      // Add glitch effect after initial animation
                      const element = document.querySelector('.main-title');
                      if (element) {
                        element.classList.add('title-glitch');
                        // Occasional glitch effect
                        setTimeout(() => {
                          element.classList.add('glitch-active');
                          setTimeout(() => element.classList.remove('glitch-active'), 300);
                        }, 200);
                        createRandomGlitchEffect();
                      }
                    }
                  }}
                >
                  HOLOMAT V3
                </motion.h1>
              </div>
            )}
            {showSubtitle && (
              <motion.div
                className="subtitle-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <span className="subtitle-prefix">INTEGRATED AI:</span>
                <div className="subtitle-wrapper">
                  <motion.div
                    className="subtitle-centered"
                    initial={{ opacity: 0, scale: 1.2 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      textShadow: ["0 0 0px rgba(56, 189, 248, 0.6)", "0 0 10px rgba(56, 189, 248, 0.8)", "0 0 5px rgba(56, 189, 248, 0.6)"]
                    }}
                    transition={{ 
                      duration: 1.2, 
                      delay: 0.3,
                      textShadow: { repeat: Infinity, repeatType: "reverse", duration: 2 }
                    }}
                    onAnimationComplete={() => {
                      // Add glitch effect after initial animation
                      const element = document.querySelector('.subtitle-centered');
                      if (element) {
                        element.classList.add('text-glitch');
                        // Occasional glitch effect
                        setInterval(() => {
                          element.classList.add('glitch-active');
                          setTimeout(() => element.classList.remove('glitch-active'), 200);
                        }, 3000);
                      }
                    }}
                  >
                    JARVIS
                  </motion.div>
                </div>
              </motion.div>
            )}
                <div className="loading-bar-container">
              <div className="loading-label">SYSTEM INITIALIZATION</div>
              <div className="loading-bar">
                <motion.div 
                  className="loading-progress"
                  initial={{ width: "0%" }}
                  animate={{ width: `${loading}%` }}
                  transition={{ duration: 0.1 }}
                ></motion.div>
              </div>
              <div className="loading-percentage">{loading}%</div>
                <div className="system-status">
                <div className="status-placeholder">
                  {loading >= 20 && (
                    <motion.div
                      className="status-item"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                      <span className="status-label">CORE SYSTEMS</span>
                      <span className="status-value">ONLINE</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="status-placeholder">
                  {loading >= 45 && (
                    <motion.div
                      className="status-item"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                      <span className="status-label">AI ROUTINES</span>
                      <span className="status-value">ACTIVATED</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="status-placeholder">
                  {loading >= 75 && (
                    <motion.div
                      className="status-item"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                      <span className="status-label">INTERFACE</span>
                      <span className="status-value">CALIBRATED</span>
                    </motion.div>
                  )}
                </div>
                
                <div className="status-placeholder">
                  {loading >= 95 && (
                    <motion.div
                      className="status-item final"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
                    >
                      <span className="status-label">HOLOGRAPHIC SYSTEMS</span>
                      <span className="status-value">READY</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            {showTGPText && (
              <motion.div
                className="tgp-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.8 }}
              >
                BROUGHT TO YOU BY TGP
              </motion.div>
            )}
            
            <div className="hud-corners">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>
            </div>          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroScreen;
