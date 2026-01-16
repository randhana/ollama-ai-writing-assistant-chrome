import { ExtensionSettings, ApiError, OllamaResponse } from '../types';

export class StorageManager {
  private static readonly SETTINGS_KEY = 'writing-assistant-settings';
  private static readonly CACHE_KEY = 'writing-assistant-cache';
  private static readonly DEFAULT_SETTINGS: ExtensionSettings = {
    isEnabled: true,
    apiKey: '',
    apiUrl: 'http://localhost:11434',
    selectedTone: 'professional',
    suggestionFrequency: 'medium',
    enableRealTime: true,
    enableAutoComplete: true,
    debounceMs: 1500
  };

  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      return { ...this.DEFAULT_SETTINGS, ...result[this.SETTINGS_KEY] };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: updatedSettings });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  static async clearCache(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  static async getCachedSuggestion(text: string): Promise<OllamaResponse | null> {
    try {
      const result = await chrome.storage.local.get(this.CACHE_KEY);
      const cache = result[this.CACHE_KEY] || {};
      const textHash = this.hashText(text);
      return cache[textHash] || null;
    } catch (error) {
      console.error('Failed to get cached suggestion:', error);
      return null;
    }
  }

  static async setCachedSuggestion(text: string, suggestion: OllamaResponse): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.CACHE_KEY);
      const cache = result[this.CACHE_KEY] || {};
      const textHash = this.hashText(text);
      
      // Limit cache size to prevent storage overflow
      const cacheKeys = Object.keys(cache);
      if (cacheKeys.length > 100) {
        // Remove oldest entries
        const keysToRemove = cacheKeys.slice(0, 20);
        keysToRemove.forEach(key => delete cache[key]);
      }
      
      cache[textHash] = suggestion;
      await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
    } catch (error) {
      console.error('Failed to cache suggestion:', error);
    }
  }

  private static hashText(text: string): string {
    // Simple hash function for text caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

export class Logger {
  private static readonly LOG_KEY = 'writing-assistant-logs';
  private static readonly MAX_LOGS = 100;

  static async logError(error: ApiError): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.LOG_KEY);
      const logs = result[this.LOG_KEY] || [];
      
      logs.push({
        ...error,
        timestamp: Date.now()
      });

      // Keep only the most recent logs
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS);
      }

      await chrome.storage.local.set({ [this.LOG_KEY]: logs });
    } catch (storageError) {
      console.error('Failed to log error:', storageError);
    }
  }

  static async getLogs(): Promise<ApiError[]> {
    try {
      const result = await chrome.storage.local.get(this.LOG_KEY);
      return result[this.LOG_KEY] || [];
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  static async clearLogs(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.LOG_KEY);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  };
}

export function isTextInputElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'textarea') {
    return true;
  }
  
  if (tagName === 'input') {
    const inputType = (element as HTMLInputElement).type.toLowerCase();
    const textInputTypes = ['text', 'email', 'password', 'search', 'tel', 'url'];
    return textInputTypes.includes(inputType);
  }
  
  if (tagName === 'div' || tagName === 'span' || tagName === 'p') {
    return (element as HTMLElement).contentEditable === 'true';
  }
  
  return false;
}

export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,;:!?'"()-]/g, '');
}

export function validateApiUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}