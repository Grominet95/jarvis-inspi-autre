// Grid Service for managing background grids and overlay tools separately
class GridService {
  constructor() {
    this.backgroundGrid = '10mm';
    this.overlayTool = 'none';
    this.mmPerPixel = 1.0;
    this.colorTheme = 'cyber';
    this.backgroundGradient = false;
  }

  setBackgroundGrid(type) {
    this.backgroundGrid = type;
  }

  setOverlayTool(tool) {
    this.overlayTool = tool;
  }

  setMmPerPixel(value) {
    this.mmPerPixel = value;
  }

  setColorTheme(theme) {
    this.colorTheme = theme;
  }

  setBackgroundGradient(enabled) {
    this.backgroundGradient = enabled;
  }

  // Theme definitions for overlays and UI elements
  getThemeColors(theme = this.colorTheme) {
    const themes = {
      cyber: {
        name: 'Cyber Blue',
        description: 'Classic futuristic blue overlays',
        overlay: '59, 130, 246', // blue-500
        appIcon: '59, 130, 246' // blue-500
      },
      night: {
        name: 'Midnight Purple',
        description: 'Deep space purple vibes',
        overlay: '147, 51, 234', // purple-600
        appIcon: '147, 51, 234' // purple-600
      },
      sunset: {
        name: 'Solar Flare',
        description: 'Warm orange energy',
        overlay: '249, 115, 22', // orange-500
        appIcon: '249, 115, 22' // orange-500
      },
      matrix: {
        name: 'Digital Rain',
        description: 'Hacker green matrix style',
        overlay: '34, 197, 94', // green-500
        appIcon: '34, 197, 94' // green-500
      },
      arctic: {
        name: 'Ice Crystal',
        description: 'Cool cyan frost',
        overlay: '6, 182, 212', // cyan-500
        appIcon: '6, 182, 212' // cyan-500
      }
    };
    
    return themes[theme] || themes.cyber;
  }

  // Convert mm to pixels using the current setting
  mmToPixels(mm) {
    return mm / this.mmPerPixel;
  }

  // Convert pixels to mm using the current setting
  pixelsToMm(pixels) {
    return pixels * this.mmPerPixel;
  }

  // Convert mm to inches
  mmToInches(mm) {
    return mm / 25.4;
  }

  // Convert inches to pixels
  inchesToPixels(inches) {
    return this.mmToPixels(inches * 25.4);
  }

  // Generate standard grid CSS - 10mm spacing, solid grid lines (always blue)
  generateStandardGrid() {
    const gridSize = this.mmToPixels(10); // 10mm grid spacing
    
    let backgroundImage = `
      repeating-linear-gradient(0deg, rgba(59, 130, 246, 0.18) 0px, rgba(59, 130, 246, 0.18) 1px, transparent 1px, transparent ${gridSize}px),
      repeating-linear-gradient(90deg, rgba(59, 130, 246, 0.18) 0px, rgba(59, 130, 246, 0.18) 1px, transparent 1px, transparent ${gridSize}px)
    `;
    
    // Add gradient overlay if enabled
    if (this.backgroundGradient) {
      backgroundImage = `
        radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.6) 100%),
        ${backgroundImage}
      `;
    }
    
    return {
      backgroundImage,
      backgroundSize: `100% 100%`
    };
  }

  // Generate inches grid - precisely aligned with ruler, solid grid lines (always blue)
  generateInchesGrid() {
    const inchSize = Math.round(this.inchesToPixels(1)); // Round to ensure exact pixel alignment
    
    let backgroundImage = `
      repeating-linear-gradient(0deg, rgba(59, 130, 246, 0.15) 0px, rgba(59, 130, 246, 0.15) 1px, transparent 1px, transparent ${inchSize}px),
      repeating-linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0px, rgba(59, 130, 246, 0.15) 1px, transparent 1px, transparent ${inchSize}px)
    `;
    
    // Add gradient overlay if enabled
    if (this.backgroundGradient) {
      backgroundImage = `
        radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.6) 100%),
        ${backgroundImage}
      `;
    }
    
    return {
      backgroundImage,
      backgroundSize: `100% 100%`
    };
  }

