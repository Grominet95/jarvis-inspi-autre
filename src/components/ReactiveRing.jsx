import React, { useState, useEffect, useRef } from 'react';

const ReactiveRing = ({ inset, borderStyle, volume, delay = 0, baseOpacity = 0.6, volumeImpact = 0.2 }) => {
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.5);
  const [isAppearing, setIsAppearing] = useState(true);
  const animationRef = useRef(null);
  
  // Handle initial appearance animation
  useEffect(() => {
    let startTime;
    let animationDuration = 800;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setScale(0.5 + (0.5 * easeOut));
      setOpacity(baseOpacity * easeOut);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAppearing(false);
      }
    };
    
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, delay * 1000);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [delay, baseOpacity]);
  
  // Apply voice volume impact after initial animation completes
  useEffect(() => {
    if (!isAppearing) {
      setScale(1 + (volume * volumeImpact));
      setOpacity(Math.max(0.2, baseOpacity * (0.7 + volume * 0.3)));
    }
  }, [volume, isAppearing, baseOpacity, volumeImpact]);
  
  return (
    <div
      className="outer-voice-ring"
      style={{
        inset: inset,
        border: borderStyle,
        opacity: opacity,
        transform: `scale(${scale})`,
        boxShadow: volume > 0.5 ? `0 0 ${10 + volume * 15}px rgba(59, 130, 246, ${0.2 + volume * 0.2})` : 'none'
      }}
    />
  );
};

export default ReactiveRing;
