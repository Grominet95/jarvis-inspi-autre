import React, { useState, useEffect, useRef } from 'react';

const AIResponse = ({ text, context = 'global' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [textContent, setTextContent] = useState('');
  const responseRef = useRef(null);
  
  useEffect(() => {
    if (text) {
      setIsVisible(true);
      setTextContent(text);
      
      // Reset animation when new text arrives
      if (responseRef.current) {
        responseRef.current.style.animation = 'fadeInUp 0.3s ease-out forwards';
      }
    } else {
      setIsVisible(false);
    }
  }, [text]);
  
  if (!text) return null;
  
  // Adapt to different contexts - in-app vs global
  const isInApp = context === 'in-app';
  
  // Dynamically calculate style based on text length and context
  const contentStyle = {
    maxWidth: Math.min(Math.max(text.length * 8, 300), isInApp ? 600 : 700) + 'px'
  };
  
  return (
    <div 
      ref={responseRef}
      className={`ai-response ${isInApp ? '' : 'fixed bottom-24 right-24'} w-full`} 
      style={isInApp ? contentStyle : { maxWidth: '320px' }}
    >
      <div className={`relative bg-gray-900/70 backdrop-blur-md text-blue-100 p-3 rounded-lg border ${isInApp ? 'border-blue-500/40' : 'border-blue-500/20'} shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs text-blue-400 uppercase tracking-wider mr-3">JARVIS</span>
            <span className="text-sm text-blue-100 whitespace-nowrap">{text}</span>
          </div>
          
          {/* Close button for all responses */}
          <button 
            onClick={() => {
              if (isInApp) {
                // Find parent container and hide it
                const container = document.querySelector('.jarvis-in-app-response');
                if (container) container.style.display = 'none';
              } else {
                // For global responses, hide the component itself
                if (responseRef.current) {
                  responseRef.current.style.display = 'none';
                }
              }
            }}
            className="ml-2 w-5 h-5 flex items-center justify-center text-blue-300 hover:text-white hover:bg-blue-400/20 rounded-full transition-colors flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIResponse;
