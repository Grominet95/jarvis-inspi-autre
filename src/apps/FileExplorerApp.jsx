import React, { useState, useEffect, useRef } from 'react';
import './FileExplorerApp/file-explorer.css';

// Import components from our modules
import DirectoryNavigation from './FileExplorerApp/DirectoryNavigation';
import FileGrid from './FileExplorerApp/FileGrid';
import FileListView from './FileExplorerApp/FileListView';
import FileDetailsPanel from './FileExplorerApp/FileDetailsPanel';
import SimpleFileViewer from './FileExplorerApp/SimpleFileViewer';
import ImageViewerOverlay from './FileExplorerApp/ImageViewerOverlay';

// Import utilities and icons
import { formatFileSize, formatDate, getFileType, saveDirectoryHandle, loadDirectoryHandle } from './FileExplorerApp/FileExplorerUtils';
import { SearchIcon, GridViewIcon, ListViewIcon, EmptyFolderIcon, ErrorIcon } from './FileExplorerApp/FileExplorerIcons';

const FileExplorerApp = ({ onClose }) => {
  // State for modern File System API access
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [fsSupported, setFsSupported] = useState(false);
  
  // State for file system navigation
  const [currentPath, setCurrentPath] = useState(['root']);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderContents, setFolderContents] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('name'); // name, size, modified
  const [sortDirection, setSortDirection] = useState('asc'); // asc, desc
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('prompt');
  const [showPrompt, setShowPrompt] = useState(false);
  
  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [animatingItem, setAnimatingItem] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Refs
  const filesRef = useRef(null);
  const appRef = useRef(null);
  const refreshingRef = useRef(false);

  // Handle animations on component mount
  useEffect(() => {
    // Trigger animations in sequence
    setIsVisible(true);
    setShowOutline(true);
    
    const timer1 = setTimeout(() => {
      setIsPanelVisible(true);
    }, 150); // Reduced from 300ms
    
    const timer2 = setTimeout(() => {
      setShowOutline(false);
      setIsContentVisible(true);
    }, 700); // Reduced from 1200ms
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  
  // Check if File System Access API is supported and try to auto-open last directory
  useEffect(() => {
    const initFileSystem = async () => {
      if ('showDirectoryPicker' in window) {
        setFsSupported(true);
        
        // Try to get previously granted directory permission
        try {
          // Try to load from IndexedDB
          const savedDirHandle = await loadDirectoryHandle();
          
          if (savedDirHandle) {
            // Check if permission still valid
            const permissionStatus = await savedDirHandle.queryPermission({ mode: 'read' });
            
            if (permissionStatus === 'granted') {
              setDirectoryHandle(savedDirHandle);
              setCurrentPath(['root']);
              await readDirectory(savedDirHandle);
              setIsLoading(false);
              setIsInitialLoading(false);
              return; // Successfully reopened previous directory
            } else if (permissionStatus === 'prompt') {
              // Need to request permission again
              const newPermission = await savedDirHandle.requestPermission({ mode: 'read' });
              
              if (newPermission === 'granted') {
                setDirectoryHandle(savedDirHandle);
                setCurrentPath(['root']);
                await readDirectory(savedDirHandle);
                setIsLoading(false);
                setIsInitialLoading(false);
                return; // Successfully reopened with re-permission
              }
            }
          }
          
          // If we couldn't get previous directory, show the open prompt
          setIsLoading(false);
          setIsInitialLoading(false);
          setShowPrompt(true);
        } catch (error) {
          console.log("Error auto-opening directory:", error);
          setIsLoading(false);
          setIsInitialLoading(false);
          setShowPrompt(true);
        }
      } else {
        console.log("File System Access API not supported.");
        setFsSupported(false);
        setIsLoading(false);
        setIsInitialLoading(false);
        setErrorMessage("Your browser doesn't support file system access. Please use Chrome or Edge.");
      }
    };
    
    // Start initialization
    initFileSystem();
    
    // Set timeout to cancel the loading state after 5 seconds
    // This prevents the dialog from being stuck if browser blocks the permission request
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsInitialLoading(false);
      setShowPrompt(true);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle directory picker - updated with better error handling
  const openDirectoryPicker = async () => {
    if (!fsSupported) {
      setErrorMessage("Your browser doesn't support the File System Access API. Please use Chrome or Edge.");
      return;
    }

    try {
      setIsInitialLoading(true); // Only set initial loading for directory picker
      setIsLoading(true);
      setErrorMessage('');
      setShowPrompt(false);
      
      // Show directory picker with smart defaults
      const options = {
        id: 'HoloMatProjectDirectory',
        mode: 'readwrite',
        // Suggest Documents directory as a smart default
        startIn: 'documents'
      };

      // Show directory picker dialog to user
      const handle = await window.showDirectoryPicker(options);
      setDirectoryHandle(handle);
      setCurrentPath(['root']);
      
      // Save for future auto-open
      await saveDirectoryHandle(handle);
      
      // Read initial directory contents
      await readDirectory(handle);
      setIsLoading(false);
      setIsInitialLoading(false);
      setShowPrompt(false);
    } catch (error) {
      console.error("Error opening directory:", error);
      
      // Determine what kind of error occurred
      let errorMsg = "Failed to access directory";
      if (error.name === 'AbortError') {
        errorMsg = "Directory selection was cancelled";
      } else if (error.name === 'SecurityError') {
        errorMsg = "Permission denied to access directory";
      }
      
      setErrorMessage(errorMsg);
      setIsLoading(false);
      setIsInitialLoading(false);
      setShowPrompt(true);
    }
  };
  
  // Enhanced read directory contents using File System Access API
  const readDirectory = async (dirHandle) => {
    try {
      setIsContentLoading(true);
      
      // Reset animations if we're changing directories
      if (filesRef.current) {
        filesRef.current.classList.add('refreshing');
        refreshingRef.current = true;
      }
      
      const contents = [];
      
      // Iterate through directory entries
      for await (const [name, handle] of dirHandle.entries()) {
        const item = {
          name,
          handle,
          type: handle.kind
        };
        
        if (handle.kind === 'file') {
          const file = await handle.getFile();
          item.size = formatFileSize(file.size);
          item.modified = formatDate(file.lastModified);
          item.fileType = getFileType(file.name);
        }
        
        contents.push(item);
      }
      
      // Sort contents and set state
      setFolderContents(contents);
      setCurrentFolder({ type: "folder", content: contents });
      
      // Add small delay before showing content for smoother animation
      setTimeout(() => {
        setIsContentLoading(false);
        
        // Remove refreshing class after animation completes
        if (filesRef.current && refreshingRef.current) {
          setTimeout(() => {
            if (filesRef.current) {
              filesRef.current.classList.remove('refreshing');
              refreshingRef.current = false;
            }
          }, 800); // Wait for animations to finish
        }
      }, 100);
    } catch (error) {
      console.error("Error reading directory:", error);
      setErrorMessage("Failed to read directory contents: " + error.message);
      setIsContentLoading(false);
      
      if (filesRef.current) {
        filesRef.current.classList.remove('refreshing');
        refreshingRef.current = false;
      }
    }
  };

  // Navigate to a different directory
  const navigateTo = async (dirName) => {
    // Clear animation state immediately when navigating
    setAnimatingItem(null);
    
    if (dirName === '..') {
      // Navigate up one level
      if (currentPath.length > 1) {
        const newPath = currentPath.slice(0, -1);
        setCurrentPath(newPath);
        
        // Add navigation animation
        setIsNavigating(true);
        if (filesRef.current) {
          filesRef.current.classList.add('navigating');
        }
        
        try {
          let handle = directoryHandle;
          
          // Skip the 'root' part of the path
          for (let i = 1; i < newPath.length; i++) {
            handle = await handle.getDirectoryHandle(newPath[i]);
          }
          
          await readDirectory(handle);
          
          // Remove navigation animation
          setTimeout(() => {
            setIsNavigating(false);
            if (filesRef.current) {
              filesRef.current.classList.remove('navigating');
            }
          }, 300);
        } catch (error) {
          console.error("Error navigating directory:", error);
          setErrorMessage("Failed to navigate to parent directory: " + error.message);
          setIsNavigating(false);
          if (filesRef.current) {
            filesRef.current.classList.remove('navigating');
          }
        }
      }
    } else {
      // Navigate down into folder
      const newPath = [...currentPath, dirName];
      setCurrentPath(newPath);
      
      // Add navigation animation
      setIsNavigating(true);
      if (filesRef.current) {
        filesRef.current.classList.add('navigating');
      }
      
      try {
        let handle = directoryHandle;
        
        // Skip the 'root' part of the path
        for (let i = 1; i < newPath.length; i++) {
          handle = await handle.getDirectoryHandle(newPath[i]);
        }
        
        await readDirectory(handle);
        
        // Remove navigation animation
        setTimeout(() => {
          setIsNavigating(false);
          if (filesRef.current) {
            filesRef.current.classList.remove('navigating');
          }
        }, 300);
      } catch (error) {
        console.error("Error navigating directory:", error);
        setErrorMessage("Failed to navigate to directory: " + dirName);
        setIsNavigating(false);
        if (filesRef.current) {
          filesRef.current.classList.remove('navigating');
        }
      }
    }
    
    setSelectedItem(null);
    setIsSearching(false);
    setSearchQuery('');
  };

  // Get sorted items
  const getSortedItems = () => {
    if (isSearching && searchResults.length > 0) {
      return searchResults;
    }
    
    return [...folderContents].sort((a, b) => {
      // First sort by type (folders first)
      if (a.type !== b.type) {
        return a.type === 'directory' || a.type === 'folder' ? -1 : 1;
      }
      
      // Then sort by the selected sort field
      switch (sortBy) {
        case 'name':
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'size':
          if (a.type === 'directory' || a.type === 'folder' || b.type === 'directory' || b.type === 'folder') return 0;
          const sizeA = a.size ? parseFloat(a.size) : 0;
          const sizeB = b.size ? parseFloat(b.size) : 0;
          return sortDirection === 'asc' ? sizeA - sizeB : sizeB - sizeA;
        case 'modified':
          if (!a.modified || !b.modified) return 0;
          return sortDirection === 'asc'
            ? new Date(a.modified) - new Date(b.modified)
            : new Date(b.modified) - new Date(a.modified);
        default:
          return 0;
      }
    });
  };
  
  // Event handlers for various actions
  // Change sort method
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // Search functionality
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Basic search on current directory only
    const results = folderContents.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };
  
  // Item click handler with animations
  const handleItemClick = (item, index) => {
    if (item.type === 'directory' || item.type === 'folder') {
      // Set the animating item for folder
      setAnimatingItem({id: index, type: 'folder', name: item.name});
      
      // Delay navigation until animation plays for a moment
      setTimeout(() => {
        navigateTo(item.name);
      }, 300); // Short delay to let animation be visible before navigation
      
      // Clear animation state after full animation duration
      setTimeout(() => setAnimatingItem(null), 800);
    } else {
      // First set animating item for file selection
      setAnimatingItem({id: index, type: 'file', name: item.name});
      
      // Small delay before setting selected item to prevent visual blink
      setTimeout(() => {
        setSelectedItem(item);
      }, 50);
      
      // Clear animation state after full animation duration
      setTimeout(() => setAnimatingItem(null), 800);
    }
  };

  // File preview handlers
  const openPreview = (file) => {
    // Check if it's an image file
    const isImage = file.fileType === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(
      file.name.split('.').pop().toLowerCase()
    );
    
    if (isImage) {
      // For images, use our dedicated image viewer
      openImagePreview(file);
    } else {
      // For other files, use the regular file viewer
      setPreviewFile(file);
    }
  };
  
  const closePreview = () => {
    setPreviewFile(null);
  };
  
  const openImagePreview = async (file) => {
    try {
      const fileObj = await file.handle.getFile();
      const imageUrl = URL.createObjectURL(fileObj);
      setImagePreview({ file, imageUrl });
    } catch (err) {
      console.error('Error creating image preview:', err);
    }
  };
  
  const closeImagePreview = () => {
    if (imagePreview && imagePreview.imageUrl) {
      URL.revokeObjectURL(imagePreview.imageUrl);
    }
    setImagePreview(null);
  };
  
  // Get current items to display
  const getCurrentItems = () => {
    return getSortedItems();
  };

  // Generate CSS classes for animation states
  const containerClasses = [
    'file-explorer-container',
    isVisible ? 'visible' : '',
    isPanelVisible ? 'panel-visible' : '',
    isContentVisible ? 'content-visible' : '',
    showOutline ? 'show-outline' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} ref={appRef} style={{pointerEvents: 'auto'}}>
      {/* SVG Circuit Board Outline Animation */}
      <div className="explorer-outline-container">
        <svg width="100%" height="100%" viewBox="0 0 1000 800" preserveAspectRatio="none">
          {/* Upper half path - starts from top left and traces clockwise */}
          <path 
            className="explorer-outline-path explorer-outline-path-upper"
            d="M 15,0 L 475,0 L 500,15 L 960,15 L 960,0 L 1000,0 L 1000,400"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          
          {/* Lower half path - starts from bottom right and traces counterclockwise */}
          <path 
            className="explorer-outline-path explorer-outline-path-lower"
            d="M 1000,400 L 1000,770 L 985,800 L 700,800 L 680,790 L 300,790 L 280,800 L 15,800 L 0,785 L 0,15 L 15,0"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
        
        {/* Inner glow effect that appears as the outline completes */}
        <div className="explorer-panel-glow"></div>
      </div>
      
      {/* Explorer Panel with Circuit Board styling */}
      <div className="file-explorer-panel" style={{pointerEvents: 'auto', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden'}}>
        {/* Circuit board decorative elements */}
        <div className="circuit-element circuit-trace-h" style={{ top: '40px', left: '20px', width: '80px' }}></div>
        <div className="circuit-element circuit-trace-h" style={{ top: '40px', right: '20px', width: '60px' }}></div>
        <div className="circuit-element circuit-trace-h" style={{ bottom: '30px', left: '40px', width: '70px' }}></div>
        <div className="circuit-element circuit-trace-h" style={{ bottom: '50px', right: '20px', width: '100px' }}></div>
        
        <div className="circuit-element circuit-trace-v" style={{ top: '40px', left: '20px', height: '60px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ top: '40px', right: '20px', height: '120px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ bottom: '30px', left: '110px', height: '80px' }}></div>
        <div className="circuit-element circuit-trace-v" style={{ bottom: '50px', right: '20px', height: '100px' }}></div>
        
        <div className="circuit-element circuit-connector" style={{ top: '40px', left: '20px' }}></div>
        <div className="circuit-element circuit-connector" style={{ top: '40px', right: '20px' }}></div>
        <div className="circuit-element circuit-connector" style={{ bottom: '30px', left: '110px' }}></div>
        <div className="circuit-element circuit-connector" style={{ bottom: '50px', right: '20px' }}></div>
        
        <div className="circuit-element circuit-node" style={{ top: '100px', left: '20px' }}></div>
        <div className="circuit-element circuit-node" style={{ top: '160px', right: '20px' }}></div>
        <div className="circuit-element circuit-node" style={{ bottom: '110px', left: '110px' }}></div>
        <div className="circuit-element circuit-node" style={{ bottom: '150px', right: '20px' }}></div>
        
        <div className="circuit-element circuit-dot" style={{ top: '50px', left: '60px' }}></div>
        <div className="circuit-element circuit-dot" style={{ top: '60px', right: '40px' }}></div>
        <div className="circuit-element circuit-dot" style={{ bottom: '45px', left: '60px' }}></div>
        <div className="circuit-element circuit-dot" style={{ bottom: '70px', right: '60px' }}></div>

        <div className="h-full flex flex-col overflow-hidden">
          {/* App Header */}
          <div className="explorer-panel-header flex justify-between items-center mb-4 flex-shrink-0">
            <div className="text-blue-100 text-lg font-light tracking-wider">
              <span className="explorer-header-text">File Explorer</span>
              <div className="explorer-header-underline"></div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={openDirectoryPicker}
                className="explorer-btn bg-blue-600/40 hover:bg-blue-500/50 text-blue-200 px-3 py-1.5 rounded text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="explorer-btn-text">{directoryHandle ? "Change Folder" : "Open Folder"}</span>
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="explorer-view-btn bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 px-3 py-1.5 rounded text-sm"
                title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
              >
                {viewMode === 'grid' ? <ListViewIcon /> : <GridViewIcon />}
              </button>
            </div>
          </div>
          
          {/* Show message if no directory is selected */}
          {!directoryHandle && !isLoading && !errorMessage && (
            <div className="explorer-empty-state flex-1 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500/50 mb-4 explorer-icon-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" />
              </svg>
              <h3 className="text-xl text-blue-300 mb-2 explorer-text-glow">No Folder Open</h3>
              <p className="text-blue-400/70 text-center max-w-md mb-6">
                Please select a folder to browse its contents. File Explorer requires access
                to your local file system to work properly.
              </p>
              <button
                onClick={openDirectoryPicker}
                className="explorer-primary-btn bg-blue-600/40 hover:bg-blue-500/50 text-blue-200 px-4 py-2 rounded flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                  <path d="M6 12A2 2 0 018 10h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z" />
                </svg>
                Select Folder
              </button>
            </div>
          )}
          
          {/* Error Message */}
          {errorMessage && (
            <div className="explorer-error-state flex-1 flex flex-col items-center justify-center">
              <ErrorIcon />
              <h3 className="text-xl text-red-300 mb-2">Error</h3>
              <p className="text-red-400/80 text-center max-w-md mb-6">
                {errorMessage}
              </p>
              <button
                onClick={openDirectoryPicker}
                className="explorer-primary-btn bg-blue-600/40 hover:bg-blue-500/50 text-blue-200 px-4 py-2 rounded flex items-center"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* Main content is only displayed when we have a directory */}
          {directoryHandle && !errorMessage && (
            <div className="explorer-content overflow-hidden flex flex-col flex-grow" style={{opacity: 1, visibility: 'visible'}}>
              {/* Navigation & Search Bar */}
              <div className="flex flex-col mb-4 gap-3 flex-shrink-0">
                {/* Breadcrumbs & Navigation */}
                <DirectoryNavigation 
                  currentPath={currentPath} 
                  setCurrentPath={setCurrentPath} 
                  navigateTo={navigateTo} 
                />
                
                {/* Search Bar */}
                <div className="relative explorer-search-container">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search files and folders..."
                    className="explorer-search w-full bg-blue-950/50 border border-blue-900/30 rounded p-2 pl-9 text-blue-200 placeholder-blue-500/50 focus:outline-none focus:border-blue-700/60"
                  />
                  <SearchIcon />
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-grow flex overflow-hidden explorer-main-container">
                {/* File/Folder List Panel with enhanced loading */}
                <div 
                  ref={filesRef}
                  className={`explorer-files-panel flex-grow overflow-auto ${isNavigating ? 'navigating' : ''}`}
                  style={{opacity: 1, visibility: 'visible', pointerEvents: 'auto'}}
                >
                  {isContentLoading ? (
                    // Loading placeholder shimmer effect
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {[...Array(12)].map((_, i) => (
                        <div 
                          key={i} 
                          className="directory-loading-placeholder"
                          style={{animationDelay: `${i * 0.05}s`}} 
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Display items based on view mode */}
                      {viewMode === 'grid' ? (
                        <FileGrid 
                          items={getCurrentItems()}
                          selectedItem={selectedItem}
                          animatingItem={animatingItem}
                          isSearching={isSearching}
                          onItemClick={handleItemClick}
                        />
                      ) : (
                        <FileListView 
                          items={getCurrentItems()}
                          selectedItem={selectedItem}
                          animatingItem={animatingItem}
                          isSearching={isSearching}
                          sortBy={sortBy}
                          sortDirection={sortDirection}
                          handleSortChange={handleSortChange}
                          onItemClick={handleItemClick}
                        />
                      )}

                      {/* Empty folder message */}
                      {!isSearching && getCurrentItems().length === 0 && (
                        <div className="explorer-empty-folder flex flex-col items-center justify-center h-64 text-blue-400/70">
                          <EmptyFolderIcon />
                          <p>This folder is empty</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* File Details Panel */}
                {selectedItem && (
                  <FileDetailsPanel 
                    selectedItem={selectedItem} 
                    onClose={() => setSelectedItem(null)} 
                    onPreview={openPreview} 
                  />
                )}
              </div>

              {/* Status Bar */}
              <div className="explorer-status-bar mt-2 py-1 px-3 bg-blue-900/10 rounded border border-blue-900/20 text-blue-400/60 text-xs flex justify-between flex-shrink-0">
                <div>
                  {getCurrentItems().length} {getCurrentItems().length === 1 ? 'item' : 'items'}
                </div>
                <div>
                  {directoryHandle ? 
                    `${currentPath.join('/').replace('root', directoryHandle.name || 'Project')}` : 
                    currentPath.join('/').replace('root', 'Home')
                  }
                </div>
              </div>
            </div>
          )}

          {/* Loading Dialog - Only show for initial loading */}
          {isInitialLoading && (
            <div className="explorer-loading-overlay absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
              <div className="explorer-loading-dialog bg-blue-950/90 border border-blue-800/50 p-6 rounded-lg max-w-md text-center">
                <div className="text-blue-300 text-lg mb-3">Opening File Explorer</div>
                <p className="text-blue-400/80 mb-4">
                  Please select your project directory when prompted. If you don't see a folder selection prompt, check for it in your browser's address bar or toolbar.
                </p>
                <div className="explorer-loader-container">
                  <div className="explorer-circuit-loader"></div>
                  <svg className="animate-spin h-8 w-8 mx-auto text-blue-300/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => {
                      setIsLoading(false);
                      setIsInitialLoading(false);
                      setShowPrompt(true);
                    }}
                    className="text-blue-300 hover:text-blue-200 underline text-sm explorer-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* File Preview Overlay */}
          {previewFile && (
            <SimpleFileViewer file={previewFile} onClose={closePreview} />
          )}
          
          {/* Image Viewer Overlay */}
          {imagePreview && (
            <ImageViewerOverlay 
              file={imagePreview.file} 
              imageUrl={imagePreview.imageUrl} 
              onClose={closeImagePreview} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FileExplorerApp;
