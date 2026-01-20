import React, { useState, useRef, useEffect } from 'react';
import '../styles/image-viewer.css';

const ImageViewer = ({ 
  isVisible, 
  onClose, 
  imageData,
  originalPrompt,
  revisedPrompt,
  onSaveToDesktop,
  onDownload
}) => {
  const [position, setPosition] = useState({ x: 150, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentImage, setCurrentImage] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState('');
  
  const windowRef = useRef(null);
  const imageRef = useRef(null);

  // Handle window dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.image-viewer-header')) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Reset when viewer becomes visible
  useEffect(() => {
    if (isVisible) {
      // Reset state when opening
      setCurrentImage(null);
      setIsStreaming(true);
      setStreamingProgress('Preparing...');
    }
  }, [isVisible]);

  // Update image when imageData changes
  useEffect(() => {
    if (imageData && isVisible) {
      if (imageData.type === 'partial') {
        setIsStreaming(true);
        setStreamingProgress(`Generating... (${imageData.index + 1})`);
        setCurrentImage(`data:image/png;base64,${imageData.imageData}`);
      } else if (imageData.type === 'final') {
        setIsStreaming(false);
        setStreamingProgress('');
        setCurrentImage(`data:image/png;base64,${imageData.imageData}`);
      } else if (typeof imageData === 'string') {
        // Direct base64 data
        setIsStreaming(false);
        setStreamingProgress('');
        setCurrentImage(`data:image/png;base64,${imageData}`);
      } else if (imageData.imageData) {
        // Handle case where imageData has imageData property but no type
        setIsStreaming(false);
        setStreamingProgress('');
        setCurrentImage(`data:image/png;base64,${imageData.imageData}`);
      }
    }
  }, [imageData, isVisible]);

  const handleSaveToDesktop = () => {
    if (onSaveToDesktop && imageData) {
      const base64Data = typeof imageData === 'string' ? imageData : imageData.imageData;
      onSaveToDesktop(base64Data, originalPrompt || 'Generated Image');
    }
  };

  const handleDownload = () => {
    if (onDownload && imageData) {
      const base64Data = typeof imageData === 'string' ? imageData : imageData.imageData;
      onDownload(base64Data, originalPrompt || 'Generated Image');
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="image-viewer-overlay"
      style={{ zIndex: 10001 }}
    >
      <div
        ref={windowRef}
        className="image-viewer-window"
        style={{
          left: position.x,
          top: position.y,
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="image-viewer-header">
        <div className="image-viewer-title">
          {isStreaming ? (
            <span>🎨 {streamingProgress}</span>
          ) : (
            <span title={originalPrompt}>🎨 {originalPrompt || 'Generated Image'}</span>
          )}
        </div>
          <button 
            className="image-viewer-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="image-viewer-content">
          {currentImage ? (
            <div className="image-container">
              <img 
                ref={imageRef}
                src={currentImage}
                alt={originalPrompt || 'Generated Image'}
                className={`generated-image ${isStreaming ? 'streaming' : ''}`}
                loading="lazy"
              />
              
              {/* Streaming overlay */}
              {isStreaming && (
                <div className="streaming-overlay">
                  <div className="streaming-indicator">
                    <div className="streaming-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="streaming-text">Generating...</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <div className="loading-text">Generating your image...</div>
            </div>
          )}

          {/* Image Info */}
          {originalPrompt && !isStreaming && (
            <div className="image-info">
              <div className="prompt-section">
                <h4>Original Prompt:</h4>
                <p>{originalPrompt}</p>
              </div>
              
              {revisedPrompt && revisedPrompt !== originalPrompt && (
                <div className="prompt-section">
                  <h4>Revised Prompt:</h4>
                  <p>{revisedPrompt}</p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {currentImage && !isStreaming && (
            <div className="image-actions">
              <button 
                className="action-btn save-btn"
                onClick={handleSaveToDesktop}
                title="Save to Desktop"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Save to Desktop
              </button>
              
              <button 
                className="action-btn download-btn"
                onClick={handleDownload}
                title="Download Image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;
