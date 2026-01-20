/**
 * Web Search Service using OpenAI's search-enabled models
 * Handles web search queries with citations and sources
 */

class SearchService {
  constructor() {
    this.apiKey = localStorage.getItem('openai_api_key') || '';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
  }

  /**
   * Perform web search using OpenAI's search models
   */
  async searchWeb(query, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      model = 'gpt-4o-search-preview',
      contextSize = 'medium',
      userLocation = null
    } = options;

    try {
      console.log('🔍 Performing web search:', query);

      const requestBody = {
        model: model,
        web_search_options: {
          search_context_size: contextSize
        },
        messages: [
          {
            role: "system",
            content: `You are a helpful research assistant. When responding to queries:
            
1. **Structure your response with clear sections using markdown headers**
2. **Include relevant images when possible** using markdown image syntax: ![description](url)
3. **Use proper markdown formatting**: 
   - Headers (##, ###)
   - Lists (- or 1.)
   - **Bold** and *italic* text
   - Code blocks when relevant
   - Tables when appropriate
4. **Always include inline citations** for sources
5. **Make your response comprehensive but well-organized**
6. **Include a "Sources" section at the end** with all referenced URLs

Format your response as a complete markdown document that will be rendered in a document viewer.`
          },
          {
            role: "user",
            content: query
          }
        ]
      };

      // Add user location if provided
      if (userLocation) {
        requestBody.web_search_options.user_location = {
          type: "approximate",
          approximate: userLocation
        };
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Search API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const message = data.choices[0].message;

      console.log('✅ Search completed successfully');

      return {
        content: message.content,
        annotations: message.annotations || [],
        sources: this.extractSources(message.annotations || []),
        model: model,
        query: query
      };

    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Extract unique sources from annotations
   */
  extractSources(annotations) {
    const sources = new Set();
    
    annotations.forEach(annotation => {
      if (annotation.type === 'url_citation' && annotation.url_citation) {
        sources.add({
          url: annotation.url_citation.url,
          title: annotation.url_citation.title
        });
      }
    });

    return Array.from(sources);
  }
}

export default new SearchService();

