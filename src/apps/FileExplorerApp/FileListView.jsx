import React from 'react';
import { ItemIcon } from './FileExplorerIcons';
import { formatDate } from './FileExplorerUtils';

/**
 * List view component for displaying files and folders
 */
const FileListView = ({ 
  items, 
  selectedItem, 
  animatingItem, 
  isSearching,
  sortBy,
  sortDirection,
  handleSortChange,
  onItemClick 
}) => {
  return (
    <>
      {/* List Headers */}
      <div className="explorer-list-header grid grid-cols-12 gap-2 px-4 py-2">
        <div className="col-span-6 flex items-center">
          <button 
            onClick={() => handleSortChange('name')}
            className="flex items-center hover:text-blue-200"
          >
            Name
            {sortBy === 'name' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sortDirection === 'asc' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            )}
          </button>
        </div>
        <div className="col-span-2">
          <button 
            onClick={() => handleSortChange('size')}
            className="flex items-center hover:text-blue-200"
          >
            Size
            {sortBy === 'size' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sortDirection === 'asc' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            )}
          </button>
        </div>
        <div className="col-span-4">
          <button 
            onClick={() => handleSortChange('modified')}
            className="flex items-center hover:text-blue-200"
          >
            Modified
            {sortBy === 'modified' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sortDirection === 'asc' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* List Items */}
      <div className="explorer-list-view divide-y divide-blue-900/20">
        {items.map((item, index) => (
          <div 
            key={index}
            onClick={() => onItemClick(item, index)}
            className={`explorer-list-item grid grid-cols-12 gap-2 px-4 py-2 hover:bg-blue-900/20 transition-colors cursor-pointer 
              ${selectedItem?.name === item.name ? 'selected bg-blue-900/30' : ''}
              ${animatingItem?.id === index && animatingItem?.type === 'folder' ? 'opening' : ''}
              ${animatingItem?.id === index && animatingItem?.type === 'file' ? 'file-selected' : ''}
            `}
            style={{
              animationDelay: `${index * 0.02}s`,
            }}
          >
            <div className="col-span-6 flex items-center">
              <div className="mr-3"><ItemIcon item={item} /></div>
              <div className="truncate" title={item.name}>
                <div className="text-blue-200">{item.name}</div>
                {isSearching && item.path && (
                  <div className="text-blue-400/60 text-xs truncate" title={item.fullPath}>
                    {item.fullPath}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-2 text-blue-400/70 flex items-center">
              {item.type === 'file' ? item.size : '--'}
            </div>
            <div className="col-span-4 text-blue-400/70 flex items-center">
              {item.modified && formatDate(item.modified)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default FileListView;