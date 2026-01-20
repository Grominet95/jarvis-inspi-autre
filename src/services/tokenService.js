/**
 * Service for handling OpenAI tokens and API key management
 */
const TokenService = {
  /**
   * Fetches a token from the server using the stored API key
   * @param {Object} options - Options for token generation
   * @returns {Promise<Object>} The token response
   */
  async getToken(options = {}) {
    const apiKey = localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
      throw new Error("No API key found. Please add your OpenAI API key in the settings.");
    }
    
    // Updated to match OpenAI's API specification for system instructions
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey,
        model: options.model || "gpt-4o-mini-realtime-preview",
        voice: options.voice || "echo",
        options: {
          system_instruction: options.systemPrompt || "You are JARVIS, an AI assistant integrated with the HoloMat interface."
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to get token: ${response.status}`);
    }
    
    return await response.json();
  },
  
  /**
   * Checks if an API key exists in localStorage
   * @returns {boolean} Whether an API key exists
   */
  hasApiKey() {
    const apiKey = localStorage.getItem('openai_api_key');
    return !!apiKey;
  }
};

export default TokenService;
