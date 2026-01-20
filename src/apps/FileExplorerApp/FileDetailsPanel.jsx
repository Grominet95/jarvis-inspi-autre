import React from 'react';
import { formatDate } from './FileExplorerUtils';
import { ItemIcon, CloseIcon } from './FileExplorerIcons';

/**
 * Component to display detailed information about a selected file or folder
 */
const FileDetailsPanel = ({ selectedItem, onClose, onPreview }) => {
  return (
    <div className="explorer-details-panel w-72 ml-4 overflow-auto flex flex-col directory-loading">
      <div className="explorer-details-header p-4 bg-blue-900/20 border-b border-blue-900/30 text-blue-300 flex justify-between items-center">
        <div>File Details</div>
        <button 
          onClick={onClose}
          className="explorer-close-btn text-blue-400 hover:text-blue-300"
        >
          <CloseIcon />
        </button>
      </div>
      
      <div className="explorer-details-content flex-1 p-4 overflow-auto">
        <div className="flex flex-col items-center mb-6">
          <div className="p-4 bg-blue-900/20 rounded-full mb-2">
            <ItemIcon item={selectedItem} />
          </div>
          <h3 className="text-blue-200 text-lg text-center truncate max-w-full" title={selectedItem.name}>
            {selectedItem.name}
          </h3>
          <p className="text-blue-400/60 text-sm">
            {selectedItem.type === 'directory' || selectedItem.type === 'folder' 
              ? 'Folder' 
              : `${selectedItem.fileType ? selectedItem.fileType.toUpperCase() : 'File'}`
            }
          </p>
        </div>
        
        <div className="space-y-3">
          {selectedItem.type === 'file' && (
            <>
              <div>
                <div className="text-blue-400/60 text-xs">Size</div>
                <div className="text-blue-300">{selectedItem.size}</div>
              </div>
              <div>
                <div className="text-blue-400/60 text-xs">Modified</div>
                <div className="text-blue-300">{selectedItem.modified}</div>
              </div>
              {selectedItem.fileType && (
                <button
                  onClick={() => onPreview(selectedItem)}
                  className="w-full py-2 bg-blue-800/40 hover:bg-blue-700/50 text-blue-300 rounded mt-4 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View File
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileDetailsPanel;