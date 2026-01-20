import React from 'react';
import gridService from '../services/gridService';

// Inches ruler overlay component
export const InchesRulerOverlay = ({ mmPerPixel }) => {
  const markings = gridService.generateInchRulerMarkings();
  const theme = gridService.getThemeColors();
  const themeColor = `rgb(${theme.overlay})`;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Left ruler */}
      <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-black/10 to-transparent">
        {markings.map((mark, index) => (
          <div
            key={`left-${index}`}
            className="absolute left-0 flex items-center"
            style={{ top: `${mark.position}px` }}
          >
            <div
              className={`h-px ${
                mark.type === 'inch' ? '' : 
                mark.type === 'half' ? 'opacity-75' : 
                mark.type === 'quarter' ? 'opacity-60' : 'opacity-40'
              }`}
              style={{ 
                width: `${mark.length}px`,
                backgroundColor: themeColor,
                opacity: 0.6
              }}
            />
            {mark.label && (
              <span className="text-xs ml-1 font-mono" style={{ color: themeColor, opacity: 0.7 }}>
                {mark.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom ruler */}
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/10 to-transparent">
        {markings.map((mark, index) => (
          <div
            key={`bottom-${index}`}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${mark.position}px` }}
          >
            <div
              className={`w-px ${
                mark.type === 'inch' ? 'h-6' : 
                mark.type === 'half' ? 'h-4 opacity-75' : 
                mark.type === 'quarter' ? 'h-3 opacity-60' : 'h-2 opacity-40'
              }`}
              style={{ 
                backgroundColor: themeColor,
                opacity: 0.6
              }}
            />
            {mark.label && (
              <span className="text-xs mt-1 font-mono transform -rotate-90 origin-center" style={{ color: themeColor, opacity: 0.7 }}>
                {mark.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Angles protractor overlay component
export const AnglesProtractorOverlay = () => {
  const angleLines = gridService.generateAngleLines();
  const theme = gridService.getThemeColors();
  const themeColor = `rgb(${theme.overlay})`;
  
  // Get center position from the first angle line (they all have the same center)
  const centerX = angleLines[0]?.centerX || window.innerWidth / 2;
  const centerY = angleLines[0]?.centerY || window.innerHeight - 120;
  const lineRadius = angleLines[0]?.lineRadius || 200;
  const arcRadius = angleLines[0]?.arcRadius || 150;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        {/* Baseline - horizontal line above app tray */}
        <line
          x1={centerX - lineRadius * 1.2}
          y1={centerY}
          x2={centerX + lineRadius * 1.2}
          y2={centerY}
          stroke={themeColor}
          strokeWidth="2"
        />
        
        {/* Protractor arc - smaller radius */}
        <path
          d={`M ${centerX - arcRadius} ${centerY} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + arcRadius} ${centerY}`}
          stroke={themeColor}
          strokeWidth="2"
          fill="none"
        />

        {/* Angle lines */}
        {angleLines.map((line, index) => (
          <g key={index}>
            <line
              x1={line.startX}
              y1={line.startY}
              x2={line.endX}
              y2={line.endY}
              stroke={themeColor}
              strokeWidth={line.angle % 90 === 0 ? "2" : "1"}
              strokeDasharray={line.angle % 30 === 0 ? "none" : "5,5"}
            />
            <text
              x={line.endX}
              y={line.endY - 10}
              fill={themeColor}
              fontSize="14"
              textAnchor="middle"
              className="font-mono"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Center point */}
        <circle
          cx={centerX}
          cy={centerY}
          r="4"
          fill={themeColor}
        />
      </svg>
    </div>
  );
};

// MM Ruler overlay component
export const MmRulerOverlay = ({ mmPerPixel }) => {
  const markings = gridService.generateMmRulerMarkings();
  const theme = gridService.getThemeColors();
  const themeColor = `rgb(${theme.overlay})`;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Left ruler */}
      <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-black/10 to-transparent">
        {markings.map((mark, index) => (
          <div
            key={`left-${index}`}
            className="absolute left-0 flex items-center"
            style={{ top: `${mark.position}px` }}
          >
            <div
              className={`h-px ${
                mark.type === 'major' ? 'opacity-80' : 'opacity-60'
              }`}
              style={{ 
                width: `${mark.length}px`,
                backgroundColor: themeColor,
              }}
            />
            {mark.label && (
              <span className="text-xs ml-1 font-mono" style={{ color: themeColor, opacity: 0.7 }}>
                {mark.label}mm
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom ruler */}
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/10 to-transparent">
        {markings.map((mark, index) => (
          <div
            key={`bottom-${index}`}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: `${mark.position}px` }}
          >
            <div
              className={`w-px ${
                mark.type === 'major' ? 'h-6 opacity-80' : 'h-3 opacity-60'
              }`}
              style={{ 
                backgroundColor: themeColor,
              }}
            />
            {mark.label && (
              <span className="text-xs mt-1 font-mono transform -rotate-90 origin-center" style={{ color: themeColor, opacity: 0.7 }}>
                {mark.label}mm
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Hardware reference overlay component
export const HardwareReferenceOverlay = ({ mmPerPixel }) => {
  const hardware = gridService.generateHardwareReference();
  const theme = gridService.getThemeColors();
  const themeColor = `rgb(${theme.overlay})`;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Left side - Length reference */}
              <div className="absolute left-2 top-16 bg-black/60 backdrop-blur-sm rounded-md p-2 border" style={{ borderColor: `${themeColor}33` }}>
        <h3 className="text-blue-300/80 text-xs font-medium mb-2">Length Reference</h3>
        <div className="space-y-1">
          {hardware.lengths.slice(0, 4).map((length, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="bg-blue-400/70 h-px"
                style={{ width: `${Math.min(gridService.mmToPixels(length.value), 40)}px` }}
              />
              <span className="text-blue-200/80 text-xs font-mono min-w-[30px]">
                {length.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Hole reference */}
      <div className="absolute right-2 top-16 bg-black/60 backdrop-blur-sm rounded-md p-2 border border-blue-400/20">
        <h3 className="text-blue-300/80 text-xs font-medium mb-2">Hole Sizes</h3>
        <div className="space-y-2">
          {hardware.holes.slice(0, 4).map((hole, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="border border-blue-400/50 rounded-full bg-blue-400/20"
                style={{
                  width: `${Math.max(8, Math.min(gridService.mmToPixels(hole.diameter), 16))}px`,
                  height: `${Math.max(8, Math.min(gridService.mmToPixels(hole.diameter), 16))}px`
                }}
              />
              <div className="text-blue-200/80 text-xs font-mono">
                {hole.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
