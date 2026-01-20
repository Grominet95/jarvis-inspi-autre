import React from 'react';
import { BackIcon } from './FileExplorerIcons';

/**
 * Directory navigation component with breadcrumbs
 */
const DirectoryNavigation = ({ currentPath, navigateTo }) => {
  return (
    <div className="explorer-breadcrumbs flex items-center text-blue-300 overflow-x-auto">
      {/* Back button */}
      {currentPath.length > 1 && (
        <button 
          onClick={() => navigateTo('..')}
          className="explorer-back-btn p-1 mr-2 rounded-full hover:bg-blue-900/30 text-blue-400"
          title="Go back"
        >
          <BackIcon />
        </button>
      )}
      
      {/* Breadcrumb path */}
      <div className="flex items-center">
        {currentPath.map((segment, index) => {
          // Replace "root" with "Home" for better UX
          const displayName = index === 0 ? 'Home' : segment;
          
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="mx-1 text-blue-500/70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              )}
              
              {index !== currentPath.length - 1 ? (
                // Clickable breadcrumb for previous paths
                <button 
                  className="px-1.5 py-1 rounded hover:bg-blue-900/30"
                  onClick={() => {
                    // Navigate to this specific path level
                    const newPath = currentPath.slice(0, index + 1);
                    // If this is the last item in the new path, we need to navigate to it
                    const lastSegment = newPath[newPath.length - 1];
                    navigateTo(lastSegment);
                  }}
                >
                  {displayName}
                </button>
              ) : (
                // Current path (not clickable)
                <span className="px-1.5 py-1 font-medium text-blue-200">{displayName}</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default DirectoryNavigation;