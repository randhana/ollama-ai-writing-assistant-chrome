import './content.css';
import { 
  TextElement, 
  WritingSuggestion, 
  ExtensionSettings, 
  ContentMessage,
  HighlightRange,
  SuggestionType 
} from '../types';
import { debounce, isTextInputElement, sanitizeText } from '../utils/storage';

class ContentScriptManager {
  private settings: ExtensionSettings | null = null;
  private monitoredElements = new Map<HTMLElement, TextElement>();
  private suggestionTooltip: HTMLElement | null = null;
  private isEnabled = true;
  private debouncedAnalyze: (element: HTMLElement, text: string) => void;

  constructor() {
    this.debouncedAnalyze = debounce(this.analyzeText.bind(this), 3000); // 3 seconds debounce
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
    this.startTextMonitoring();
    this.createTooltip();
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await this.sendMessage({
        type: 'GET_SETTINGS',
        data: {},
        timestamp: Date.now()
      });

      if (response?.success) {
        this.settings = response.data;
        this.isEnabled = this.settings?.isEnabled ?? true;
      } else {
        // Use default settings if communication fails
        console.warn('Using default settings due to communication issue');
        this.settings = {
          isEnabled: true,
          apiKey: '',
          apiUrl: 'http://localhost:11434',
          selectedTone: 'professional',
          suggestionFrequency: 'medium',
          enableRealTime: true,
          enableAutoComplete: true,
          debounceMs: 1500
        };
        this.isEnabled = true;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Don't let this block initialization - use defaults
      this.settings = {
        isEnabled: true,
        apiKey: '',
        apiUrl: 'http://localhost:11434',
        selectedTone: 'professional',
        suggestionFrequency: 'medium', 
        enableRealTime: true,
        enableAutoComplete: true,
        debounceMs: 1500
      };
      this.isEnabled = true;
    }
  }

  private setupEventListeners(): void {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Listen for text input events
    document.addEventListener('input', this.handleInput.bind(this), true);
    document.addEventListener('focus', this.handleFocus.bind(this), true);
    document.addEventListener('blur', this.handleBlur.bind(this), true);
    
    // Listen for mouse events for tooltips
    document.addEventListener('mouseover', this.handleMouseOver.bind(this), true);
    document.addEventListener('mouseout', this.handleMouseOut.bind(this), true);
    document.addEventListener('click', this.handleClick.bind(this), true);
    
    // Listen for DOM changes
    this.setupMutationObserver();
  }

  private handleMessage(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): boolean {
    switch (message.type) {
      case 'SETTINGS_UPDATED':
        this.handleSettingsUpdate(message.data.settings);
        break;
        
      case 'ANALYZE_SELECTION':
        this.handleAnalyzeSelection(message.data.text);
        break;
        
      case 'CLEAR_HIGHLIGHTS':
        this.clearAllHighlights();
        break;
    }
    
    return true;
  }

  private handleSettingsUpdate(newSettings: ExtensionSettings): void {
    this.settings = newSettings;
    this.isEnabled = newSettings.isEnabled;
    
    if (!this.isEnabled) {
      this.clearAllHighlights();
    }
    
    // Update debounce timing if changed
    this.debouncedAnalyze = debounce(
      this.analyzeText.bind(this), 
      newSettings.debounceMs || 1500
    );
  }

  private handleInput(event: Event): void {
    if (!this.isEnabled || !this.settings?.enableRealTime) {
      console.log('📝 Content: Input handler disabled or real-time disabled');
      return;
    }

    const element = event.target as HTMLElement;
    
    if (!isTextInputElement(element)) {
      console.log('📝 Content: Element is not a text input, ignoring');
      return;
    }

    const text = this.getElementText(element);
    console.log('📝 Content: Input detected, text length:', text.length, 'chars');
    
    if (text.trim().length < 10) {
      console.log('📝 Content: Text too short, clearing highlights');
      this.clearHighlights(element);
      return;
    }

    console.log('📝 Content: Triggering debounced analysis in 3 seconds...');
    // Debounced analysis
    this.debouncedAnalyze(element, text);
  }

  private handleFocus(event: Event): void {
    const element = event.target as HTMLElement;
    
    if (isTextInputElement(element) && !this.monitoredElements.has(element)) {
      this.addElementToMonitoring(element);
    }
  }

  private handleBlur(event: Event): void {
    const element = event.target as HTMLElement;
    
    if (isTextInputElement(element)) {
      this.hideTooltip();
    }
  }

  private handleMouseOver(event: Event): void {
    const element = event.target as HTMLElement;
    
    if (element.classList.contains('writing-assistant-highlight')) {
      this.showTooltipForHighlight(element, event as MouseEvent);
    }
  }

  private handleMouseOut(event: Event): void {
    const element = event.target as HTMLElement;
    
    if (element.classList.contains('writing-assistant-highlight')) {
      this.hideTooltip();
    }
  }

  private handleClick(event: Event): void {
    const element = event.target as HTMLElement;
    
    if (element.classList.contains('writing-assistant-suggestion')) {
      this.applySuggestion(element);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Handle newly added nodes
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            this.scanForTextElements(element);
          }
        });
        
        // Handle removed nodes - clean up monitoring
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            this.cleanupRemovedElements(element);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private startTextMonitoring(): void {
    console.log('📝 Content: Starting enhanced text monitoring...');
    // Find all existing text input elements
    this.scanForTextElements(document.body);
    
    // Periodic re-scan for dynamic content
    setInterval(() => {
      console.log('📝 Content: Periodic scan for new elements...');
      this.scanForTextElements(document.body);
    }, 10000); // Every 10 seconds
    
    // Additional event listeners for dynamic content  
    window.addEventListener('focus', () => {
      setTimeout(() => this.scanForTextElements(document.body), 200);
    }, true);
  }

  private scanForTextElements(container: HTMLElement): void {
    console.log('📝 Content: Scanning for text elements with enhanced selectors...');
    
    // Enhanced selectors for better website compatibility
    const selectors = [
      // Standard input types
      'input[type="text"]', 'input[type="email"]', 'input[type="search"]',
      'input[type="url"]', 'input[type="tel"]', 'input:not([type])',
      'textarea',
      
      // Contenteditable elements
      '[contenteditable="true"]', '[contenteditable=""]', '[contenteditable="plaintext-only"]',
      
      // Popular rich text editors
      '.ql-editor', // Quill
      '.fr-element', '.fr-view', // Froala
      '.note-editable', // Summernote
      '.DraftEditor-root .public-DraftEditor-content', // Draft.js
      '.ProseMirror', // ProseMirror
      '.ck-editor__editable', // CKEditor
      
      // Social media and messaging
      '[data-testid="tweetTextarea_0"]', // Twitter/X
      '[data-testid="tweet-text-one"]',
      '[role="textbox"]', // Generic ARIA textbox
      '[aria-multiline="true"]',
      
      // Generic fallbacks
      'div[spellcheck="true"]',
      '*[data-gramm="true"]', // Grammarly compatibility
      '*[data-enable-grammarly="true"]'
    ].join(', ');

    const textElements = container.querySelectorAll(selectors);
    console.log(`📝 Content: Found ${textElements.length} potential text elements`);

    textElements.forEach((element) => {
      if (this.isValidTextElement(element as HTMLElement)) {
        this.addElementToMonitoring(element as HTMLElement);
      }
    });
  }

  private isValidTextElement(element: HTMLElement): boolean {
    if (!element || this.monitoredElements.has(element)) {
      return false;
    }

    // Basic visibility check
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    // Size check
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return false;
    }

    // Check if editable
    if (element.tagName === 'INPUT') {
      const input = element as HTMLInputElement;
      if (input.readOnly || input.disabled) {
        return false;
      }
    }

    if (element.tagName === 'TEXTAREA') {
      const textarea = element as HTMLTextAreaElement;
      if (textarea.readOnly || textarea.disabled) {
        return false;
      }
    }

    if (element.hasAttribute('contenteditable')) {
      const isEditable = element.getAttribute('contenteditable');
      if (isEditable === 'false') {
        return false;
      }
    }

    return isTextInputElement(element);
  }

  private addElementToMonitoring(element: HTMLElement): void {
    if (!this.monitoredElements.has(element)) {
      const textElement: TextElement = {
        element,
        originalText: this.getElementText(element),
        suggestions: [],
        highlights: []
      };
      
      this.monitoredElements.set(element, textElement);
      console.log('📝 Content: Added element to monitoring:', element.tagName, element.className);
    }
  }

  private cleanupRemovedElements(container: HTMLElement): void {
    const toRemove: HTMLElement[] = [];
    
    this.monitoredElements.forEach((textElement, element) => {
      if (!document.contains(element) || !container.contains(element)) {
        toRemove.push(element);
      }
    });
    
    toRemove.forEach(element => {
      this.monitoredElements.delete(element);
    });
  }

  private async analyzeText(element: HTMLElement, text: string): Promise<void> {
    try {
      const sanitizedText = sanitizeText(text);
      
      if (sanitizedText.length < 10) {
        console.log('📝 Content: Text too short, skipping analysis:', sanitizedText.length, 'chars');
        return;
      }

      console.log('📝 Content: Starting analysis for text:', sanitizedText.substring(0, 50) + '...');
      console.log('📝 Content: Sending message to background script...');

      const response = await this.sendMessage({
        type: 'ANALYZE_TEXT',
        data: { text: sanitizedText },
        timestamp: Date.now()
      });

      if (response?.success) {
        console.log('📝 Content: Received response from background:', response);
        console.log('📝 Content: Processing analysis result:', response.data);
        this.processAnalysisResult(element, response.data);
      } else {
        console.error('📝 Content: Analysis failed:', response?.error || 'Unknown error');
        this.handleExtensionReload();
      }
    } catch (error: any) {
      console.error('📝 Content: Error during analysis:', error);
      
      if (error.message?.includes('Extension reloaded')) {
        this.showReloadNotification();
      } else {
        console.log('📝 Content: API might be unavailable, continuing...');
      }
    }
  }

  private handleExtensionReload(): void {
    console.warn('Extension seems to have been reloaded. Some features may not work until page refresh.');
  }

  private showReloadNotification(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = 'Writing Assistant extension was reloaded. Please refresh the page.';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  private processAnalysisResult(element: HTMLElement, result: any): void {
    console.log('📝 Content: processAnalysisResult called with:', result);
    
    const textElement = this.monitoredElements.get(element);
    if (!textElement) {
      console.log('📝 Content: No textElement found for element, creating new one');
      this.addElementToMonitoring(element);
    }

    // Clear existing highlights first
    console.log('📝 Content: Clearing existing highlights...');
    this.clearHighlights(element);

    // Process different types of suggestions
    console.log('📝 Content: Creating highlights for corrections...');
    
    const originalText = this.getElementText(element);
    const correctedText = result.corrected_text || result.suggestions?.[0]?.text || '';
    
    console.log('📝 Content: Original text:', originalText);
    console.log('📝 Content: Corrected text:', correctedText);

    this.createHighlights(element, result);
    
    // Update stored suggestions
    const updatedTextElement = this.monitoredElements.get(element);
    if (updatedTextElement) {
      updatedTextElement.suggestions = [{
        corrected_text: correctedText,
        suggestions: result.suggestions || [],
        confidence: 0.8,
        type: 'grammar' as SuggestionType
      }];
      console.log('📝 Content: Updated suggestions for element:', updatedTextElement.suggestions);
    }
  }

  private createHighlights(element: HTMLElement, result: any): void {
    console.log('📝 Content: createHighlights called for element:', element.tagName, element.className);
    console.log('📝 Content: Creating highlights with result:', result);
    
    // Add visual indicator class
    element.classList.add('writing-assistant-has-suggestions');
    console.log('📝 Content: Added class writing-assistant-has-suggestions to element');
    
    // Create and add indicator icon
    const existingIndicator = element.querySelector('.writing-assistant-indicator');
    if (!existingIndicator) {
      const indicator = document.createElement('div');
      indicator.className = 'writing-assistant-indicator';
      indicator.innerHTML = '✏️';
      indicator.title = 'Writing suggestions available - click to view';
      
      indicator.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        background: #4285f4;
        color: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      `;
      
      // Position relative to the input element
      if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
        element.style.position = 'relative';
        console.log('📝 Content: Set element position to relative');
      }
      
      element.appendChild(indicator);
      console.log('📝 Content: Indicator icon created and added to element');
      
      // Add click handler for the indicator
      indicator.addEventListener('click', (e) => {
        console.log('📝 Content: Indicator clicked, showing suggestions...');
        e.preventDefault();
        e.stopPropagation();
        this.showSuggestionsForElement(element, e);
      });
      
      console.log('📝 Content: ✅ Highlight creation completed successfully!');
    } else {
      console.log('📝 Content: Indicator already exists, updating...');
    }
  }

  private showSuggestionsForElement(element: HTMLElement, event: Event): void {
    const textElement = this.monitoredElements.get(element);
    if (!textElement || !textElement.suggestions.length) {
      console.log('📝 Content: No suggestions available for element');
      return;
    }

    const suggestion = textElement.suggestions[0];
    
    // Simple alert for now - can be enhanced later
    const accept = confirm(`Writing Suggestion:\n\n${suggestion.corrected_text}\n\nApply this suggestion?`);
    if (accept) {
      this.applySuggestionToElement(element, suggestion.corrected_text);
    }
  }

  private applySuggestionToElement(element: HTMLElement, text: string): void {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      (element as HTMLInputElement).value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (element.contentEditable === 'true') {
      element.textContent = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    this.clearHighlights(element);
  }

  private clearHighlights(element: HTMLElement): void {
    element.classList.remove('writing-assistant-has-suggestions');
    
    const indicator = element.querySelector('.writing-assistant-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  private clearAllHighlights(): void {
    this.monitoredElements.forEach((textElement, element) => {
      this.clearHighlights(element);
    });
  }

  private getElementText(element: HTMLElement): string {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return (element as HTMLInputElement).value;
    } else if (element.contentEditable === 'true') {
      return element.textContent || '';
    }
    return element.textContent || '';
  }

  private createTooltip(): void {
    if (!this.suggestionTooltip) {
      this.suggestionTooltip = document.createElement('div');
      this.suggestionTooltip.className = 'writing-assistant-tooltip';
      this.suggestionTooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
      `;
      document.body.appendChild(this.suggestionTooltip);
    }
  }

  private showTooltipForHighlight(element: HTMLElement, event: MouseEvent): void {
    if (!this.suggestionTooltip) return;

    const textElement = this.monitoredElements.get(element);
    if (!textElement || !textElement.suggestions.length) return;

    const suggestion = textElement.suggestions[0];
    this.suggestionTooltip.textContent = `Writing suggestions available (${suggestion.type})`;
    this.suggestionTooltip.style.opacity = '1';
    this.suggestionTooltip.style.left = event.pageX + 10 + 'px';
    this.suggestionTooltip.style.top = event.pageY - 30 + 'px';
  }

  private hideTooltip(): void {
    if (this.suggestionTooltip) {
      this.suggestionTooltip.style.opacity = '0';
    }
  }

  private applySuggestion(suggestionElement: HTMLElement): void {
    const suggestion = suggestionElement.dataset.suggestion;
    if (!suggestion) return;

    const textInput = document.querySelector(`[data-suggestion-target="${suggestionElement.dataset.target}"]`) as HTMLElement;
    if (!textInput) return;

    if (textInput.tagName === 'INPUT' || textInput.tagName === 'TEXTAREA') {
      (textInput as HTMLInputElement).value = suggestion;
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      textInput.textContent = suggestion;
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    this.clearHighlights(textInput);
  }

  private handleAnalyzeSelection(text: string): void {
    console.log('Analyzing selection:', text);
    // This would handle text analysis from popup/context menu
  }

  private async sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 60000); // 60 second timeout for slow LLM responses

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            if (chrome.runtime.lastError.message?.includes('receiving end does not exist')) {
              reject(chrome.runtime.lastError);
            } else {
              reject(chrome.runtime.lastError);
            }
          } else {
            resolve(response);
          }
        });
      } catch (error: any) {
        clearTimeout(timeout);
        // Handle cases where chrome.runtime is unavailable
        if (error.message?.includes('Extension context invalidated')) {
          console.warn('Extension context invalidated - this is normal after extension reload');
          reject(new Error('Extension reloaded'));
        } else {
          reject(error);
        }
      }
    });
  }
}

