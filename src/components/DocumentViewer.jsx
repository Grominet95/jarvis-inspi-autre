import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../styles/document-viewer.css';

const DocumentViewer = ({ 
  isVisible, 
  onClose, 
  content, 
  title = "Document Viewer",
  sources = []
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const windowRef = useRef(null);
  const contentRef = useRef(null);

  // Handle window dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.document-viewer-header')) {
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
    setIsResizing(false);
  };

  // Handle window resizing
  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset]);

  // Custom components for markdown rendering
  const components = {
    // Make links clickable and open in new tab
    a: ({ href, children }) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="document-link"
      >
        {children}
      </a>
    ),
    // Style images
    img: ({ src, alt }) => (
      <img 
        src={src} 
        alt={alt} 
        className="document-image"
        loading="lazy"
      />
    ),
    // Style code blocks
    code: ({ inline, className, children }) => {
      if (inline) {
        return <code className="document-inline-code">{children}</code>;
      }
      return <pre className="document-code-block"><code>{children}</code></pre>;
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="document-viewer-overlay"
      style={{ zIndex: 10000 }}
    >
      <div
        ref={windowRef}
        className="document-viewer-window"
        style={{
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="document-viewer-header">
          <div className="document-viewer-title">
            📄 {title}
          </div>
          <button 
            className="document-viewer-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div 
          ref={contentRef}
          className="document-viewer-content"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {content}
          </ReactMarkdown>

          {/* Sources section */}
          {sources.length > 0 && (
            <div className="document-sources">
              <h3>🔗 Sources</h3>
              <ul>
                {sources.map((source, index) => (
                  <li key={index}>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {source.title || source.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div 
          className="document-viewer-resize-handle"
          onMouseDown={handleResizeMouseDown}
        />
      </div>
    </div>
  );
};

export default DocumentViewer;

