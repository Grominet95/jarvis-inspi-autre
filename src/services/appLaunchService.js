/**
 * App Launch Service - Maps voice commands to app launching functionality
 */
import { apps } from '../data/apps';

class AppLaunchService {
  constructor() {
    // Create mapping for easier app lookup
    this.appMap = new Map();
    this.setupAppMappings();
  }

  setupAppMappings() {
    // Create mappings for each app with various name variations
    apps.forEach(app => {
      // Add exact name
      this.appMap.set(app.name.toLowerCase(), app);
      
      // Add variations and common aliases
      const aliases = this.getAppAliases(app);
      aliases.forEach(alias => {
        this.appMap.set(alias.toLowerCase(), app);
      });
    });
  }
  getAppAliases(app) {
    const aliases = [];
    
    // Add the original name
    aliases.push(app.name);
    
    // Automatically generate common variations
    const name = app.name.toLowerCase();
    
    // Add version without spaces
    aliases.push(name.replace(/\s+/g, ''));
    
    // Add version with "app" suffix
    aliases.push(name + ' app');
    
    // For apps with numbers, add spelled out version
    if (name.includes('3d')) {
      aliases.push(name.replace('3d', 'three d'));
      aliases.push(name.replace('3d', 'threed'));
    }
    
    // Add category-based aliases
    if (app.category) {
      const category = app.category.toLowerCase();
      // Don't add generic categories that would conflict
      if (!['system', 'media', 'design'].includes(category)) {
        aliases.push(category);
      }
    }
    
    // Add common action words based on app function
    if (name.includes('viewer')) aliases.push('view', 'show');
    if (name.includes('creator') || name.includes('generator')) aliases.push('create', 'make', 'generate');
    if (name.includes('tracker') || name.includes('tracking')) aliases.push('track');
    if (name.includes('calibration')) aliases.push('calibrate');
    
    return aliases;
  }

  // Find app by name (supports fuzzy matching)
  findAppByName(requestedName) {
    if (!requestedName) return null;
    
    const cleanName = requestedName.toLowerCase().trim();
    
    // Exact match first
    if (this.appMap.has(cleanName)) {
      return this.appMap.get(cleanName);
    }
    
    // Fuzzy matching - check if any alias contains the requested name or vice versa
    for (const [alias, app] of this.appMap) {
      if (alias.includes(cleanName) || cleanName.includes(alias)) {
        return app;
      }
    }
    
    // Try word-by-word matching
    const words = cleanName.split(' ');
    for (const [alias, app] of this.appMap) {
      const aliasWords = alias.split(' ');
      const matchCount = words.filter(word => 
        aliasWords.some(aliasWord => aliasWord.includes(word) || word.includes(aliasWord))
      ).length;
      
      // If most words match, consider it a match
      if (matchCount >= Math.min(words.length, aliasWords.length) * 0.6) {
        return app;
      }
    }
    
    return null;
  }
  // Launch app by name
  launchApp(appName, setSelectedApp, setLaunchedApp) {
    const app = this.findAppByName(appName);
    
    if (!app) {
      return {
        success: false,
        message: `App "${appName}" not found. Available apps: ${apps.map(a => a.name).join(', ')}`
      };
    }
    
    try {
      if (setSelectedApp) {
        // First set selected app for preview if function is provided
        setSelectedApp(app);
        
        // Then automatically launch it after a brief moment
        setTimeout(() => {
          setLaunchedApp(app);
        }, 500);
      } else {
        // Direct launch without preview when setSelectedApp is null
        setLaunchedApp(app);
      }
      
      return {
        success: true,
        message: `Launching ${app.name}`,
        app: app
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to launch ${app.name}: ${error.message}`
      };
    }
  }

  // Get list of available apps
  getAvailableApps() {
    return apps.map(app => ({
      id: app.id,
      name: app.name,
      category: app.category,
      description: app.description
    }));
  }
}

export default new AppLaunchService();