// Enhanced initialization for different loading scenarios
let contentManager: ContentScriptManager | null = null;

function initializeContentScript(): void {
  if (contentManager) {
    console.log('📝 Content: Already initialized, skipping...');
    return;
  }
  
  try {
    console.log('📝 Content: Initializing enhanced writing assistant...');
    contentManager = new ContentScriptManager();
  } catch (error) {
    console.error('📝 Content: Error during initialization:', error);
    setTimeout(() => {
      if (!contentManager) {
        console.log('📝 Content: Retrying initialization...');
        try {
          contentManager = new ContentScriptManager();
        } catch (retryError) {
          console.error('📝 Content: Retry failed:', retryError);
        }
      }
    }, 2000);
  }
}

// Multi-stage initialization for SPA compatibility
console.log('📝 Content: Starting multi-stage initialization...');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Additional initialization for late-loading content
window.addEventListener('load', () => {
  setTimeout(initializeContentScript, 1000);
});

setTimeout(initializeContentScript, 2000);
setTimeout(initializeContentScript, 5000);

// Handle SPA navigation
let currentUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    console.log('📝 Content: URL change detected, re-scanning elements...');
    setTimeout(() => {
      if (contentManager) {
        (contentManager as any).scanForTextElements(document.body);
      }
    }, 1500);
  }
}, 1000);