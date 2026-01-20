
/**
 * Function Manager Service
 * ========================
 * 
 * This service automatically manages all JARVIS functions based on the functions.js file.
 * It handles:
 * - Loading function definitions
 * - Generating OpenAI function schemas
 * - Routing function calls to handlers
 * - Providing help and examples
 */

import { functions, functionCategories } from './functions';
import { logInfo, logError } from '../services/serviceUtils';

class FunctionManagerService {
  constructor() {
    this.functions = new Map();
    this.handlers = new Map();
    this.services = new Map();
    this.loadFunctions();
  }

  /**
   * Load all functions from the functions.js file
   */
  loadFunctions() {
    functions.forEach(func => {
      this.functions.set(func.name, func);
      
      // Register handler
      if (func.handler) {
        this.handlers.set(func.name, func.handler);
      }
      
      // Register service
      if (func.service) {
        this.services.set(func.name, func.service);
      }
    });
    
    logInfo(`Loaded ${functions.length} functions:`, Array.from(this.functions.keys()));
  }

  /**
   * Get OpenAI function schema for all functions
   * This is used by the RealtimeVoiceService
   */
  getFunctionSchema() {
    return functions.map(func => ({
      type: "function",
      name: func.name,
      description: func.description,
      parameters: func.parameters
    }));
  }

  /**
   * Get a specific function definition
   */
  getFunction(name) {
    return this.functions.get(name);
  }

  /**
   * Get all functions organized by category
   */
  getFunctionsByCategory() {
    const categorized = {};
    
    Object.entries(functionCategories).forEach(([category, functionNames]) => {
      categorized[category] = functionNames.map(name => this.getFunction(name)).filter(Boolean);
    });
    
    return categorized;
  }

  /**
   * Get handler for a function
   */
  getHandler(functionName) {
    return this.handlers.get(functionName);
  }

  /**
   * Get service name for a function
   */
  getService(functionName) {
    return this.services.get(functionName);
  }

  /**
   * Get all available function names
   */
  getFunctionNames() {
    return Array.from(this.functions.keys());
  }

  /**
   * Get help text for all functions or a specific function
   */
  getHelp(functionName = null) {
    if (functionName) {
      const func = this.getFunction(functionName);
      if (!func) return `Function '${functionName}' not found.`;
      
      return {
        name: func.name,
        description: func.description,
        parameters: func.parameters,
        examples: func.examples || []
      };
    }
    
    // Return help for all functions
    const help = {
      total: functions.length,
      categories: this.getFunctionsByCategory(),
      examples: this.getAllExamples()
    };
    
    return help;
  }

  /**
   * Get all voice command examples
   */
  getAllExamples() {
    const examples = [];
    functions.forEach(func => {
      if (func.examples) {
        examples.push(...func.examples.map(example => ({
          command: example,
          function: func.name,
          description: func.description
        })));
      }
    });
    return examples;
  }

  /**
   * Search functions by keyword
   */
  searchFunctions(keyword) {
    const results = [];
    const searchTerm = keyword.toLowerCase();
    
    functions.forEach(func => {
      let relevance = 0;
      
      // Check name
      if (func.name.toLowerCase().includes(searchTerm)) {
        relevance += 10;
      }
      
      // Check description
      if (func.description.toLowerCase().includes(searchTerm)) {
        relevance += 5;
      }
      
      // Check examples
      if (func.examples) {
        func.examples.forEach(example => {
          if (example.toLowerCase().includes(searchTerm)) {
            relevance += 3;
          }
        });
      }
      
      if (relevance > 0) {
        results.push({ ...func, relevance });
      }
    });
    
    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Validate function call parameters
   */
  validateFunctionCall(functionName, parameters) {
    const func = this.getFunction(functionName);
    if (!func) {
      return {
        valid: false,
        error: `Function '${functionName}' not found`
      };
    }

    const { required = [], properties = {} } = func.parameters;
    
    // Check required parameters
    for (const requiredParam of required) {
      if (!(requiredParam in parameters)) {
        return {
          valid: false,
          error: `Missing required parameter: ${requiredParam}`
        };
      }
    }

    // Validate parameter types (basic validation)
    for (const [paramName, paramValue] of Object.entries(parameters)) {
      const paramDef = properties[paramName];
      if (paramDef) {
        const expectedType = paramDef.type;
        const actualType = typeof paramValue;
        
        if (expectedType === 'number' && actualType !== 'number') {
          return {
            valid: false,
            error: `Parameter '${paramName}' should be a number, got ${actualType}`
          };
        }
        
        if (expectedType === 'string' && actualType !== 'string') {
          return {
            valid: false,
            error: `Parameter '${paramName}' should be a string, got ${actualType}`
          };
        }
        
        // Check enum values
        if (paramDef.enum && !paramDef.enum.includes(paramValue)) {
          return {
            valid: false,
            error: `Parameter '${paramName}' must be one of: ${paramDef.enum.join(', ')}`
          };
        }
        
        // Check number ranges
        if (expectedType === 'number') {
          if (paramDef.minimum !== undefined && paramValue < paramDef.minimum) {
            return {
              valid: false,
              error: `Parameter '${paramName}' must be at least ${paramDef.minimum}`
            };
          }
          if (paramDef.maximum !== undefined && paramValue > paramDef.maximum) {
            return {
              valid: false,
              error: `Parameter '${paramName}' must be at most ${paramDef.maximum}`
            };
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Add a new function at runtime
   */
  addFunction(functionDef) {
    try {
      // Validate function definition
      if (!functionDef.name || !functionDef.description || !functionDef.parameters) {
        throw new Error('Function definition must include name, description, and parameters');
      }
      
      this.functions.set(functionDef.name, functionDef);
      
      if (functionDef.handler) {
        this.handlers.set(functionDef.name, functionDef.handler);
      }
      
      if (functionDef.service) {
        this.services.set(functionDef.name, functionDef.service);
      }
      
      logInfo(`Added new function: ${functionDef.name}`);
      return true;
    } catch (error) {
      logError('Error adding function:', error);
      return false;
    }
  }

  /**
   * Remove a function
   */
  removeFunction(functionName) {
    const removed = this.functions.delete(functionName);
    this.handlers.delete(functionName);
    this.services.delete(functionName);
    
    if (removed) {
      logInfo(`Removed function: ${functionName}`);
    }
    
    return removed;
  }
}

export default new FunctionManagerService();
