/**
 * Utility functions for the FileExplorerApp
 */

// Format file size to human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Get file type from extension
export const getFileType = (filename) => {
  if (!filename) return 'text';
  
  const ext = filename.split('.').pop().toLowerCase();
  
  switch (ext) {
    case 'jsx': return 'jsx';
    case 'js': return 'javascript';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'json': return 'json';
    case 'md': return 'markdown';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg': return 'image';
    case 'mp3':
    case 'wav':
    case 'ogg': return 'audio';
    case 'mp4':
    case 'webm': return 'video';
    case 'pdf': return 'pdf';
    default: return 'text';
  }
};

// Format date nicely
export const formatDate = (dateVal) => {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Store directory handle in IndexedDB for persistence between sessions
export const saveDirectoryHandle = async (handle) => {
  if (!handle) return;
  
  try {
    // Open/create IndexedDB database
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('HoloMatFileSystem', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Store the directory handle
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('handles', 'readwrite');
      const store = transaction.objectStore('handles');
      
      const request = store.put({ id: 'currentDirectory', handle: handle });
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save directory handle:", error);
    return false;
  }
};

// Load directory handle from IndexedDB
export const loadDirectoryHandle = async () => {
  try {
    // Open IndexedDB database
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('HoloMatFileSystem', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Get the directory handle
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('handles', 'readonly');
      const store = transaction.objectStore('handles');
      
      const request = store.get('currentDirectory');
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.handle);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load directory handle:", error);
    return null;
  }
};