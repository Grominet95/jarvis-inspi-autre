import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import gridService from '../services/gridService';

const AppCarousel = ({ apps, micActive, mode = 'wheel', onAppDragStart, onPointerOpen }) => {
  const { settings } = useSettings();
  const [isDragging, setIsDragging] = useState(false);

  // Function to apply theme color to SVG icons
  const getThemedIcon = (originalIcon) => {
    if (!settings?.appIconTheme) return originalIcon;
    
    const themeColors = gridService.getThemeColors(settings.appIconTheme);
    const themeColorHex = `%23${themeColors.appIcon.split(', ').map(c => parseInt(c).toString(16).padStart(2, '0')).join('')}`;
    
    // Replace the hardcoded blue color (%233b82f6) with the theme color
    return originalIcon.replace(/%233b82f6/g, themeColorHex).replace(/stroke='%23ffffff'/g, `stroke='${themeColorHex}'`);
  };
  const containerRef = useRef(null);
  const trayDragStateRef = useRef({ dragging: false, app: null, ghost: null });
  const startXRef = useRef(0);
  const velocityRef = useRef(0);
  const lastMoveTimeRef = useRef(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const voiceAnimationRef = useRef(null);
  const hasMoved = useRef(false);
  const lastClickTime = useRef(0);
  const carouselRotation = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  const [visibleAppCount, setVisibleAppCount] = useState(6);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Bottom bar mode drag state - always created, only used when needed
  const bottomBarDragStateRef = useRef({ dragging: false, app: null, ghost: null });
  
  const getSegmentAngle = () => 360 / apps.length;

  const getCenterPositionForIndex = (index) => {
    return index * getSegmentAngle();
  };

  useEffect(() => {
    carouselRotation.set(0);
  }, []);
  
  useEffect(() => {
    if (micActive) {
      if (voiceAnimationRef.current) {
        clearInterval(voiceAnimationRef.current);
      }
      
      voiceAnimationRef.current = setInterval(() => {
        setVoiceLevel(Math.random() * 0.8 + 0.2);
      }, 100);
    } else {
      if (voiceAnimationRef.current) {
        clearInterval(voiceAnimationRef.current);
        setVoiceLevel(0);
      }
    }
    
    return () => {
      if (voiceAnimationRef.current) {
        clearInterval(voiceAnimationRef.current);
      }
    };
  }, [micActive]);  useEffect(() => {    const unsubscribe = carouselRotation.onChange(value => {
      if (isTransitioning) return;
      
      let normalized = value % 360;
      if (normalized < 0) normalized += 360;
      
      const segmentSize = getSegmentAngle();
      let calculatedIndex = Math.round(normalized / segmentSize);
      calculatedIndex = apps.length - calculatedIndex;
      calculatedIndex = ((calculatedIndex % apps.length) + apps.length) % apps.length;
      
      if (calculatedIndex !== activeIndex) {
        setActiveIndex(calculatedIndex);
      }
    });
    return unsubscribe;
  }, [carouselRotation, apps.length, activeIndex, isTransitioning]);  const handleWheel = (e) => {
    e.preventDefault();
    
    // Throttle wheel events to make scrolling less sensitive
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 150) {
      return; // Skip wheel event if it's too soon after the last one
    }
    lastMoveTimeRef.current = now;
    
    const direction = e.deltaY > 0 ? 1 : -1;
    const newIndex = (activeIndex - direction + apps.length) % apps.length;
    const segmentSize = getSegmentAngle();
    let targetRotation = (apps.length - newIndex) * segmentSize % 360;
    
    // Get current rotation to determine the shortest path
    const currentRotation = carouselRotation.get() % 360;
    const normalizedCurrent = currentRotation < 0 ? currentRotation + 360 : currentRotation;
    
    // Check if we need to adjust when crossing the 0/360 boundary
    if (Math.abs(normalizedCurrent - targetRotation) > 180) {
      // We're crossing the boundary, adjust target for smoother transition
      if (targetRotation < 180) {
        // Moving from high angle to low angle
        targetRotation += 360;
      } else {
        // Moving from low angle to high angle
        targetRotation -= 360;
      }
    }
    
    setIsTransitioning(true);
      // Adjust stiffness and damping based on the number of apps
    // Smoother wheel navigation with many apps
    const stiffnessValue = Math.max(200, Math.min(400, 300 - (apps.length - 10) * 5));
    const dampingValue = Math.max(30, Math.min(50, 40 + (apps.length - 10) * 0.5));
    const massValue = 1.2; // Add more mass for smoother movement
    
    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: stiffnessValue,
      damping: dampingValue,
      mass: massValue,
      restDelta: 0.5, // Increase precision of rest position detection
      onComplete: () => setIsTransitioning(false)
    });
  };  const handleMouseDown = (e) => {
    carouselRotation.stop();
    setIsDragging(true);
    hasMoved.current = false;
    startXRef.current = e.clientX;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    hasMoved.current = true;
    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    lastMoveTimeRef.current = now;
      const deltaX = e.clientX - startXRef.current;
    // Apply smoother velocity calculation with damping and reduced sensitivity
    velocityRef.current = (deltaX / (dt || 1) * 10) * 0.8 + velocityRef.current * 0.2;
    // Reduce sensitivity for more controlled movement
    carouselRotation.set(carouselRotation.get() + (deltaX * 0.25));
    startXRef.current = e.clientX;
  };
    const handleMouseUp = (e) => {
    if (!isDragging) return;
    
    const wasDragging = hasMoved.current;
    setIsDragging(false);
    
    if (!wasDragging) {
      const segmentSize = getSegmentAngle();
      let normalized = carouselRotation.get() % 360;
      if (normalized < 0) normalized += 360;
      
      const calcIndex = Math.round(normalized / segmentSize);
      const appIndex = ((apps.length - calcIndex) % apps.length + apps.length) % apps.length;
      
      const now = Date.now();
      if (now - lastClickTime.current > 300) {
        lastClickTime.current = now;
        if (apps[appIndex] && apps[appIndex].onClick) {
          apps[appIndex].onClick();
        }
      }
      return;
    }
    
    const velocity = velocityRef.current;
      if (Math.abs(velocity) > 2) {
      // Calculate a more natural inertia with more controlled distance and reduced sensitivity
      const inertiaDistance = velocity * 2.8;
      const endValue = carouselRotation.get() + inertiaDistance;
      
      animate(carouselRotation, endValue, {
        type: "decay", 
        velocity: velocity / 150,
        power: 0.7, // Further reduced power for smoother deceleration
        timeConstant: 500, // Longer time constant for more gradual slowing
        onComplete: () => snapToNearestApp()
      });
    } else {
      snapToNearestApp();
    }
  };  const handleTouchStart = (e) => {
    e.preventDefault();
    
    carouselRotation.stop();
    setIsDragging(true);
    hasMoved.current = false;
    startXRef.current = e.touches[0].clientX;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
  };  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    hasMoved.current = true;
    const now = Date.now();
    const dt = now - lastMoveTimeRef.current;
    lastMoveTimeRef.current = now;
      const deltaX = e.touches[0].clientX - startXRef.current;
    // Apply smoother velocity calculation with damping for touch with reduced sensitivity
    velocityRef.current = (deltaX / (dt || 1) * 10) * 0.8 + velocityRef.current * 0.2;
    // Reduce sensitivity for more controlled movement
    carouselRotation.set(carouselRotation.get() + (deltaX * 0.25));
    startXRef.current = e.touches[0].clientX;
  };
    const handleTouchEnd = (e) => {
    if (!isDragging) return;
    
    const wasDragging = hasMoved.current;
    setIsDragging(false);
    
    if (!wasDragging) {
      const segmentSize = getSegmentAngle();
      let normalized = carouselRotation.get() % 360;
      if (normalized < 0) normalized += 360;
      
      const calcIndex = Math.round(normalized / segmentSize);
      const appIndex = ((apps.length - calcIndex) % apps.length + apps.length) % apps.length;
      
      const now = Date.now();
      if (now - lastClickTime.current > 300) {
        lastClickTime.current = now;
        if (apps[appIndex] && apps[appIndex].onClick) {
          apps[appIndex].onClick();
        }
      }
      return;
    }
    
    const velocity = velocityRef.current;
      if (Math.abs(velocity) > 2) {
      // Use the same reduced inertia settings for touch as used for mouse
      const inertiaDistance = velocity * 2.8;
      const endValue = carouselRotation.get() + inertiaDistance;
      
      animate(carouselRotation, endValue, {
        type: "decay", 
        velocity: velocity / 150,
        power: 0.7, // Further reduced power for smoother deceleration
        timeConstant: 500, // Longer time constant for more gradual slowing
        onComplete: () => snapToNearestApp()
      });
    } else {
      snapToNearestApp();
    }
  };  const snapToNearestApp = () => {
    const segmentSize = getSegmentAngle();
    const currentRotation = carouselRotation.get();
    
    // Find the closest segment
    let targetRotation = Math.round(currentRotation / segmentSize) * segmentSize;
    
    // Handle the wrap-around case more smoothly
    // If we're close to 360 degrees, check if wrapping to 0 would be closer
    if (targetRotation > 270 && Math.abs(targetRotation - 360) < segmentSize) {
      // We're closer to the beginning, so wrap around
      if (Math.abs(currentRotation - targetRotation) > Math.abs(currentRotation - (targetRotation - 360))) {
        targetRotation = targetRotation - 360;
      }
    }
    // If we're close to 0 degrees, check if wrapping to 360 would be closer
    else if (targetRotation < 90 && Math.abs(targetRotation) < segmentSize) {
      // We're closer to the end, so wrap around
      if (Math.abs(currentRotation - targetRotation) > Math.abs(currentRotation - (targetRotation + 360))) {
        targetRotation = targetRotation + 360;
      }
    }
    
    // Adjust stiffness and damping for smoother snapping
    const stiffnessValue = Math.max(200, Math.min(400, 300 - (apps.length - 10) * 5));
    const dampingValue = Math.max(30, Math.min(50, 40 + (apps.length - 10) * 0.5));
    
    setIsTransitioning(true);
    
    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: stiffnessValue,
      damping: dampingValue,
      mass: 1.2, // More mass for smoother animation
      restDelta: 0.5, // More precise rest position detection
      onComplete: () => {
        setIsTransitioning(false);
        
        // Calculate and set the new active index
        let normalized = targetRotation % 360;
        if (normalized < 0) normalized += 360;
        const calcIndex = Math.round(normalized / segmentSize);
        const newIndex = ((apps.length - calcIndex) % apps.length + apps.length) % apps.length;
        setActiveIndex(newIndex);
      }
    });
  };

  const handleAppClick = (index, e) => {
    if (isDragging || isTransitioning || Math.abs(velocityRef.current) > 2 || hasMoved.current) {
      return;
    }
    
    e.stopPropagation();
    
    const now = Date.now();
    if (now - lastClickTime.current < 300) {
      return;
    }
    lastClickTime.current = now;
      const segmentSize = getSegmentAngle();
    let targetRotation = ((apps.length - index) % apps.length) * segmentSize;
    
    // Get current rotation to determine the shortest path
    const currentRotation = carouselRotation.get() % 360;
    const normalizedCurrent = currentRotation < 0 ? currentRotation + 360 : currentRotation;
    
    // Check if we need to adjust when crossing the 0/360 boundary
    if (Math.abs(normalizedCurrent - targetRotation) > 180) {
      // We're crossing the boundary, adjust target for smoother transition
      if (targetRotation < 180) {
        // Moving from high angle to low angle
        targetRotation += 360;
      } else {
        // Moving from low angle to high angle
        targetRotation -= 360;
      }
    }
    
    setIsTransitioning(true);
      // Adjust stiffness and damping based on the number of apps
    // This makes the rotation feel smoother with many apps
    const stiffnessValue = Math.max(250, Math.min(450, 350 - (apps.length - 10) * 5));
    const dampingValue = Math.max(30, Math.min(50, 40 + (apps.length - 10) * 0.5));
    const massValue = 1.3; // Higher mass for smoother, more premium feel
    
    animate(carouselRotation, targetRotation, {
      type: "spring",
      stiffness: stiffnessValue,
      damping: dampingValue,
      mass: massValue,
      restDelta: 0.5, // More precise rest position detection
      onComplete: () => {
        setIsTransitioning(false);
        setActiveIndex(index);
        
        if (apps[index] && apps[index].onClick) {
          apps[index].onClick();
        }
      }
    });
    
    setActiveIndex(index);
  };
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove, { passive: false });
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging]);  // Clean up any resources when component unmounts
  useEffect(() => {
    return () => {
      // No specific cleanup needed currently
    };
  }, []);  const getAppPosition = (index) => {
    const segmentSize = getSegmentAngle();
    const currentRotation = carouselRotation.get();
    
    // Base values for the carousel
    const baseHorizontalRadius = 160;
    const baseDepthRadius = 100;
    
    // Dynamically adjust radius based on number of apps
    const appCountFactor = Math.max(1, Math.min(1.3, apps.length / 10));
    const horizontalRadius = baseHorizontalRadius * appCountFactor;
    const depthRadius = baseDepthRadius * appCountFactor;
    
    // Get visible app indices and determine if this app is visible
    const visibleIndices = getVisibleAppIndices;
    const isVisible = visibleIndices.includes(index);
    const isFocused = index === activeIndex;
      // Calculate displacement to create more space around the focused app
    let displacementFactor = 0;
    if (!isFocused && isVisible) {
      // Calculate the shortest distance around the circular array
      const clockwiseDist = (index - activeIndex + apps.length) % apps.length;
      const counterClockwiseDist = (activeIndex - index + apps.length) % apps.length;
      const distanceFromActive = Math.min(clockwiseDist, counterClockwiseDist);
      
      // Only apply displacement to immediate neighbors (using the shortest path)
      if (distanceFromActive <= 2) {
        // Push immediate neighbors further away from the focused app
        displacementFactor = 0.3 * (3 - distanceFromActive);
      }
    }
    
    // Original angle calculation (regular carousel mode)
    let regularAngle = ((index * segmentSize) + currentRotation) * (Math.PI / 180);
      // Apply displacement to angle for neighbor apps
    if (displacementFactor > 0) {
      // Determine the shortest path direction between this app and active app
      let direction;
      
      // Calculate both clockwise and counterclockwise distances
      const clockwiseDist = (index - activeIndex + apps.length) % apps.length;
      const counterClockwiseDist = (activeIndex - index + apps.length) % apps.length;
      
      // Choose direction based on shortest distance
      if (clockwiseDist < counterClockwiseDist) {
        direction = 1;  // Move clockwise
      } else {
        direction = -1; // Move counterclockwise
      }
      
      // Adjust regularAngle to create more space
      regularAngle += direction * displacementFactor * (Math.PI / 180) * segmentSize;
    }
    
    // Always use the regular angle for positioning
    const itemAngle = regularAngle;
    
    // Calculate position using regular circular layout
    const x = Math.sin(itemAngle) * horizontalRadius;
    const z = Math.cos(itemAngle) * depthRadius;
    
    // For compact mode, adjust visibility but maintain circular layout
    let scale, opacity;
    
    if (isCompact) {
      if (isVisible) {
        // Visible apps in compact mode
        // Make focused app larger
        scale = isFocused 
          ? 1.4 
          : mapRange(z, -depthRadius, depthRadius, 0.7, 1.1);
        opacity = mapRange(z, -depthRadius, depthRadius, 0.4, 1);
      } else {
        // Non-visible apps in compact mode
        scale = 0.4;
        opacity = 0.15;
      }
    } else {
      // Regular mode (all apps visible)
      scale = mapRange(z, -depthRadius, depthRadius, 0.7, isFocused ? 1.4 : 1.2);
      opacity = mapRange(z, -depthRadius, depthRadius, 0.4, 1);
    }
    
    // Calculate z-index based on z position
    const zIndex = isFocused ? 100 : Math.round(mapRange(z, -depthRadius, depthRadius, 10, 50));
    
    return { 
      x, 
      y: 0, 
      z, 
      // Make focused app even larger
      scale: isFocused ? scale * 1.15 : scale,
      opacity: isFocused ? 1 : opacity,
      zIndex
    };
  };
  const mapRange = (value, inMin, inMax, outMin, outMax) => {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };
  
  // Calculate visibility window to control how many apps are visible at once
  const getVisibilityThreshold = () => {
    // Default threshold for visibility (z-value)
    const baseThreshold = 30;
    
    // Make visibility window narrower with more apps
    // This controls how many apps are visible at once in the carousel
    if (apps.length > 20) {
      return baseThreshold + (apps.length - 20) * 2;
    }
    
    return baseThreshold;
  };  // Determine which apps should be rendered based on current rotation
  const getVisibleAppIndices = useMemo(() => {
    if (!isCompact) {
      // In non-compact mode, show all apps
      return apps.map((_, index) => index);
    }
    
    // Always start with the active index
    const result = [activeIndex];
    
    // Add apps on both sides of the active index
    const halfCount = Math.floor((visibleAppCount - 1) / 2);
    
    // Add apps to the right of active index
    for (let i = 1; i <= halfCount; i++) {
      const nextIndex = (activeIndex + i) % apps.length;
      result.push(nextIndex);
    }
    
    // Add apps to the left of active index
    for (let i = 1; i <= halfCount; i++) {
      const prevIndex = (activeIndex - i + apps.length) % apps.length;
      result.push(prevIndex);
    }
    
    // If we have an even number of visible apps, add one more to make it balanced
    if (visibleAppCount % 2 === 0 && visibleAppCount < apps.length) {
      // Add one more to the right to make it symmetric
      const extraIndex = (activeIndex + halfCount + 1) % apps.length;
      if (!result.includes(extraIndex)) {
        result.push(extraIndex);
      }
    }
    
    return result;
  }, [activeIndex, apps.length, visibleAppCount, isCompact]);
  useEffect(() => {
    // Dynamically adjust visible app count based on total number of apps
    // For smaller collections, show fewer apps at once
    if (apps.length <= 6) {
      setVisibleAppCount(3);
    } else if (apps.length <= 10) {
      setVisibleAppCount(5);
    } else if (apps.length <= 14) {
      setVisibleAppCount(5); 
    } else {
      setVisibleAppCount(7);
    }
  }, [apps.length]);

  // Pointer-based drag-open handlers (work for mouse/touch/pen)
  const trayStartPointer = (app, e) => {
    const s = trayDragStateRef.current;
    s.dragging = true;
    s.app = app;
    try { e.target.setPointerCapture?.(e.pointerId); } catch {}
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = `${e.clientX - 24}px`;
    ghost.style.top = `${e.clientY - 24}px`;
    ghost.style.width = '48px';
    ghost.style.height = '48px';
    ghost.style.borderRadius = '12px';
    ghost.style.backdropFilter = 'blur(6px)';
    ghost.style.background = 'rgba(15,23,42,0.35)';
    ghost.style.border = '1px solid rgba(59,130,246,0.4)';
    ghost.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);
    s.ghost = ghost;
  };

  const trayMovePointer = (e) => {
    const s = trayDragStateRef.current;
    if (!s.dragging || !s.ghost) return;
    s.ghost.style.left = `${e.clientX - 24}px`;
    s.ghost.style.top = `${e.clientY - 24}px`;
  };

  const trayEndPointer = (e) => {
    const s = trayDragStateRef.current;
    if (s.ghost) { document.body.removeChild(s.ghost); s.ghost = null; }
    if (s.dragging && s.app && typeof onPointerOpen === 'function') {
      const trayRect = containerRef.current?.getBoundingClientRect();
      if (!trayRect || e.clientY < trayRect.top) {
        onPointerOpen(s.app, e.clientX, e.clientY);
      }
    }
    s.dragging = false; s.app = null;
  };
  
  // Bottom bar tray mode
  if (mode === 'bottomBar') {
    const visible = 10;
    
    // Get visible apps based on scroll offset, not activeIndex
    const indices = [];
    for (let i = 0; i < visible; i++) {
      indices.push((scrollOffset + i) % apps.length);
    }
    
    // Use the ref that's defined at the top level
    const startPointer = (app, e) => {
      bottomBarDragStateRef.current.dragging = true;
      bottomBarDragStateRef.current.app = app;
      try { e.target.setPointerCapture?.(e.pointerId); } catch {}
      const ghost = document.createElement('div');
      ghost.style.position = 'fixed';
      ghost.style.left = `${e.clientX - 24}px`;
      ghost.style.top = `${e.clientY - 24}px`;
      ghost.style.width = '48px';
      ghost.style.height = '48px';
      ghost.style.borderRadius = '12px';
      ghost.style.backdropFilter = 'blur(6px)';
      ghost.style.background = 'rgba(15,23,42,0.35)';
      ghost.style.border = '1px solid rgba(59,130,246,0.4)';
      ghost.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);
      bottomBarDragStateRef.current.ghost = ghost;
    };
    const movePointer = (e) => {
      const s = bottomBarDragStateRef.current;
      if (!s.dragging || !s.ghost) return;
      s.ghost.style.left = `${e.clientX - 24}px`;
      s.ghost.style.top = `${e.clientY - 24}px`;
    };
    const endPointer = (e) => {
      const s = bottomBarDragStateRef.current;
      if (s.ghost) { document.body.removeChild(s.ghost); s.ghost = null; }
      if (s.dragging && s.app && typeof onPointerOpen === 'function') {
        const trayRect = containerRef.current?.getBoundingClientRect();
        if (!trayRect || e.clientY < trayRect.top) {
          onPointerOpen(s.app, e.clientX, e.clientY);
        }
      }
      s.dragging = false; s.app = null;
    };

    return (
      <div 
        className={`w-full select-none ${micActive ? 'interface-active' : ''}`}
        // Disable wheel scrolling in tray to prevent accidental drag cancellations
        onWheel={(e) => e.preventDefault()}
        ref={containerRef}
        // Disable drag rotation; use arrows only
        onMouseDown={undefined}
        onTouchStart={undefined}
        onPointerMove={trayMovePointer}
        onPointerUp={trayEndPointer}
        onPointerCancel={trayEndPointer}
        style={{ cursor: 'default', touchAction: 'pan-x' }}
      >
        <div className="relative w-full">
          {/* Simplified tray background - single layer, no black bar */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[92%] h-24 rounded-t-3xl backdrop-blur-md"
                 style={{
                   background: 'linear-gradient(to top, rgba(2,6,23,0.85), rgba(2,6,23,0.65), rgba(2,6,23,0.0))',
                   border: '1px solid rgba(59,130,246,0.4)',
                   borderBottom: 'none',
                   boxShadow: '0 -10px 30px rgba(0,0,0,0.45), inset 0 6px 12px rgba(59,130,246,0.08)'
                 }}></div>
          </div>
          {/* App tray content */}
          <div className="relative w-full px-8 py-4 overflow-hidden">
            {/* Left/Right arrows - moved inside the tray */}
            <button
              className="absolute left-12 top-1/2 -translate-y-1/2 z-10 px-1 py-1 rounded-full text-blue-300/60 hover:text-blue-200 hover:bg-blue-900/20 transition-all duration-200"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setScrollOffset((prev) => (prev - 1 + apps.length) % apps.length);
              }}
              aria-label="Scroll left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              className="absolute right-12 top-1/2 -translate-y-1/2 z-10 px-1 py-1 rounded-full text-blue-300/60 hover:text-blue-200 hover:bg-blue-900/20 transition-all duration-200"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setScrollOffset((prev) => (prev + 1) % apps.length);
              }}
              aria-label="Scroll right"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            {/* Icons row */}
            <div className="flex items-center justify-center gap-3">
              {indices.map((idx, i) => {
                const app = apps[idx];
                // Edge fade effects only - no scaling based on center
                const isEdge = i === 0 || i === indices.length - 1;
                const fadeAmount = isEdge ? 0.7 : 1.0;
                const scaleAmount = isEdge ? 0.85 : 1.0;
                
                return (
                  <div
                    key={app.id}
                    className="relative"
                    style={{ 
                      opacity: fadeAmount,
                      transform: `scale(${scaleAmount})`
                    }}
                    onPointerDown={(e) => trayStartPointer(app, e)}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center cursor-grab app-icon"
                      onClick={(e) => e.preventDefault()}
                    >
                      <img src={getThemedIcon(app.icon)} alt={app.name} className="w-8 h-8 pointer-events-none" draggable={false} />
                    </div>
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-blue-400/70">{app.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`relative h-[400px] w-full select-none ${micActive ? 'interface-active' : ''}`}
      onWheel={handleWheel}
      ref={containerRef}
      onMouseDown={isDragging ? undefined : handleMouseDown}
      onTouchStart={isDragging ? undefined : handleTouchStart}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', maxWidth: '360px', margin: '0 auto', touchAction: 'none' }}
    >
      <div className="absolute inset-0 perspective-1200">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[100px] rounded-full">
          <div className="absolute inset-0 bg-gradient-radial from-blue-950/10 via-blue-950/5 to-transparent rounded-full"></div>
          <div className="absolute inset-0 platform-reflection rounded-full"></div>
        </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] border border-blue-500/20 rounded-full pointer-events-none">
          <div className="absolute inset-0 rounded-full bg-gradient-radial from-blue-900/5 to-transparent"></div>
          <div className="absolute inset-[-1px] border border-blue-400/10 rounded-full animate-pulse-slow"></div>
        </div>          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[300px] flex items-center justify-center">
          {apps.map((app, index) => {
            const isFocused = index === activeIndex;
            const isVisible = isCompact ? getVisibleAppIndices.includes(index) : true;
            const position = getAppPosition(index);
            
            // Always render all apps, but position and style them differently
            return (<motion.div
                key={app.id}
                className="absolute transform-style-preserve-3d"
                animate={position}
                initial={position}                transition={{ 
                  type: 'spring', 
                  stiffness: isFocused ? 350 : 250,  // Lower stiffness for slower animations
                  damping: isFocused ? 35 : 40,      // Higher damping for slower animations
                  mass: isFocused ? 1.4 : 1.2,       // Higher mass for slower animations
                  // Use separate timing for opacity to create smoother transitions
                  opacity: { duration: 0.6 }         // Longer opacity transition
                }}style={{ 
                  zIndex: position.zIndex,
                  filter: `blur(${position.z < 0 ? Math.abs(position.z) / 100 : 0}px)`,
                  pointerEvents: (isVisible || !isCompact) && position.z > 0 ? 'auto' : 'none',
                  opacity: position.opacity,
                  scale: position.scale
                }}
                onClick={(e) => handleAppClick(index, e)}
              >
                <div className="relative transform-style-preserve-3d">                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center cursor-pointer
                              ${isFocused ? 'app-icon-focused' : 'app-icon'}`}
                    onClick={(e) => handleAppClick(index, e)}
                    style={{
                      transform: isFocused ? 'translateZ(15px)' : 'none',
                      transition: 'transform 0.3s ease-out',
                      boxShadow: isFocused ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                  >                    <img
                      src={getThemedIcon(app.icon)}
                      alt={app.name}
                      className={`w-10 h-10 ${isFocused ? 'drop-shadow-blue' : ''} pointer-events-none`}
                      draggable={false}
                      style={{
                        filter: isFocused ? 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.4))' : 'none',
                      }}
                    />
                    
                    <div className="absolute inset-0 rounded-full icon-reflection pointer-events-none"></div>
                    {isFocused && (
                      <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%)',
                        opacity: 0.7
                      }}></div>
                    )}
                  </div>
                    {(isVisible || isFocused) && (                    <div 
                      className={`absolute -bottom-8 left-1/2 text-center whitespace-nowrap pointer-events-none
                                ${isFocused ? 'text-blue-300 font-medium' : 'text-blue-400/50'}`}
                      style={{
                        textShadow: isFocused ? '0 0 10px rgba(59,130,246,0.8)' : 'none',
                        opacity: position.z > 0 ? 1 : 0.5,
                        transform: isFocused ? 'translate(-50%, 0) scale(1.1)' : 'translate(-50%, 0)',
                        transformOrigin: 'center',
                        transition: 'transform 0.2s ease-out, text-shadow 0.2s ease-out',
                        width: 'auto',
                        display: 'inline-block'
                      }}
                    >
                      {app.name}
                    </div>
                  )}
                  
                  {isFocused && (
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex space-x-1 pointer-events-none">
                      <div className="w-1 h-1 bg-blue-500 rounded-full shadow-glow"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full shadow-glow"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full shadow-glow"></div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <div className="flex items-center space-x-1">
          {apps.map((_, index) => (
            <div
              key={index} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer
                        ${index === activeIndex ? 'bg-blue-400 w-3' : 'bg-blue-900/50'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAppClick(index, e);
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppCarousel;