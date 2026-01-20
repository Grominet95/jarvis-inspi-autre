/**
 * OpenAI Text Chat Service using the Responses API and Chat Completions API
 * 
 * Features:
 * - Dynamic token parameter handling: Automatically detects and switches between 
 *   'max_tokens' (standard models) and 'max_completion_tokens' (reasoning models)
 * - Persistent model preference caching: Learns and remembers which token parameter 
 *   works for each model across sessions (stored in localStorage)
 * - Intelligent fallback: Automatically retries with alternative parameters on error
 * - Future-proof design: No hardcoded model detection, learns dynamically
 * - Debug tools: Exposes cache management via window.openaiTokenCache
 * 
 * Cache Debug Commands:
 * - window.openaiTokenCache.status() - View current cache
 * - window.openaiTokenCache.clear() - Clear cache
 * - window.openaiTokenCache.set(model, param) - Set preference
 * 
 * https://platform.openai.com/docs/api-reference/responses
 * https://platform.openai.com/docs/api-reference/chat
 */
import { getFromStorage } from './serviceUtils';

class OpenAITextService {
  constructor() {
    this.apiKey = getFromStorage('openai_api_key', '');
    this.useVisualInterpretation = false; // Flag to switch between APIs
    this.modelTokenPreferences = new Map(); // Cache for model token parameter preferences
    this.loadTokenPreferencesFromStorage();
    this.exposeCacheToConsole(); // Make debug tools available
  }

  // Load cached token preferences from localStorage
  loadTokenPreferencesFromStorage() {
    try {
      const cached = getFromStorage('model_token_preferences', '{}');
      const preferences = JSON.parse(cached);
      this.modelTokenPreferences = new Map(Object.entries(preferences));
      console.log('🔄 Loaded token preferences from storage:', this.modelTokenPreferences.size, 'models cached');
    } catch (error) {
      console.warn('Failed to load token preferences from storage:', error);
      this.modelTokenPreferences = new Map();
    }
  }

  // Save cached token preferences to localStorage
  saveTokenPreferencesToStorage() {
    try {
      const preferences = Object.fromEntries(this.modelTokenPreferences);
      localStorage.setItem('model_token_preferences', JSON.stringify(preferences));
      console.log('💾 Saved token preferences to storage');
    } catch (error) {
      console.warn('Failed to save token preferences to storage:', error);
    }
  }

  // Get the preferred token parameter for a model based on cache or default
  getPreferredTokenParameter(model) {
    // Check cache first
    if (this.modelTokenPreferences.has(model)) {
      const cached = this.modelTokenPreferences.get(model);
      console.log(`🎯 Using cached token parameter for ${model}: ${cached}`);
      return cached;
    }
    
    // Default to max_tokens for all models (we'll learn the correct one if it fails)
    console.log(`🔍 No cache for ${model}, defaulting to max_tokens`);
    return 'max_tokens';
  }

  // Cache the token parameter preference for a model
  cacheTokenPreference(model, tokenParameter) {
    const wasNew = !this.modelTokenPreferences.has(model);
    this.modelTokenPreferences.set(model, tokenParameter);
    this.saveTokenPreferencesToStorage();
    
    if (wasNew) {
      console.log(`✅ Learned and cached token parameter for ${model}: ${tokenParameter}`);
    } else {
      console.log(`🔄 Updated cached token parameter for ${model}: ${tokenParameter}`);
    }
  }

  // Clear the token parameter cache (useful for testing or debugging)
  clearTokenPreferenceCache() {
    this.modelTokenPreferences.clear();
    try {
      localStorage.removeItem('model_token_preferences');
      console.log('🧹 Cleared token parameter preference cache and storage');
    } catch (error) {
      console.warn('Failed to clear token preferences from storage:', error);
    }
  }

  // Get cache status for debugging
  getTokenPreferenceCacheStatus() {
    const cacheEntries = Array.from(this.modelTokenPreferences.entries());
    console.log('📊 Token Parameter Cache Status:', cacheEntries);
    return {
      entries: cacheEntries,
      size: this.modelTokenPreferences.size,
      models: cacheEntries.map(([model, param]) => `${model}: ${param}`)
    };
  }

  // Manually set a token preference (useful for known models)
  setTokenPreference(model, tokenParameter) {
    if (!['max_tokens', 'max_completion_tokens'].includes(tokenParameter)) {
      throw new Error(`Invalid token parameter: ${tokenParameter}. Must be 'max_tokens' or 'max_completion_tokens'`);
    }
    this.cacheTokenPreference(model, tokenParameter);
  }

