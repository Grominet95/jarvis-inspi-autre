/**
 * Image Generation Service using OpenAI's image models
 * Handles image generation with streaming support
 */

class ImageService {
  constructor() {
    this.apiKey = localStorage.getItem('openai_api_key') || '';
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
  }

  /**
   * Generate image using OpenAI's image models with streaming support
   */
  async generateImage(prompt, options = {}, onPartialImage = null) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      model = 'gpt-image-1',
      quality = 'standard',
      size = '1024x1024',
      format = 'png',
      partialImages = 2,
      stream = true
    } = options;
    
    let enableStreaming = stream;

    try {
      console.log('🎨 Generating image:', prompt);

      const requestBody = {
        prompt: prompt,
        n: 1
      };
      
      // Add model-specific parameters
      if (model === 'gpt-image-1') {
        requestBody.model = model;
        requestBody.size = size;
        if (quality === 'hd') {
          requestBody.quality = quality;
        }
      } else if (model === 'dall-e-3') {
        requestBody.model = model;
        requestBody.size = size;
        requestBody.quality = quality;
        requestBody.response_format = 'b64_json';
      } else if (model === 'dall-e-2') {
        requestBody.model = model;
        requestBody.size = '1024x1024'; // DALL-E 2 only supports 1024x1024
        requestBody.response_format = 'b64_json';
      }

      // Add streaming options if supported (only GPT Image 1 supports streaming)
      if (enableStreaming && model === 'gpt-image-1') {
        requestBody.stream = true;
        requestBody.partial_images = partialImages;
      } else {
        // Disable streaming for DALL-E models
        enableStreaming = false;
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image API error: ${errorData.error?.message || response.statusText}`);
      }

      // Handle streaming response
      if (enableStreaming && response.body && (model === 'gpt-image-1')) {
        return this.handleStreamingResponse(response, onPartialImage, prompt);
      } else {
        // Handle non-streaming response
        const data = await response.json();
        const imageData = data.data[0];
        
        console.log('✅ Image generated successfully');
        
        // Handle response format - try b64_json first, then url
        let finalImage = imageData.b64_json;
        
        if (!finalImage && imageData.url) {
          // If no base64, fetch the image from URL and convert
          try {
            const imageResponse = await fetch(imageData.url);
            const blob = await imageResponse.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
              reader.readAsDataURL(blob);
            });
            finalImage = base64;
          } catch (error) {
            throw new Error('Failed to process image response');
          }
        }
        
        if (!finalImage) {
          throw new Error('No image data received from API');
        }
        
        // Call the callback for non-streaming responses too
        if (onPartialImage) {
          onPartialImage({
            type: 'final',
            imageData: finalImage,
            isComplete: true,
            revisedPrompt: imageData.revised_prompt || prompt
          });
        }
        
        return {
          finalImage: finalImage,
          revisedPrompt: imageData.revised_prompt || prompt,
          model: model,
          originalPrompt: prompt,
          format: format
        };
      }

    } catch (error) {
      console.error('❌ Image generation failed:', error);
      throw error;
    }
  }

  /**
   * Handle streaming response for partial images
   */
  async handleStreamingResponse(response, onPartialImage, prompt) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalImage = null;
    let revisedPrompt = prompt;
    let partialCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const event = JSON.parse(data);
              
              if (event.type === 'image_generation.partial_image') {
                partialCount++;
                if (onPartialImage) {
                  onPartialImage({
                    type: 'partial',
                    imageData: event.b64_json,
                    index: event.partial_image_index,
                    isComplete: false
                  });
                }
              } else if (event.type === 'image_generation.done') {
                finalImage = event.b64_json;
                revisedPrompt = event.revised_prompt || prompt;
                
                if (onPartialImage && finalImage) {
                  onPartialImage({
                    type: 'final',
                    imageData: finalImage,
                    isComplete: true,
                    revisedPrompt: revisedPrompt
                  });
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming event:', parseError);
            }
          }
        }
      }
      
      return {
        finalImage: finalImage,
        revisedPrompt: revisedPrompt,
        model: 'gpt-image-1',
        originalPrompt: prompt,
        format: 'png',
        partialCount: partialCount
      };
      
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Convert base64 to blob URL for display
   */
  base64ToBlob(base64Data, format = 'png') {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${format}` });
    
    return URL.createObjectURL(blob);
  }

  /**
   * Download image as file
   */
  downloadImage(base64Data, filename = 'generated-image', format = 'png') {
    const blob = this.base64ToBlob(base64Data, format);
    const link = document.createElement('a');
    link.href = blob;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blob);
  }

  /**
   * Save image to desktop (as desktop file)
   */
  saveImageToDesktop(base64Data, prompt, format = 'png') {
    // Generate a safe filename from the prompt
    const filename = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'generated-image';

    console.log('🖼️ Saving image to desktop:', { filename, format, dataLength: base64Data.length });

    // Create thumbnail (smaller version for desktop icon)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      console.log('📸 Creating thumbnail for desktop icon');
      // Create thumbnail (128x128)
      canvas.width = 128;
      canvas.height = 128;
      
      // Calculate aspect ratio
      const aspectRatio = img.width / img.height;
      let drawWidth = 128;
      let drawHeight = 128;
      let offsetX = 0;
      let offsetY = 0;
      
      if (aspectRatio > 1) {
        drawHeight = 128 / aspectRatio;
        offsetY = (128 - drawHeight) / 2;
      } else {
        drawWidth = 128 * aspectRatio;
        offsetX = (128 - drawWidth) / 2;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      const thumbnailBase64 = canvas.toDataURL(`image/${format}`).split(',')[1];
      
      console.log('🖥️ Dispatching add-to-desktop event');
      // Dispatch event to add to desktop
      window.dispatchEvent(new CustomEvent('add-to-desktop', {
        detail: {
          file: {
            id: Date.now() + Math.random(),
            type: 'image',
            name: filename,
            data: `data:image/${format};base64,${base64Data}`,
            thumbnail: `data:image/${format};base64,${thumbnailBase64}`,
            format: format,
            prompt: prompt,
            createdAt: new Date().toISOString()
          }
        }
      }));
    };
    
    img.onerror = (error) => {
      console.error('❌ Failed to load image for thumbnail creation:', error);
    };
    
    img.src = `data:image/${format};base64,${base64Data}`;
  }
}

export default new ImageService();
