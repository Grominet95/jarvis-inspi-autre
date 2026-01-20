import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { isImageFile, formatFileSize, formatDate } from './FileViewerUtils';
import './file-viewer.css';

/**
 * Enhanced file viewer component with tech UI styling
 * @param {Object} props - Component props
 * @param {Object} props.file - File object to display
 * @param {Function} props.onClose - Function called when closing the viewer
 * @returns {React.Component} File viewer component
 */
const FileViewer = ({ file, onClose }) => {
  const [content, setContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // State for resizing
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 700, height: 500 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  
  // Animation states
  const [isContentVisible, setIsContentVisible] = useState(false);
  
  // Refs for dragging and resizing
  const containerRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => centerViewerOnScreen();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center the viewer on screen
  const centerViewerOnScreen = () => {
    if (!containerRef.current) return;
    
    const element = containerRef.current;
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    setPosition({
      x: Math.max(0, (windowWidth - rect.width) / 2),
      y: Math.max(0, (windowHeight - rect.height) / 2)
    });
  };

  // Load file content
  useEffect(() => {
    setIsMounted(true);
    
    const loadFile = async () => {
      if (!file || !file.handle) {
        setError("Invalid file");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const fileObj = await file.handle.getFile();
        
        if (isImageFile(file.name)) {
          const objectUrl = URL.createObjectURL(fileObj);
          setContent(objectUrl);
          setIsLoading(false);
          
          setTimeout(() => {
            centerViewerOnScreen();
            // Trigger circuit animation after positioning
            setIsContentVisible(true);
          }, 100);
        } else {
          const text = await fileObj.text();
          setContent(text);
          setIsLoading(false);
          
          setTimeout(() => {
            centerViewerOnScreen();
            setIsContentVisible(true);
          }, 100);
        }
      } catch (err) {
        console.error("Error loading file:", err);
        setError(`Failed to load file: ${err.message}`);
        setIsLoading(false);
      }
    };

    loadFile();
    
    return () => {
      if (content && isImageFile(file?.name)) {
        URL.revokeObjectURL(content);
      }
    };
  }, [file]);

  // Initial positioning after mounting
  useEffect(() => {
    if (isMounted && !isLoading) {
      centerViewerOnScreen();
    }
  }, [isMounted, isLoading]);
  
  // Start dragging
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('viewer-drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };
  
  // Handle dragging
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const newWidth = initialSize.width + (e.clientX - resizeStart.x);
      const newHeight = initialSize.height + (e.clientY - resizeStart.y);
      
      const minWidth = 300;
      const minHeight = 200;
      
      setSize({
        width: Math.max(minWidth, newWidth),
        height: Math.max(minHeight, newHeight)
      });
    }
  };
  
  // End dragging or resizing
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  
  // Start resizing
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const rect = containerRef.current.getBoundingClientRect();
    setInitialSize({
      width: rect.width,
      height: rect.height
    });
    
    setResizeStart({
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Set up/remove global event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
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
  }, [isDragging, isResizing]);

  // Helper function to close with animation
  const handleClose = () => {
    setIsContentVisible(false);
    setTimeout(() => onClose(), 300); // Delay closing to show animation
  };

  // Render the viewer in a portal
  return ReactDOM.createPortal(
    <div className="file-viewer-backdrop">
      <div 
        ref={containerRef}
        className={`file-viewer-container ${isContentVisible ? 'content-visible' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ 
          width: `${size.width}px`, 
          height: `${size.height}px`,
          left: `${position.x}px`, 
          top: `${position.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Circuit board decorative elements */}
        <div className="circuit-trace-h top-left"></div>
        <div className="circuit-trace-h top-right"></div>
        <div className="circuit-trace-v top-left"></div>
        <div className="circuit-trace-v top-right"></div>
        <div className="circuit-connector top-left"></div>
        <div className="circuit-connector top-right"></div>
        <div className="circuit-node left-mid"></div>
        <div className="circuit-node right-mid"></div>
        <div className="circuit-dot top-left-offset"></div>
        <div className="circuit-dot top-right-offset"></div>
        
        {/* Card decorative notches */}
        <div className="card-notch top-right"></div>
        <div className="card-notch bottom-left"></div>

        {/* Inner glow effect */}
        <div className="viewer-panel-glow"></div>

        {/* Draggable header with enhanced circuit styling */}
        <div className="viewer-header viewer-drag-handle" onMouseDown={handleMouseDown}>
          {/* Header underline with gradient */}
          <div className="header-underline"></div>
          
          {/* Additional circuit connector between header and body */}
          <div className="header-connector"></div>

          <h2 className="viewer-title">
            {file?.name || 'File Preview'}
          </h2>
          
          <button onClick={handleClose} className="viewer-close-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {/* Content container with animations */}
        <div className="viewer-content">
          {isLoading ? (
            <div className="viewer-loading">
              <div className="spinner"></div>
              <span>Loading file...</span>
            </div>
          ) : error ? (
            <div className="viewer-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-center">{error}</p>
            </div>
          ) : isImageFile(file?.name) ? (
            <div className="viewer-image-container">
              <img 
                src={content}
                alt={file?.name || 'Image'}
                className="viewer-image"
              />
            </div>
          ) : (
            <div className="viewer-text-content">
              {content}
            </div>
          )}
        </div>
        
        {/* Resize handle */}
        <div className="resize-handle" onMouseDown={handleResizeStart}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 17 17 17 17 7" />
          </svg>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FileViewer;