  // Add method to expose cache to global scope for debugging
  exposeCacheToConsole() {
    if (typeof window !== 'undefined') {
      window.openaiTokenCache = {
        status: () => this.getTokenPreferenceCacheStatus(),
        clear: () => this.clearTokenPreferenceCache(),
        set: (model, param) => this.setTokenPreference(model, param),
        get: (model) => this.getPreferredTokenParameter(model)
      };
      console.log('🔧 Debug tools available: window.openaiTokenCache');
    }
  }

  // Update API key
  setApiKey(newApiKey) {
    this.apiKey = newApiKey;
  }

  // Set visual interpretation mode
  setVisualInterpretation(enabled) {
    this.useVisualInterpretation = enabled;
  }

  // Get current API mode
  getApiMode() {
    return this.useVisualInterpretation ? 'chat' : 'responses';
  }

  // Send message with image support using Chat Completions API
  async sendMessageWithImage(message, imageUrl, model = 'gpt-4o', systemPrompt = '', conversationHistory = []) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    // Validate that the image URL is a data URL (base64 encoded)
    if (!imageUrl.startsWith('data:image/')) {
      throw new Error('Invalid image format. Expected a data URL (base64 encoded image).');
    }

    // Build messages array with system prompt and conversation history
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation history
    messages.push(...conversationHistory);

    // Create user message with image
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: message
        },
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
            detail: 'high'
          }
        }
      ]
    };

    messages.push(userMessage);

    // Try with the preferred token parameter first
    const preferredTokenParam = this.getPreferredTokenParameter(model);
    const alternativeTokenParam = preferredTokenParam === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
    
    try {
      const result = await this._makeImageCompletionRequest(model, messages, preferredTokenParam);
      // Cache the successful parameter
      this.cacheTokenPreference(model, preferredTokenParam);
      return result;
    } catch (error) {
      // Check if the error is about unsupported token parameter (more robust detection)
      const errorMessage = error.message.toLowerCase();
      const isTokenParameterError = (
        (errorMessage.includes('max_tokens') && errorMessage.includes('not supported')) ||
        (errorMessage.includes('max_completion_tokens') && errorMessage.includes('not supported')) ||
        (errorMessage.includes('unsupported parameter') && errorMessage.includes('tokens'))
      );
      
      if (isTokenParameterError) {
        console.log(`🔄 Model ${model} requires ${alternativeTokenParam} instead of ${preferredTokenParam} for image analysis. Retrying...`);
        try {
          const result = await this._makeImageCompletionRequest(model, messages, alternativeTokenParam);
          // Cache the successful parameter
          this.cacheTokenPreference(model, alternativeTokenParam);
          return result;
        } catch (retryError) {
          console.error('OpenAI Chat Completions (Image) API Error (retry):', retryError);
          throw retryError;
        }
      }
      // If it's not the token parameter error, throw the original error
      console.error('OpenAI Chat Completions (Image) API Error:', error);
      throw error;
    }
  }

  // Helper method to make image completion requests with different token parameter names
  async _makeImageCompletionRequest(model, messages, tokenParameterName) {
    const requestBody = {
      model: model,
      messages: messages,
      temperature: 0.7
    };

    // Add the appropriate token parameter
    if (tokenParameterName === 'max_tokens') {
      requestBody.max_tokens = 2000;
    } else if (tokenParameterName === 'max_completion_tokens') {
      requestBody.max_completion_tokens = 2000;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch (e) {
        // Keep original error text if parsing fails
      }
      
      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    console.log(`Chat Completions API (with image, using ${tokenParameterName}) response:`, data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return {
      message: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      hasImage: true,
      tokenParameter: tokenParameterName
    };
  }

  // Send message to OpenAI using Responses API
  async sendMessage(message, model = 'gpt-4.1', systemPrompt = '', conversationHistory = [], vectorStoreIds = [], useFileSearch = false, imageUrl = null) {
    // If visual interpretation mode is enabled or image is provided, use Chat Completions API
    if (this.useVisualInterpretation || imageUrl) {
      if (imageUrl) {
        return this.sendMessageWithImage(message, imageUrl, model, systemPrompt, conversationHistory);
      } else {
        return this.sendMessageWithChatCompletions(message, model, systemPrompt, conversationHistory);
      }
    }

    // Otherwise use the original Responses API logic
    return this.sendMessageWithResponses(message, model, systemPrompt, conversationHistory, vectorStoreIds, useFileSearch);
  }

  // Chat Completions API method (text-only)
  async sendMessageWithChatCompletions(message, model = 'gpt-4o', systemPrompt = '', conversationHistory = []) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    // Build messages array with system prompt and conversation history
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation history
    messages.push(...conversationHistory);

    // Add the current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Try with the preferred token parameter first
    const preferredTokenParam = this.getPreferredTokenParameter(model);
    const alternativeTokenParam = preferredTokenParam === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
    
    try {
      const result = await this._makeCompletionRequest(model, messages, preferredTokenParam);
      // Cache the successful parameter
      this.cacheTokenPreference(model, preferredTokenParam);
      return result;
    } catch (error) {
      // Check if the error is about unsupported token parameter (more robust detection)
      const errorMessage = error.message.toLowerCase();
      const isTokenParameterError = (
        (errorMessage.includes('max_tokens') && errorMessage.includes('not supported')) ||
        (errorMessage.includes('max_completion_tokens') && errorMessage.includes('not supported')) ||
        (errorMessage.includes('unsupported parameter') && errorMessage.includes('tokens'))
      );
      
      if (isTokenParameterError) {
        console.log(`🔄 Model ${model} requires ${alternativeTokenParam} instead of ${preferredTokenParam}. Retrying...`);
        try {
          const result = await this._makeCompletionRequest(model, messages, alternativeTokenParam);
          // Cache the successful parameter
          this.cacheTokenPreference(model, alternativeTokenParam);
          return result;
        } catch (retryError) {
          console.error('OpenAI Chat Completions API Error (retry):', retryError);
          throw retryError;
        }
      }
      // If it's not the token parameter error, throw the original error
      console.error('OpenAI Chat Completions API Error:', error);
      throw error;
    }
  }

  // Helper method to make completion requests with different token parameter names
  async _makeCompletionRequest(model, messages, tokenParameterName) {
    const requestBody = {
      model: model,
      messages: messages,
      temperature: 0.7
    };

    // Add the appropriate token parameter
    if (tokenParameterName === 'max_tokens') {
      requestBody.max_tokens = 2000;
    } else if (tokenParameterName === 'max_completion_tokens') {
      requestBody.max_completion_tokens = 2000;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch (e) {
        // Keep original error text if parsing fails
      }
      
      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    console.log(`Chat Completions API response (using ${tokenParameterName}):`, data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return {
      message: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      apiMode: 'chat',
      tokenParameter: tokenParameterName
    };
  }

  // Original Responses API method (renamed for clarity)
  async sendMessageWithResponses(message, model = 'gpt-4.1', systemPrompt = '', conversationHistory = [], vectorStoreIds = [], useFileSearch = false) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    // Build the input string with system prompt, conversation history, and current message
    let input = '';
    
    if (systemPrompt) {
      input += `System: ${systemPrompt}\n\n`;
    }

    // Add conversation history
    conversationHistory.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      input += `${role}: ${msg.content}\n\n`;
    });

    // Add the current user message
    input += `User: ${message}\n\nAssistant:`;

    // Prepare request body
    const requestBody = {
      model: model,
      input: input
    };

    // Add file search tools if vector stores are provided
    if (useFileSearch && vectorStoreIds.length > 0) {
      requestBody.tools = [{
        type: "file_search",
        vector_store_ids: vectorStoreIds,
        max_num_results: 20
      }];
      requestBody.tool_choice = "auto";
    }

    try {
      // Use the Responses API
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorText;
        } catch (e) {
          // Keep original error text if parsing fails
        }
        
        throw new Error(`OpenAI API Error: ${errorMessage}`);
      }

      const data = await response.json();
      
      console.log('OpenAI Responses API response:', data);
      
      // Parse the response structure based on your example
      if (!data.output || !Array.isArray(data.output) || data.output.length === 0) {
        throw new Error('Invalid response from OpenAI Responses API - no output');
      }

      // Extract file search results and message
      let fileSearchResults = [];
      let messageOutput = null;
      let citations = [];

      // Process all output items
      data.output.forEach(item => {
        if (item.type === 'file_search_call') {
          fileSearchResults.push(item);
        } else if (item.type === 'message') {
          messageOutput = item;
        }
      });

      if (!messageOutput || !messageOutput.content) {
        throw new Error('Invalid message structure in Responses API output');
      }

      // Extract the text content and citations
      let messageText = '';
      if (Array.isArray(messageOutput.content)) {
        // Find the text content
        const textContent = messageOutput.content.find(item => item.type === 'output_text');
        if (textContent && textContent.text) {
          messageText = textContent.text;
          citations = textContent.annotations || [];
        } else {
          throw new Error('No text content found in response');
        }
      } else if (typeof messageOutput.content === 'string') {
        messageText = messageOutput.content;
      } else {
        throw new Error('Unrecognized content format in response');
      }

      return {
        message: messageText,
        usage: data.usage,
        model: data.model,
        responseId: data.id,
        status: data.status,
        fileSearchResults: fileSearchResults,
        citations: citations,
        hasVectorResults: useFileSearch && citations.length > 0,
        apiMode: 'responses'
      };
    } catch (error) {
      console.error('OpenAI Responses API Error:', error);
      
      // Fallback to Chat Completions API if Responses API fails
      console.warn('Falling back to Chat Completions API...');
      return this.sendMessageFallback(message, model, systemPrompt, conversationHistory);
    }
  }

  // Fallback to Chat Completions API
  async sendMessageFallback(message, model = 'gpt-4o-mini', systemPrompt = '', conversationHistory = []) {
    // Build messages array with system prompt and conversation history
    const messages = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add conversation history
    messages.push(...conversationHistory);

    // Add the current user message
    messages.push({
      role: 'user',
      content: message
    });

    // Try with the preferred token parameter first
    const preferredTokenParam = this.getPreferredTokenParameter(model);
    const alternativeTokenParam = preferredTokenParam === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens';
    
    try {
      const result = await this._makeFallbackCompletionRequest(model, messages, preferredTokenParam);
      // Cache the successful parameter
      this.cacheTokenPreference(model, preferredTokenParam);
      return result;
    } catch (error) {
      // Check if the error is about unsupported token parameter (more robust detection)
      const errorMessage = error.message.toLowerCase();
      const isTokenParameterError = (
        (errorMessage.includes('max_tokens') && errorMessage.includes('not supported')) ||
        (errorMessage.includes('max_completion_tokens') && errorMessage.includes('not supported')) ||
        (errorMessage.includes('unsupported parameter') && errorMessage.includes('tokens'))
      );
      
      if (isTokenParameterError) {
        console.log(`🔄 Model ${model} requires ${alternativeTokenParam} instead of ${preferredTokenParam} (fallback). Retrying...`);
        try {
          const result = await this._makeFallbackCompletionRequest(model, messages, alternativeTokenParam);
          // Cache the successful parameter
          this.cacheTokenPreference(model, alternativeTokenParam);
          return result;
        } catch (retryError) {
          console.error('OpenAI Text Service Error (fallback retry):', retryError);
          throw retryError;
        }
      }
      // If it's not the token parameter error, throw the original error
      console.error('OpenAI Text Service Error:', error);
      throw error;
    }
  }

  // Helper method to make fallback completion requests with different token parameter names
  async _makeFallbackCompletionRequest(model, messages, tokenParameterName) {
    const requestBody = {
      model: model,
      messages: messages,
      temperature: 0.7
    };

    // Add the appropriate token parameter
    if (tokenParameterName === 'max_tokens') {
      requestBody.max_tokens = 2000;
    } else if (tokenParameterName === 'max_completion_tokens') {
      requestBody.max_completion_tokens = 2000;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorText;
      } catch (e) {
        // Keep original error text if parsing fails
      }
      
      throw new Error(`OpenAI API Error: ${errorMessage}`);
    }

    const data = await response.json();
    
    console.log(`Chat Completions API response (fallback, using ${tokenParameterName}):`, data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    return {
      message: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      tokenParameter: tokenParameterName
    };
  }

  // Fetch available models from OpenAI API
  async fetchAvailableModels() {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch models: ${errorText}`);
      }

      const data = await response.json();
      
      // Filter for text generation models (exclude whisper, dall-e, etc.)
      const textModels = data.data.filter(model => {
        const modelId = model.id.toLowerCase();
        return (
          (modelId.includes('gpt') || modelId.includes('o1') || modelId.includes('text')) &&
          !modelId.includes('whisper') &&
          !modelId.includes('dall-e') &&
          !modelId.includes('tts') &&
          !modelId.includes('embedding') &&
          !modelId.includes('realtime')
        );
      });

      // Sort models by ID for consistent ordering
      textModels.sort((a, b) => {
        // Prioritize newer models
        if (a.id.includes('o1') && !b.id.includes('o1')) return -1;
        if (b.id.includes('o1') && !a.id.includes('o1')) return 1;
        if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1;
        if (b.id.includes('gpt-4') && !a.id.includes('gpt-4')) return 1;
        return a.id.localeCompare(b.id);
      });

      return textModels.map(model => ({
        id: model.id,
        name: this.formatModelName(model.id),
        created: model.created,
        owned_by: model.owned_by
      }));
    } catch (error) {
      console.error('Error fetching models:', error);
      // Return fallback models if API call fails
      return [
        { id: 'gpt-4.1', name: 'GPT-4.1', created: 0, owned_by: 'openai' },
        { id: 'gpt-4o', name: 'GPT-4o', created: 0, owned_by: 'openai' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', created: 0, owned_by: 'openai' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', created: 0, owned_by: 'openai' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', created: 0, owned_by: 'openai' }
      ];
    }
  }

  // Format model ID into a readable name
  formatModelName(modelId) {
    const nameMap = {
      'gpt-4.1': 'GPT-4.1',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
      'gpt-4': 'GPT-4',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'o1-preview': 'o1 Preview',
      'o1-mini': 'o1 Mini',
      'o1-pro': 'o1 Pro',
      'o1': 'o1'
    };

    // Check if it's in the map first
    if (nameMap[modelId]) {
      return nameMap[modelId];
    }
    
    // Default formatting for unknown models
    return modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Vector Store Management Methods

  // Fetch available vector stores
  async fetchVectorStores() {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/vector_stores', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch vector stores: ${errorText}`);
      }

      const data = await response.json();
      
      return data.data.map(store => ({
        id: store.id,
        name: store.name || store.id,
        file_counts: store.file_counts,
        status: store.status,
        created_at: store.created_at,
        metadata: store.metadata
      }));
    } catch (error) {
      console.error('Error fetching vector stores:', error);
      return [];
    }
  }

  // Create a new vector store
  async createVectorStore(name, fileIds = []) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/vector_stores', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          name: name,
          file_ids: fileIds
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create vector store: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating vector store:', error);
      throw error;
    }
  }

  // Delete a vector store
  async deleteVectorStore(vectorStoreId) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete vector store: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting vector store:', error);
      throw error;
    }
  }

  // Get files in a vector store
  async getVectorStoreFiles(vectorStoreId) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get vector store files: ${errorText}`);
      }

      const data = await response.json();
      const files = data.data || [];
      
      // Fetch original filenames for each file
      const filesWithNames = await Promise.all(
        files.map(async (file) => {
          try {
            // Get individual file details to retrieve original filename
            const fileResponse = await fetch(`https://api.openai.com/v1/files/${file.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              }
            });
            
            if (fileResponse.ok) {
              const fileDetails = await fileResponse.json();
              return {
                ...file,
                filename: fileDetails.filename || file.id,
                originalName: fileDetails.filename || file.id
              };
            }
          } catch (error) {
            console.warn(`Failed to get filename for file ${file.id}:`, error);
          }
          
          // Fallback to file ID if we can't get the original name
          return {
            ...file,
            filename: file.id,
            originalName: file.id
          };
        })
      );
      
      return filesWithNames;
    } catch (error) {
      console.error('Error getting vector store files:', error);
      return [];
    }
  }

  // Remove file from vector store
  async removeFileFromVectorStore(vectorStoreId, fileId) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to remove file from vector store: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing file from vector store:', error);
      throw error;
    }
  }

  // Get detailed information about a vector store
  async getVectorStoreDetails(vectorStoreId) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get vector store details: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting vector store details:', error);
      throw error;
    }
  }

  // Upload file to vector store
  async uploadFileToVectorStore(vectorStoreId, file) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');

      const uploadResponse = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Failed to upload file: ${errorText}`);
      }

      const uploadedFile = await uploadResponse.json();

      // Then add the file to the vector store
      const addResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          file_id: uploadedFile.id
        })
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        throw new Error(`Failed to add file to vector store: ${errorText}`);
      }

      return await addResponse.json();
    } catch (error) {
      console.error('Error uploading file to vector store:', error);
      throw error;
    }
  }

  // Upload multiple files to vector store in batch
  async uploadFilesToVectorStore(vectorStoreId, files) {
    if (!this.apiKey) {
      throw new Error('No OpenAI API key found. Please add your API key in the settings.');
    }

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadFileToVectorStore(vectorStoreId, file);
        results.push({ file: file.name, success: true, result });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        errors.push({ file: file.name, error: error.message });
      }
    }

    return { results, errors };
  }
}

export default new OpenAITextService();
