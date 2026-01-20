import React, { useState } from 'react';
import FileViewer from './FileViewer';

/**
 * Demo component for FileViewer integration
 * @returns {React.Component} Demo component
 */
const FileViewerDemo = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // Create a custom file object that mimics the format used in FileExplorerApp
      setSelectedFile({
        name: file.name,
        size: file.size,
        modified: file.lastModified,
        type: 'file',
        handle: {
          getFile: async () => file
        }
      });
    } catch (err) {
      console.error('Error handling file:', err);
    }
  };
  
  // Open file in viewer
  const openFileViewer = () => {
    setFilePreview(selectedFile);
  };
  
  // Close file viewer
  const closeFileViewer = () => {
    setFilePreview(null);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl text-blue-300 mb-4">File Viewer Demo</h1>
      
      <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-900/30 mb-6">
        <p className="text-blue-200 mb-4">
          Select a file to preview using the enhanced File Viewer component:
        </p>
        
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="block w-full text-sm text-blue-300 
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-900/50 file:text-blue-200
            hover:file:bg-blue-800/50 mb-4"
        />
        
        {selectedFile && (
          <div className="mt-4">
            <h2 className="text-blue-300 font-medium">Selected File:</h2>
            <div className="text-blue-200 text-sm mt-1">{selectedFile.name}</div>
            <button 
              onClick={openFileViewer}
              className="mt-4 bg-blue-600/40 hover:bg-blue-500/50 text-blue-200 px-4 py-2 rounded"
            >
              Preview File
            </button>
          </div>
        )}
      </div>
      
      {filePreview && (
        <FileViewer file={filePreview} onClose={closeFileViewer} />
      )}
    </div>
  );
};

export default FileViewerDemo;
