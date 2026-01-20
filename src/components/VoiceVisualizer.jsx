import React from 'react';
import '../styles/voice-visualizer.css';

const VoiceVisualizer = ({ isActive, volume = 0 }) => {
  if (!isActive) return null;
  
  // Create dynamic rings that react to voice
  const rings = [];
  const ringCount = 3;
  
  for (let i = 0; i < ringCount; i++) {
    const delay = i * 0.6;
    const baseScale = 1.0 + (i * 0.2);
    const scale = baseScale + (volume * 2.0);
    const baseOpacity = 0.6 - (i * 0.15);
    const opacity = Math.max(0.1, baseOpacity * (0.5 + volume));
    
    rings.push(
      <div 
        key={`inner-${i}`}
        className="absolute inset-0 rounded-full voice-ring"
        style={{ 
          transform: `scale(${scale})`,
          opacity: opacity,
          transition: 'transform 100ms ease-out, opacity 150ms ease-out',
          animationDelay: `${delay}s`,
          zIndex: 5 - i,
          boxShadow: volume > 0.5 ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
        }}
      />
    );
  }
  
  return <>{rings}</>;
};

export default VoiceVisualizer;
