import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './image-viewer.css';

/**
 * Enhanced Image Viewer Overlay with fullscreen capability and circuit animations
 */
const ImageViewerOverlay = ({ file, imageUrl, onClose }) => {
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageContainerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Animation states - using viewer-specific names
  const [showViewerOutline, setShowViewerOutline] = useState(false);
  const [showViewerGrid, setShowViewerGrid] = useState(false);
  const [showViewerContent, setShowViewerContent] = useState(false);
  const [showViewerCorners, setShowViewerCorners] = useState(false);
  
  // Animation sequence on mount
  useEffect(() => {
    // Start animations in sequence
    const timer1 = setTimeout(() => {
      setIsViewerVisible(true);
    }, 50);
    
    const timer2 = setTimeout(() => {
      setShowViewerOutline(true);
    }, 100);
    
    const timer3 = setTimeout(() => {
      setShowViewerGrid(true);
    }, 400);
    
    const timer4 = setTimeout(() => {
      setShowViewerCorners(true);
    }, 700);
    
    const timer5 = setTimeout(() => {
      setShowViewerContent(true);
    }, 900);
    
    return () => {
      [timer1, timer2, timer3, timer4, timer5].forEach(clearTimeout);
    };
  }, []);
  
  // Add event listener for escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          exitFullscreen();
        } else {
          handleClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isFullscreen]);
  
  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = 
        document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement;
        
      setIsFullscreen(!!fullscreenElement);
      
      // Reset position and scale when exiting fullscreen
      if (!fullscreenElement) {
        setPosition({ x: 0, y: 0 });
        setScale(1);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);
  
  // Handle toggling fullscreen
  const enterFullscreen = () => {
    if (!imageContainerRef.current) return;
    
    try {
      if (imageContainerRef.current.requestFullscreen) {
        imageContainerRef.current.requestFullscreen();
      } else if (imageContainerRef.current.webkitRequestFullscreen) {
        imageContainerRef.current.webkitRequestFullscreen();
      } else if (imageContainerRef.current.mozRequestFullScreen) {
        imageContainerRef.current.mozRequestFullScreen();
      } else if (imageContainerRef.current.msRequestFullscreen) {
        imageContainerRef.current.msRequestFullscreen();
      }
    } catch (err) {
      console.error("Error entering fullscreen:", err);
    }
  };
  
  const exitFullscreen = () => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (err) {
      console.error("Error exiting fullscreen:", err);
    }
  };
  
  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };
  
  // Handle zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const resetZoom = () => setScale(1);
  
  // Handle image dragging (when zoomed)
  const handleMouseDown = (e) => {
    if (scale > 1 && !isFullscreen) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Handle close with animation
  const handleClose = () => {
    // Reverse animation sequence
    setShowViewerContent(false);
    setShowViewerCorners(false);
    
    setTimeout(() => {
      setShowViewerGrid(false);
      setShowViewerOutline(false);
      
      setTimeout(() => {
        setIsViewerVisible(false);
        setTimeout(onClose, 300);
      }, 200);
    }, 100);
  };
  
  // Generate animation classes - ensuring unique naming
  const overlayClasses = [
    'image-viewer-overlay',
    isViewerVisible ? 'viewer-visible' : ''
  ].filter(Boolean).join(' ');
  
  const containerClasses = [
    'image-viewer-container',
    isFullscreen ? 'viewer-fullscreen' : '',
    showViewerGrid ? 'viewer-show-grid' : '',
    showViewerContent ? 'viewer-show-content' : '',
    showViewerCorners ? 'viewer-show-corners' : '',
    showViewerOutline ? 'viewer-show-outline' : ''
  ].filter(Boolean).join(' ');
  
  // Create the viewer component
  const viewerContent = (
    <div className={overlayClasses} onClick={handleClose}>
      {/* SVG Circuit Outline Animation */}
      <div className="image-viewer-outline-container">
        <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="none">
          {/* Upper half path - starts from top left and traces clockwise */}
          <path 
            className="image-viewer-outline-path image-viewer-outline-path-upper"
            d="M 15,0 L 475,0 L 500,15 L 960,15 L 960,0 L 1000,0 L 1000,400"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          
          {/* Lower half path - starts from bottom right and traces counterclockwise */}
          <path 
            className="image-viewer-outline-path image-viewer-outline-path-lower"
            d="M 1000,400 L 1000,770 L 985,800 L 700,800 L 680,790 L 300,790 L 280,800 L 15,800 L 0,785 L 0,15 L 15,0"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
        
        {/* Inner glow effect */}
        <div className="image-viewer-panel-glow"></div>
      </div>
      
      <div className={containerClasses} onClick={e => e.stopPropagation()} ref={imageContainerRef}>
        {/* Holographic Grid Animation */}
        <div className="image-viewer-grid-container">
          <div className="image-viewer-grid horizontal-grid"></div>
          <div className="image-viewer-grid vertical-grid"></div>
          <div className="image-viewer-scan-effect"></div>
          
          {/* Corner Brackets */}
          <div className="image-viewer-corners">
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-right"></div>
            <div className="corner bottom-left"></div>
          </div>
        </div>
        
        {/* Image container with zoom */}
        <div 
          className="image-content"
          onMouseDown={handleMouseDown}
          style={{ cursor: scale > 1 && !isFullscreen ? 'grab' : 'default' }}
        >
          <img 
            src={imageUrl} 
            alt={file?.name || 'Image'} 
            className="image-display"
            style={{ 
              transform: `scale(${scale})`,
              ...(scale > 1 && !isFullscreen && { 
                transformOrigin: 'center',
                translate: `${position.x}px ${position.y}px` 
              })
            }}
            onDragStart={e => e.preventDefault()}
          />
        </div>
        
        {/* Controls overlay */}
        <div className="image-controls">
          <div className="image-title">
            {file?.name || 'Image'}
          </div>
          
          <div className="image-actions">
            <div className="zoom-controls">
              <button onClick={zoomOut} className="zoom-btn" title="Zoom out">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
              <button onClick={resetZoom} className="zoom-btn" title="Reset zoom">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
              <button onClick={zoomIn} className="zoom-btn" title="Zoom in">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </button>
            </div>
            
            <button onClick={toggleFullscreen} className="fullscreen-btn" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              )}
            </button>
            
            <button onClick={handleClose} className="close-btn" title="Close">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Circuit decorative elements */}
        <div className="circuit-element circuit-trace-h" style={{ top: '40px', right: '20px', width: '60px' }}></div>
        <div className="circuit-element circuit-trace-h" style={{ bottom: '90px', left: '30px', width: '100px' }}></div>
        
        <div className="circuit-element circuit-trace-v" style={{ top: '40px', right: '20px', height: '100px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ bottom: '90px', left: '30px', height: '60px' }}></div>
        
        <div className="circuit-element circuit-node" style={{ top: '140px', right: '20px' }}></div>
        <div className="circuit-element circuit-node" style={{ bottom: '150px', left: '30px' }}></div>
        
        <div className="circuit-element circuit-dot" style={{ top: '70px', right: '50px' }}></div>
        <div className="circuit-element circuit-dot" style={{ bottom: '120px', left: '80px' }}></div>
      </div>
    </div>
  );

  // Use React Portal to render outside of the component hierarchy
  return ReactDOM.createPortal(
    viewerContent,
    document.body
  );
};

export default ImageViewerOverlay;
