import React from 'react';
import { ItemIcon } from './FileExplorerIcons';

/**
 * Grid view component for displaying files and folders
 */
const FileGrid = ({ 
  items, 
  selectedItem, 
  animatingItem, 
  isSearching,
  onItemClick 
}) => {
  return (
    <div className="explorer-grid p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {items.map((item, index) => (
        <div 
          key={index}
          onClick={() => onItemClick(item, index)}
          className={`explorer-grid-item flex flex-col items-center p-3 rounded-lg hover:bg-blue-900/20 cursor-pointer transition-all
            ${selectedItem?.name === item.name ? 'selected bg-blue-900/30' : ''}
            ${animatingItem?.id === index && animatingItem?.type === 'folder' ? 'opening' : ''}
            ${animatingItem?.id === index && animatingItem?.type === 'file' ? 'file-selected' : ''}
          `}
          style={{
            animationDelay: `${index * 0.03}s`,
          }}
        >
          <div className="mb-2 explorer-item-icon">
            <ItemIcon item={item} />
          </div>
          <div className="text-center">
            <div className="text-blue-200 truncate w-full" title={item.name}>
              {item.name}
            </div>
            <div className="text-blue-400/60 text-xs">
              {item.type === 'file' ? item.size : 'Folder'}
            </div>
            {isSearching && item.path && (
              <div className="text-blue-400/60 text-xs truncate w-full" title={item.fullPath}>
                {item.fullPath}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileGrid;