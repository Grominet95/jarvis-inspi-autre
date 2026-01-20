import React, { useState, useEffect } from 'react';
import DesktopFile from './DesktopFile';
import soundService from '../services/soundService';

const DesktopManager = () => {
  const [desktopFiles, setDesktopFiles] = useState([]);
  const [draggedFile, setDraggedFile] = useState(null);

  useEffect(() => {
    // Load desktop files from localStorage
    const savedFiles = localStorage.getItem('desktop-files');
    if (savedFiles) {
      try {
        setDesktopFiles(JSON.parse(savedFiles));
      } catch (error) {
        console.error('Failed to load desktop files:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save desktop files to localStorage
    localStorage.setItem('desktop-files', JSON.stringify(desktopFiles));
  }, [desktopFiles]);

  useEffect(() => {
    // Listen for add-to-desktop events
    const handleAddToDesktop = (event) => {
      const eventData = event.detail;
      
      // Handle both old format (direct properties) and new format (file object)
      let newFile;
      if (eventData.file) {
        // New format from Drawing app or Image generation
        newFile = {
          ...eventData.file,
          id: eventData.file.id || Date.now() + Math.random(),
          x: eventData.file.x !== undefined ? Math.max(20, Math.min(eventData.file.x, window.innerWidth - 120)) : Math.random() * (window.innerWidth - 200) + 100,
          y: eventData.file.y !== undefined ? Math.max(20, Math.min(eventData.file.y, window.innerHeight - 120)) : Math.random() * (window.innerHeight - 300) + 150
        };
      } else {
        // Old format for backward compatibility
        const { type, name, url, x, y } = eventData;
        newFile = {
          id: Date.now() + Math.random(),
          type,
          name,
          url,
          x: x !== undefined ? Math.max(20, Math.min(x, window.innerWidth - 120)) : Math.random() * (window.innerWidth - 200) + 100,
          y: y !== undefined ? Math.max(20, Math.min(y, window.innerHeight - 120)) : Math.random() * (window.innerHeight - 300) + 150
        };
      }
      
      setDesktopFiles(prev => [...prev, newFile]);
      
      // Show notification
      const notification = new CustomEvent('show-notification', {
        detail: { 
          message: `Added ${newFile.name} to desktop`, 
          type: 'success',
          duration: 2000 
        }
      });
      window.dispatchEvent(notification);
    };

    window.addEventListener('add-to-desktop', handleAddToDesktop);
    return () => window.removeEventListener('add-to-desktop', handleAddToDesktop);
  }, []);

  const handleFileDrag = (fileId, isDragging, newX, newY) => {
    if (isDragging && newX !== undefined && newY !== undefined) {
      // Update file position during drag
      setDesktopFiles(prev => prev.map(file => 
        file.id === fileId 
          ? { 
              ...file, 
              x: Math.max(0, Math.min(newX, window.innerWidth - 120)),
              y: Math.max(0, Math.min(newY, window.innerHeight - 120))
            }
          : file
      ));
    }
    
    setDraggedFile(isDragging ? fileId : null);
  };

  const handleFileDrop = (file, dropTarget) => {
    if (dropTarget === 'viewer' && file.type === 'stl-model') {
      // Open in 3D Viewer
      const event = new CustomEvent('open-app', {
        detail: { 
          name: '3D Viewer', 
          props: { 
            initialModelUrl: file.url, 
            initialModelName: file.name 
          } 
        }
      });
      window.dispatchEvent(event);
    }
    // For 'desktop' drop, file position is already updated by handleFileDrag
  };

  const handleFileDoubleClick = (file) => {
    if (file.type === 'stl-model') {
      // Open in 3D Viewer
      const event = new CustomEvent('open-app', {
        detail: { 
          name: '3D Viewer', 
          props: { 
            initialModelUrl: file.url, 
            initialModelName: file.name 
          } 
        }
      });
      window.dispatchEvent(event);
    } else if (file.type === 'drawing') {
      // For now, show a simple image viewer or could open in Drawing app
      // Create a simple image viewer window
      const imageWindow = window.open('', '_blank', 'width=800,height=600');
      if (imageWindow) {
        imageWindow.document.write(`
          <html>
            <head><title>${file.name}</title></head>
            <body style="margin:0; padding:20px; background:#000; display:flex; align-items:center; justify-content:center;">
              <img src="${file.data}" alt="${file.name}" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </body>
          </html>
        `);
        imageWindow.document.close();
      }
    } else if (file.type === 'image') {
      // Open in the built-in image viewer
      window.dispatchEvent(new CustomEvent('open-image-viewer', {
        detail: {
          prompt: file.prompt || file.name,
          isStreaming: false
        }
      }));
      
      // Update the image viewer with the saved image data
      window.dispatchEvent(new CustomEvent('image-generation-update', {
        detail: {
          type: 'final',
          imageData: file.data,
          isComplete: true,
          revisedPrompt: file.prompt || file.name
        }
      }));
    }
  };

  const handleDeleteFile = (fileId) => {
    soundService.playAppClose();
    setDesktopFiles(prev => prev.filter(file => file.id !== fileId));
  };

  return (
    <>
      {desktopFiles.map(file => (
        <DesktopFile
          key={file.id}
          file={file}
          onDrag={handleFileDrag}
          onDrop={handleFileDrop}
          onDoubleClick={handleFileDoubleClick}
          onDelete={handleDeleteFile}
          isDragging={draggedFile === file.id}
        />
      ))}
      
      {/* Context menu for desktop files (future enhancement) */}
      {/* Right-click menu could include: Open, Delete, Properties */}
    </>
  );
};

export default DesktopManager;