  // Generate angles protractor grid - standard grid background, solid grid lines (always blue)
  generateAnglesGrid() {
    const gridSize = this.mmToPixels(10); // 10mm grid spacing like standard mode
    
    return {
      backgroundImage: `
        repeating-linear-gradient(0deg, rgba(59, 130, 246, 0.18) 0px, rgba(59, 130, 246, 0.18) 1px, transparent 1px, transparent ${gridSize}px),
        repeating-linear-gradient(90deg, rgba(59, 130, 246, 0.18) 0px, rgba(59, 130, 246, 0.18) 1px, transparent 1px, transparent ${gridSize}px)
      `,
      backgroundSize: `100% 100%`
    };
  }

  // Generate hardware reference grid - SINGLE simple grid (always blue)
  generateHardwareGrid() {
    const mmGrid = this.mmToPixels(5); // 5mm grid to match hardware
    
    return {
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.04) 1px, transparent 1px)
      `,
      backgroundSize: `${mmGrid}px ${mmGrid}px`
    };
  }

  // Get current background grid styles only
  getCurrentGridStyles() {
    let styles = {};
    
    switch (this.backgroundGrid) {
      case 'inches':
        styles = this.generateInchesGrid();
        break;
      case '10mm':
        styles = this.generateStandardGrid();
        break;
      case 'none':
      default:
        // No background grid
        styles = {
          backgroundImage: 'none',
          backgroundColor: 'transparent'
        };
        break;
    }
    
    return styles;
  }

  // Check if specific overlay tools should be displayed
  shouldShowProtractor() {
    return this.overlayTool === 'protractor';
  }

  shouldShowInchesRuler() {
    return this.overlayTool === 'ruler-inches';
  }

  shouldShowMmRuler() {
    return this.overlayTool === 'ruler-mm';
  }

  shouldShowHardwareReference() {
    return this.overlayTool === 'hardware';
  }

  // Generate ruler markings for inches mode - with subdivisions, precisely aligned
  generateInchRulerMarkings() {
    const markings = [];
    const inchSize = Math.round(this.inchesToPixels(1)); // Round to match grid exactly
    const maxInches = Math.ceil(window.innerHeight / inchSize) + 2;

    for (let i = 0; i <= maxInches; i++) {
      const y = i * inchSize;
      
      // Major inch marks
      markings.push({
        type: 'inch',
        position: y,
        label: `${i}"`,
        length: 40
      });

      // Add subdivisions only between inches (not after the last one)
      if (i < maxInches) {
        // Half inch marks
        markings.push({
          type: 'half',
          position: y + inchSize / 2,
          label: '',
          length: 25
        });

        // Quarter inch marks
        for (let q = 1; q < 4; q += 2) {
          markings.push({
            type: 'quarter',
            position: y + (inchSize * q / 4),
            label: '',
            length: 15
          });
        }

        // Eighth inch marks
        for (let e = 1; e < 8; e += 2) {
          if (e % 2 === 1 && e % 4 !== 1) {
            markings.push({
              type: 'eighth',
              position: y + (inchSize * e / 8),
              label: '',
              length: 10
            });
          }
        }
      }
    }

    return markings;
  }

  // Generate ruler markings for MM mode
  generateMmRulerMarkings() {
    const markings = [];
    const mmSize = this.mmToPixels(10); // 10mm increments
    const maxMm = Math.ceil(window.innerHeight / mmSize) + 2;

    for (let mm = 0; mm <= maxMm; mm++) {
      const position = mm * mmSize;
      
      if (position > window.innerHeight) break;

      // Every 10mm gets a mark
      const isMajor = mm % 5 === 0; // Every 50mm is major
      
      markings.push({
        position,
        type: isMajor ? 'major' : 'minor',
        length: isMajor ? 32 : 16,
        label: isMajor ? `${mm * 10}` : null
      });
    }

    return markings;
  }

  // Generate angle lines for protractor mode - snapped to grid line above app tray
  generateAngleLines() {
    const gridSize = this.mmToPixels(10); // 10mm grid spacing
    const screenCenterX = window.innerWidth / 2;
    
    // Calculate where grid lines actually appear on screen
    // Grid lines are positioned every gridSize pixels, but we need to account for any offset
    // Since backgroundPosition is "center, 0 0, 0 0", the radial gradient is centered
    // but the grid lines start from 0,0
    
    // Find the actual grid line positions by calculating from 0,0
    // Grid lines appear at: 0, gridSize, 2*gridSize, 3*gridSize, etc.
    // Find which grid line is closest to screen center
    const leftmostGridLine = 0;
    const gridLinePositions = [];
    
    // Generate all possible grid line positions across the screen
    for (let i = 0; i * gridSize < window.innerWidth; i++) {
      gridLinePositions.push(i * gridSize);
    }
    
    // Find the grid line closest to screen center
    let closestGridLine = gridLinePositions[0];
    let minDistance = Math.abs(screenCenterX - closestGridLine);
    
    for (const gridPos of gridLinePositions) {
      const distance = Math.abs(screenCenterX - gridPos);
      if (distance < minDistance) {
        minDistance = distance;
        closestGridLine = gridPos;
      }
    }
    
    const centerX = closestGridLine;
    
    console.log(`Protractor alignment - Screen center: ${screenCenterX}, Closest grid line: ${centerX}, Distance: ${minDistance}`);
    
    const centerY = window.innerHeight - 120; // Position above app tray (120px from bottom)
    const lineRadius = Math.min(window.innerWidth * 0.6, window.innerHeight * 0.5); // Keep lines long
    const arcRadius = Math.min(window.innerWidth * 0.4, window.innerHeight * 0.35); // Smaller arc

    const angles = [0, 30, 60, 90, 120, 150, 180];
    return angles.map(angle => {
      const radians = (angle * Math.PI) / 180;
      const x = centerX + Math.cos(radians) * lineRadius;
      const y = centerY - Math.sin(radians) * lineRadius; // Back to original - arc points upward from bottom
      
      return {
        angle,
        startX: centerX,
        startY: centerY,
        endX: x,
        endY: y,
        label: `${angle}°`,
        centerX,
        centerY,
        radius: lineRadius, // Keep this for backward compatibility
        lineRadius: lineRadius, // For the angle lines
        arcRadius: arcRadius // For the arc
      };
    });
  }

  // Generate hardware hole reference data
  generateHardwareReference() {
    return {
      holes: [
        { name: 'M2', diameter: 2.0, clearance: 2.2, tap: 1.6 },
        { name: 'M3', diameter: 3.0, clearance: 3.2, tap: 2.5 },
        { name: 'M4', diameter: 4.0, clearance: 4.2, tap: 3.3 },
        { name: 'M5', diameter: 5.0, clearance: 5.2, tap: 4.2 },
        { name: 'M6', diameter: 6.0, clearance: 6.2, tap: 5.0 },
        { name: 'M8', diameter: 8.0, clearance: 8.2, tap: 6.8 }
      ],
      lengths: [
        { label: '5mm', value: 5 },
        { label: '10mm', value: 10 },
        { label: '15mm', value: 15 },
        { label: '20mm', value: 20 },
        { label: '25mm', value: 25 },
        { label: '30mm', value: 30 },
        { label: '40mm', value: 40 },
        { label: '50mm', value: 50 }
      ]
    };
  }
}

// Create singleton instance
const gridService = new GridService();

// Expose globally for debugging
if (typeof window !== 'undefined') {
  window.gridService = gridService;
}

export default gridService;
