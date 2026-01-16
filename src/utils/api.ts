import { OllamaResponse, WritingTone, ApiError } from '../types';
import { StorageManager, Logger } from './storage';

export class OllamaApiClient {
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  static async analyzText(
    text: string, 
    tone: WritingTone = 'professional'
  ): Promise<OllamaResponse> {
    // Check cache first
    const cachedResult = await StorageManager.getCachedSuggestion(text);
    if (cachedResult) {
      return cachedResult;
    }

    const settings = await StorageManager.getSettings();
    
    if (!settings.apiUrl) {
      throw new Error('API URL not configured');
    }

    const prompt = this.buildPrompt(text, tone);
    
    try {
      const response = await this.makeApiRequest(settings.apiUrl, prompt);
      
      // Cache the result
      await StorageManager.setCachedSuggestion(text, response);
      
      return response;
    } catch (error) {
      const apiError: ApiError = {
        message: error instanceof Error ? error.message : 'Unknown API error',
        code: 'API_REQUEST_FAILED',
        timestamp: Date.now()
      };
      
      await Logger.logError(apiError);
      throw error;
    }
  }

  private static buildPrompt(text: string, tone: WritingTone): string {
    return `You are a professional writing assistant. Analyze the following text and provide:
1. Corrected grammar and spelling.
2. Improved style and clarity.
3. Optional paraphrased version in the same tone.

Input Text: "${text}"
Tone Preference: "${tone}"

Please respond with ONLY a valid JSON object in this exact format:
{
  "corrected_text": "...",
  "paraphrased_text": "...", 
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}

Important: 
- Ensure the JSON is valid and parseable
- If no corrections are needed, return the original text in corrected_text
- Provide 1-3 specific suggestions for improvement
- Match the requested tone (${tone})
- Do not include any text before or after the JSON object`;
  }

  private static async makeApiRequest(
    apiUrl: string, 
    prompt: string, 
    retryCount: number = 0
  ): Promise<OllamaResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,
            max_tokens: 500,
            top_p: 0.9
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.response) {
        throw new Error('Invalid API response format');
      }

      // Parse the JSON response from the model
      const parsedResponse = this.parseModelResponse(data.response);
      return parsedResponse;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // Retry logic
      if (retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY * (retryCount + 1));
        return this.makeApiRequest(apiUrl, prompt, retryCount + 1);
      }

      throw error;
    }
  }

  private static parseModelResponse(response: string): OllamaResponse {
    try {
      // Clean the response to extract JSON
      let jsonStr = response.trim();
      
      // Find JSON object in the response
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON found in response');
      }
      
      jsonStr = jsonStr.substring(jsonStart, jsonEnd);
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate required fields
      if (!parsed.corrected_text) {
        throw new Error('Missing corrected_text in response');
      }
      
      return {
        corrected_text: parsed.corrected_text || '',
        paraphrased_text: parsed.paraphrased_text || '',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
      };
      
    } catch (error) {
      console.error('Failed to parse model response:', error);
      console.error('Raw response:', response);
      
      // Fallback response
      return {
        corrected_text: '',
        paraphrased_text: '',
        suggestions: ['Unable to process text at this time']
      };
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async testConnection(apiUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${apiUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
      
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}