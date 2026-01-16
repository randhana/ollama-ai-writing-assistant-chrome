import { BackgroundMessage, PopupMessage, ContentMessage } from '../types';
import { OllamaApiClient } from '../utils/api';
import { StorageManager, Logger } from '../utils/storage';

class BackgroundService {
  constructor() {
    this.init();
  }

  private init(): void {
    // Set up message listeners - return true for async handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
    
    // Set up context menus
    this.setupContextMenus();
    
    // Set up extension icon click handler
    chrome.action.onClicked.addListener(this.handleIconClick.bind(this));
    
    // Set up installation handler
    chrome.runtime.onInstalled.addListener(this.handleInstallation.bind(this));
  }

  private async handleMessage(
    message: BackgroundMessage | PopupMessage | ContentMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('Background received message:', message.type);
      
      switch (message.type) {
        case 'API_REQUEST':
          await this.handleApiRequest(message, sendResponse);
          break;
          
        case 'GET_SETTINGS':
          await this.handleGetSettings(sendResponse);
          break;
          
        case 'UPDATE_SETTINGS':
          await this.handleUpdateSettings(message, sendResponse);
          break;
          
        case 'ANALYZE_TEXT':
          await this.handleAnalyzeText(message, sendResponse);
          break;
          
        case 'ANALYZE_POPUP_TEXT':
          await this.handleAnalyzePopupText(message, sendResponse);
          break;
          
        case 'ERROR_LOG':
          await this.handleErrorLog(message);
          sendResponse({ success: true });
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background message handler error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleApiRequest(
    message: BackgroundMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const { text, tone } = message.data || {};
    
    if (!text) {
      sendResponse({ error: 'Text is required for API request' });
      return;
    }

    try {
      const result = await OllamaApiClient.analyzText(text, tone);
      sendResponse({ success: true, data: result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'API request failed';
      sendResponse({ success: false, error: errorMessage });
      
      // Log the error
      await Logger.logError({
        message: errorMessage,
        code: 'API_REQUEST_ERROR',
        timestamp: Date.now()
      });
    }
  }

  private async handleGetSettings(
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      const settings = await StorageManager.getSettings();
      sendResponse({ success: true, data: settings });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get settings';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleUpdateSettings(
    message: PopupMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    const { settings } = message.data || {};
    
    if (!settings) {
      sendResponse({ error: 'Settings data is required' });
      return;
    }

    try {
      await StorageManager.saveSettings(settings);
      sendResponse({ success: true });
      
      // Notify all tabs about settings update
      this.notifyTabsSettingsUpdate(settings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleAnalyzeText(
    message: ContentMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    console.log('handleAnalyzeText called with:', message.data);
    
    const { text } = message.data || {};
    
    if (!text || text.trim().length < 10) {
      console.log('Text too short, rejecting');
      sendResponse({ 
        success: false, 
        error: 'Text too short for analysis (minimum 10 characters)' 
      });
      return;
    }

    try {
      console.log('Making direct Ollama API call from background for content script...');
      
      // Make direct API call from background script (same as popup)
      const apiUrl = 'http://localhost:11434';
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:latest',
          prompt: `You are a professional writing assistant. Fix grammar, improve clarity, and suggest better wording for this text: "${text}"

Respond in this exact format:
CORRECTED: [corrected version]
IMPROVED: [improved/paraphrased version]
SUGGESTIONS: [list 2-3 specific improvements]`,
          stream: false
        })
      });

      console.log('Ollama API response status for content script:', response.status);
      
      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Ollama API result for content script:', result);
      
      // Parse the response
      const aiResponse = result.response || '';
      
      const analysisResult = {
        corrected_text: this.extractSection(aiResponse, 'CORRECTED') || text,
        paraphrased_text: this.extractSection(aiResponse, 'IMPROVED') || '',
        suggestions: this.extractSuggestions(aiResponse) || ['Grammar checked', 'Style improved'],
        tone_analysis: `Analysis completed using ${result.model || 'Ollama'}`
      };
      
      console.log('Sending successful response for content script:', analysisResult);
      sendResponse({ success: true, data: analysisResult });
      
    } catch (error) {
      console.error('Background API call failed for content script:', error);
      const errorMessage = error instanceof Error ? error.message : 'Text analysis failed';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private async handleAnalyzePopupText(
    message: PopupMessage,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    console.log('handleAnalyzePopupText called with:', message.data);
    
    const { text, settings } = message.data || {};
    
    if (!text || text.trim().length < 10) {
      console.log('Text too short, rejecting');
      sendResponse({ 
        success: false, 
        error: 'Text too short for analysis (minimum 10 characters)' 
      });
      return;
    }

    try {
      console.log('Making direct Ollama API call from background...');
      
      // Make direct API call from background script (which has permissions)
      const apiUrl = 'http://localhost:11434';
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3:latest',
          prompt: `You are a professional writing assistant. Fix grammar, improve clarity, and suggest better wording for this text: "${text}"

Respond in this exact format:
CORRECTED: [corrected version]
IMPROVED: [improved/paraphrased version]
SUGGESTIONS: [list 2-3 specific improvements]`,
          stream: false
        })
      });

      console.log('Ollama API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Ollama API returned ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Ollama API result:', result);
      
      // Parse the response
      const aiResponse = result.response || '';
      
      const analysisResult = {
        corrected_text: this.extractSection(aiResponse, 'CORRECTED') || text,
        paraphrased_text: this.extractSection(aiResponse, 'IMPROVED') || '',
        suggestions: this.extractSuggestions(aiResponse) || ['Grammar checked', 'Style improved'],
        tone_analysis: `Analysis completed using ${result.model || 'Ollama'}`
      };
      
      console.log('Sending successful response:', analysisResult);
      sendResponse({ success: true, data: analysisResult });
      
    } catch (error) {
      console.error('Background API call failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Text analysis failed';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  private extractSection(text: string, section: string): string {
    const regex = new RegExp(`${section}:(.+?)(?=\\n[A-Z]+:|$)`, 's');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractSuggestions(text: string): string[] {
    const suggestions = this.extractSection(text, 'SUGGESTIONS');
    return suggestions ? suggestions.split(/[,\n]/).map(s => s.trim()).filter(s => s) : [];
  }

  private async handleErrorLog(message: BackgroundMessage): Promise<void> {
    const { error } = message.data || {};
    
    if (error) {
      await Logger.logError(error);
    }
  }

  private async notifyTabsSettingsUpdate(settings: any): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            data: { settings },
            timestamp: Date.now()
          }).catch(() => {
            // Ignore errors for tabs that don't have content scripts
          });
        }
      }
    } catch (error) {
      console.error('Failed to notify tabs of settings update:', error);
    }
  }

  private async setupContextMenus(): Promise<void> {
    try {
      await chrome.contextMenus.removeAll();
      
      chrome.contextMenus.create({
        id: 'analyze-selection',
        title: 'Analyze with AI Writing Assistant',
        contexts: ['selection'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });

      chrome.contextMenus.onClicked.addListener(this.handleContextMenuClick.bind(this));
    } catch (error) {
      console.error('Failed to setup context menus:', error);
    }
  }

  private async handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ): Promise<void> {
    if (info.menuItemId === 'analyze-selection' && info.selectionText && tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'ANALYZE_SELECTION',
          data: { text: info.selectionText },
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Failed to send analysis message to tab:', error);
      }
    }
  }

  private handleIconClick(tab: chrome.tabs.Tab): void {
    // Extension icon click opens the popup automatically
    // This is just a placeholder for any additional logic
    console.log('Extension icon clicked for tab:', tab.id);
  }

  private async handleInstallation(details: chrome.runtime.InstalledDetails): Promise<void> {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
      // Set up default settings on first install
      await StorageManager.saveSettings({});
    }
  }
}

// Initialize background service
new BackgroundService();