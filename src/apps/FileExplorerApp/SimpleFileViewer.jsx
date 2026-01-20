import React, { useState, useEffect } from 'react';
import { CloseIcon } from './FileExplorerIcons';
import './file-viewer.css';

/**
 * Enhanced file viewer component with editing capabilities and animations
 */
const SimpleFileViewer = ({ file, onClose }) => {
  // Basic states from the original SimpleFileViewer
  const [fileContents, setFileContents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Additional states from FileViewer for editing and animation
  const [editableContent, setEditableContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);

  // Handle animations on component mount
  useEffect(() => {
    // Trigger animations in sequence
    setIsVisible(true);
    
    const timer1 = setTimeout(() => {
      setIsPanelVisible(true);
    }, 300);
    
    const timer2 = setTimeout(() => {
      setIsContentVisible(true);
    }, 800);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  
  // Load file contents for preview
  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!file || !file.handle) {
          throw new Error('Invalid file');
        }

        // Get the file from the handle
        const fileObj = await file.handle.getFile();
        
        // Determine file type
        const fileType = file.fileType || getFileTypeFromName(file.name);
        
        let contents = null;
        
        // Handle different file types - Skip images as they're now handled by ImageViewerOverlay
        if (isImageFile(file.name)) {
          contents = {
            type: 'image',
            url: URL.createObjectURL(fileObj)
          };
        } else if (fileType === 'pdf') {
          contents = {
            type: 'pdf',
            url: URL.createObjectURL(fileObj)
          };
        } else if (fileType === 'audio' || fileType === 'video') {
          contents = {
            type: fileType,
            url: URL.createObjectURL(fileObj),
            mimeType: fileObj.type
          };
        } else {
          // For text files, we read the text content
          // Limit text file size for performance
          if (fileObj.size > 1024 * 1024) {
            // If file is larger than 1MB, only show first 100KB
            const blob = fileObj.slice(0, 100 * 1024);
            const text = await blob.text();
            contents = {
              type: 'text',
              text: text + '\n\n[... File truncated due to size. Full size: ' + file.size + ' ...]'
            };
          } else {
            const text = await fileObj.text();
            contents = {
              type: 'text',
              text
            };
            setEditableContent(text);
          }
        }
        
        setFileContents(contents);
        setLoading(false);
      } catch (err) {
        console.error('Error loading file:', err);
        setError(`Failed to load file: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadFile();
    
    // Cleanup object URLs on unmount
    return () => {
      if (fileContents && fileContents.url) {
        URL.revokeObjectURL(fileContents.url);
      }
    };
  }, [file]);

  // Check if the file is an image based on extension
  const isImageFile = (filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
  };

  // Helper to determine file type from name
  const getFileTypeFromName = (filename) => {
    if (!filename) return 'text';
    const ext = filename.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      return 'image';
    } else if (ext === 'pdf') {
      return 'pdf';
    } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return 'audio';
    } else if (['mp4', 'webm', 'ogv', 'mov'].includes(ext)) {
      return 'video';
    } else {
      return 'text';
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle text editing
  const handleTextChange = (e) => {
    setEditableContent(e.target.value);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Save changes to file
  const saveChanges = async () => {
    if (!file || !file.handle) return;
    
    try {
      setIsSaving(true);
      
      // Get write permission
      const writable = await file.handle.createWritable();
      
      // Write the content
      await writable.write(editableContent);
      await writable.close();
      
      // Update the displayed content
      setFileContents({
        ...fileContents,
        text: editableContent
      });
      
      setIsSaving(false);
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving file:", err);
      setError(`Failed to save file: ${err.message}`);
      setIsSaving(false);
    }
  };
  
  // Handle close with animation
  const handleClose = () => {
    setIsContentVisible(false);
    setIsPanelVisible(false);
    
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 500);
  };

  // Generate CSS classes for animation states
  const containerClasses = [
    'file-viewer-container',
    isVisible ? 'visible' : '',
    isPanelVisible ? 'panel-visible' : '',
    isContentVisible ? 'content-visible' : ''
  ].filter(Boolean).join(' ');
  
  // Check if file can be edited (text files only)
  const canEdit = fileContents && fileContents.type === 'text';
  
  return (
    <div className="file-viewer-overlay" onClick={handleClose}>
      <div className={containerClasses} onClick={e => e.stopPropagation()}>
        {/* SVG Circuit Board Outline Animation */}
        <div className="viewer-outline-container">
          <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="none">
            <path 
              className="viewer-outline-path viewer-outline-path-upper"
              d="M 15,0 L 475,0 L 500,15 L 960,15 L 960,0 L 1000,0 L 1000,400"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            
            <path 
              className="viewer-outline-path viewer-outline-path-lower"
              d="M 1000,400 L 1000,770 L 985,800 L 700,800 L 680,790 L 300,790 L 280,800 L 15,800 L 0,785 L 0,15 L 15,0"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
          
          {/* Inner glow effect */}
          <div className="viewer-panel-glow"></div>
        </div>
        
        {/* File Viewer Panel */}
        <div className="file-viewer-panel">
          {/* Circuit board decorative elements */}
          <div className="circuit-element circuit-trace-h" style={{ top: '40px', left: '20px', width: '80px' }}></div>
          <div className="circuit-element circuit-trace-h" style={{ top: '40px', right: '20px', width: '60px' }}></div>
          <div className="circuit-element circuit-trace-v" style={{ top: '40px', left: '20px', height: '60px' }}></div>
          <div className="circuit-element circuit-node" style={{ top: '100px', left: '20px' }}></div>
          
          <div className="file-viewer-header">
            <div className="file-viewer-title">{file?.name || 'File Viewer'}</div>
            
            <div className="flex space-x-2">
              {canEdit && (
                <button
                  onClick={toggleEditMode}
                  disabled={loading || !!error}
                  className="viewer-btn bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 px-3 py-1.5 rounded text-sm"
                >
                  {isEditing ? 'Cancel Editing' : 'Edit'}
                </button>
              )}
              
              {isEditing && (
                <button
                  onClick={saveChanges}
                  disabled={isSaving}
                  className="viewer-save-btn bg-green-700/40 hover:bg-green-600/50 text-green-300 px-3 py-1.5 rounded text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              
              <button className="file-viewer-close" onClick={handleClose}>
                <CloseIcon />
              </button>
            </div>
          </div>
          
          <div className="file-viewer-content">
            {loading ? (
              <div className="file-viewer-loading">
                <div className="file-viewer-spinner"></div>
                <div>Loading file...</div>
              </div>
            ) : error ? (
              <div className="file-viewer-error">{error}</div>
            ) : fileContents ? (
              <>
                {fileContents.type === 'pdf' && (
                  <iframe 
                    src={fileContents.url} 
                    className="file-viewer-pdf" 
                    title={file.name} 
                  />
                )}
                
                {fileContents.type === 'audio' && (
                  <div className="file-viewer-audio-container">
                    <audio 
                      src={fileContents.url} 
                      controls
                      className="file-viewer-audio"
                    />
                  </div>
                )}
                
                {fileContents.type === 'video' && (
                  <div className="file-viewer-video-container">
                    <video 
                      src={fileContents.url}
                      controls
                      className="file-viewer-video"
                    />
                  </div>
                )}
                
                {fileContents.type === 'image' && (
                  <div className="file-viewer-image-container">
                    <img 
                      src={fileContents.url}
                      alt={file.name}
                      className="file-viewer-image"
                    />
                  </div>
                )}
                
                {fileContents.type === 'text' && isEditing ? (
                  <textarea 
                    value={editableContent}
                    onChange={handleTextChange}
                    className="file-viewer-editor bg-blue-950/50 border border-blue-900/40 rounded p-4 text-blue-200 font-mono text-sm"
                    spellCheck="false"
                  />
                ) : fileContents.type === 'text' && (
                  <pre className="file-viewer-text">
                    {fileContents.text}
                  </pre>
                )}
                
                {fileContents.type === 'unsupported' && (
                  <div className="file-viewer-message">
                    {fileContents.message}
                  </div>
                )}
              </>
            ) : (
              <div className="file-viewer-error">Unable to preview this file type.</div>
            )}
          </div>
          
          {/* Status Bar */}
          {fileContents && fileContents.type === 'text' && (
            <div className="viewer-status-bar mt-2 py-1 px-3 bg-blue-900/10 rounded border border-blue-900/20 text-blue-400/60 text-xs flex justify-between">
              <div>
                {file?.name || 'Unknown file'}
              </div>
              <div>
                {fileContents.text.length} characters | {fileContents.text.split('\n').length} lines
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleFileViewer;