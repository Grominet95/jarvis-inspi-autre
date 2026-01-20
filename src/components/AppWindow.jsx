import React, { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { apps } from '../data/apps';
import soundService from '../services/soundService';

const AppWindow = ({ windowId, app, initialX, initialY, zIndex, onClose, onActivate, appProps }) => {
  const [AppComponent, setAppComponent] = useState(null);
  const [dynamicSize, setDynamicSize] = useState(null);
  const [showDropOverlay, setShowDropOverlay] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [savedSize, setSavedSize] = useState(null);
  const dragControls = useDragControls();
  
  // Define default sizes for different apps
  const getDefaultAppSize = (appName) => {
    switch(appName) {
      case 'Music':
        return { width: 400, height: 320 };
      case 'Calculator':
        return { width: 320, height: 540 };
      case '3D models':
        return { width: 600, height: 400 };
      case '3D Viewer':
        return { width: 800, height: 600 };
      default:
        return { width: 720, height: 480 };
    }
  };

  // Define minimum sizes to prevent apps from becoming unusable
  const getMinSize = (appName) => {
    switch(appName) {
      case 'Calculator':
        return { width: 280, height: 480 };
      case 'Music':
        return { width: 320, height: 140 };
      default:
        return { width: 400, height: 300 };
    }
  };

  // Load saved size from localStorage
  useEffect(() => {
    const savedSizes = JSON.parse(localStorage.getItem('app-window-sizes') || '{}');
    const appSavedSize = savedSizes[app.name];
    if (appSavedSize) {
      setSavedSize(appSavedSize);
    }
  }, [app.name]);

  // Calculate final app size (priority: dynamicSize > savedSize > defaultSize)
  const appSize = dynamicSize || savedSize || getDefaultAppSize(app.name);

  // Save app size to localStorage
  const saveAppSize = (size) => {
    const savedSizes = JSON.parse(localStorage.getItem('app-window-sizes') || '{}');
    savedSizes[app.name] = size;
    localStorage.setItem('app-window-sizes', JSON.stringify(savedSizes));
    setSavedSize(size);
  };

  // Resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    onActivate(windowId); // Bring window to front when resizing
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = appSize.width;
    const startHeight = appSize.height;
    const minSize = getMinSize(app.name);

    const handleMouseMove = (e) => {
      const newWidth = Math.max(minSize.width, startWidth + (e.clientX - startX));
      const newHeight = Math.max(minSize.height, startHeight + (e.clientY - startY));
      
      const newSize = { width: newWidth, height: newHeight };
      setDynamicSize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Save the final size
      if (dynamicSize) {
        saveAppSize(dynamicSize);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Listen for size changes from Music app
  useEffect(() => {
    if (app.name === 'Music') {
      const handleMusicResize = () => {
        const musicElement = document.querySelector(`[data-window-id="${windowId}"] .music-app`);
        if (musicElement) {
          if (musicElement.classList.contains('music-app-login')) {
            setDynamicSize({ width: 400, height: 320 }); // Increased height for better button spacing
          } else if (musicElement.classList.contains('music-app-player')) {
            setDynamicSize({ width: 360, height: 140 });
          }
        }
      };

      // Check immediately
      handleMusicResize();
      
      // Set up observer for class changes
      const observer = new MutationObserver(handleMusicResize);
      const windowElement = document.querySelector(`[data-window-id="${windowId}"]`);
      if (windowElement) {
        observer.observe(windowElement, {
          subtree: true,
          attributes: true,
          attributeFilter: ['class']
        });
      }

      return () => observer.disconnect();
    }
  }, [windowId, app.name, AppComponent]);

  useEffect(() => {
    let isMounted = true;
    const importApp = async () => {
      try {
        const module = await import(`../apps/${app.componentPath}`);
        if (isMounted) setAppComponent(() => module.default);
      } catch (err) {
        console.error(`Failed to load app component: ${app.componentPath}`, err);
      }
    };
    importApp();
    return () => { isMounted = false; };
  }, [app.componentPath]);

  // Listen for desktop file hover events
  useEffect(() => {
    const handleFileHover = (event) => {
      const { appName, fileType, isHovering } = event.detail;
      
      if (appName === app.name && isHovering) {
        // Check if this app accepts the file type
        const appConfig = apps.find(a => a.name === app.name);
        const isCompatible = appConfig?.acceptedFileTypes?.includes(fileType);
        setShowDropOverlay(isCompatible);
      } else {
        setShowDropOverlay(false);
      }
    };

    window.addEventListener('desktop-file-hover-app', handleFileHover);
    return () => window.removeEventListener('desktop-file-hover-app', handleFileHover);
  }, [app.name]);

  return (
    <motion.div
      className="fixed"
      style={{ left: initialX, top: initialY, zIndex }}
      initial={{ scale: 0.85, opacity: 0, filter: 'blur(6px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      onMouseDown={() => onActivate(windowId)}
    >
      <motion.div
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
              className={app.name === 'Music' ? 'music-app-window rounded-xl overflow-hidden shadow-2xl' : 'panel-premium rounded-xl overflow-hidden shadow-2xl'}
      style={{ width: appSize.width, height: appSize.height, cursor: 'default' }}
      data-window-id={windowId}
        onMouseDown={(e) => {
          // Ensure click-through to activate happens
          e.stopPropagation();
          onActivate(windowId);
        }}
      >
        <div
          className={`flex items-center justify-between px-3 ${app.name === 'Music' ? 'py-1' : 'py-2'} border-b border-blue-900/30 bg-black/20`}
          style={{ cursor: 'move' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragControls.start(e);
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full panel-icon-premium flex items-center justify-center">
              <img src={app.icon} alt={app.name} className="w-5 h-5" />
            </div>
            <div className="text-blue-100 text-sm tracking-wide">{app.name}</div>
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { 
              e.stopPropagation(); 
              soundService.playAppClose(); 
              onClose(windowId); 
            }}
            className="text-blue-300 hover:text-blue-100 transition-colors px-2 py-1"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div 
          className={(app.name === 'Music' || app.name === 'Calculator' || app.name === '3D models') ? 'bg-transparent' : 'bg-black/30'} 
          style={{ width: '100%', height: 'calc(100% - 40px)', cursor: 'default' }}
          data-app-name={app.name}
        >
          {AppComponent ? (
            <AppComponent {...(appProps || {})} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {/* Drop overlay */}
          {showDropOverlay && (
            <div className="absolute inset-0 bg-blue-900/30 backdrop-blur-md border-2 border-blue-400/60 border-dashed rounded-lg flex items-center justify-center z-[150] pointer-events-none">
              <div className="flex flex-col items-center space-y-4 animate-pulse">
                <div className="w-20 h-20 rounded-full bg-blue-500/30 backdrop-blur-sm border-2 border-blue-400/70 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="text-blue-300 text-base font-semibold tracking-wide">Drop to open</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Resize handle */}
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10 ${isResizing ? 'bg-blue-400/40' : 'bg-transparent hover:bg-blue-400/20'} transition-colors`}
          onMouseDown={handleResizeStart}
          style={{
            background: isResizing 
              ? 'linear-gradient(-45deg, transparent 30%, rgba(59, 130, 246, 0.4) 30%, rgba(59, 130, 246, 0.4) 70%, transparent 70%)'
              : 'linear-gradient(-45deg, transparent 30%, rgba(59, 130, 246, 0.1) 30%, rgba(59, 130, 246, 0.1) 70%, transparent 70%)',
            backgroundSize: '6px 6px'
          }}
          title="Resize window"
        />
      </motion.div>
    </motion.div>
  );
};

export default AppWindow;


