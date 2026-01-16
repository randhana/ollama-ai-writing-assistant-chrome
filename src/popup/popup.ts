import './popup.css';
import { ExtensionSettings, PopupMessage, WritingTone } from '../types';

class PopupManager {
  private settings: ExtensionSettings | null = null;
  
  // DOM elements
  private enableToggle!: HTMLInputElement;
  private textInput!: HTMLTextAreaElement;
  private charCount!: HTMLSpanElement;
  private analyzeBtn!: HTMLButtonElement;
  private toneSelect!: HTMLSelectElement;
  private loadingState!: HTMLElement;
  private resultsArea!: HTMLElement;
  private errorState!: HTMLElement;
  private statusIndicator!: HTMLElement;
  private statusText!: HTMLElement;
  private settingsBtn!: HTMLButtonElement;
  private openOptionsBtn!: HTMLButtonElement;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.bindDOMElements();
    this.setupEventListeners();
    await this.loadSettings();
    this.updateUI();
    await this.checkConnectionStatus();
  }

  private bindDOMElements(): void {
    this.enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
    this.textInput = document.getElementById('textInput') as HTMLTextAreaElement;
    this.charCount = document.getElementById('charCount') as HTMLSpanElement;
    this.analyzeBtn = document.getElementById('analyzeBtn') as HTMLButtonElement;
    this.toneSelect = document.getElementById('toneSelect') as HTMLSelectElement;
    this.loadingState = document.getElementById('loadingState')!;
    this.resultsArea = document.getElementById('resultsArea')!;
    this.errorState = document.getElementById('errorState')!;
    this.statusIndicator = document.getElementById('statusIndicator')!;
    this.statusText = document.getElementById('statusText')!;
    this.settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
    this.openOptionsBtn = document.getElementById('openOptions') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    // Enable/disable toggle
    this.enableToggle.addEventListener('change', this.handleToggleChange.bind(this));
    
    // Text input
    this.textInput.addEventListener('input', this.handleTextInput.bind(this));
    this.textInput.addEventListener('paste', this.handleTextPaste.bind(this));
    
    // Analyze button
    this.analyzeBtn.addEventListener('click', this.handleAnalyze.bind(this));
    
    // Tone selection
    this.toneSelect.addEventListener('change', this.handleToneChange.bind(this));
    
    // Copy buttons
    document.getElementById('copyCorrected')?.addEventListener('click', () => {
      this.copyToClipboard('correctedContent');
    });
    
    document.getElementById('copyParaphrased')?.addEventListener('click', () => {
      this.copyToClipboard('paraphrasedContent');
    });
    
    // Settings and options
    this.settingsBtn.addEventListener('click', this.handleSettingsClick.bind(this));
    this.openOptionsBtn.addEventListener('click', this.handleOpenOptions.bind(this));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
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
        console.log('Settings loaded:', this.settings);
      } else {
        // Use default settings if loading fails
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
        console.warn('Using default settings');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use default settings as fallback
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
    }
  }

  private async saveSettings(updatedSettings: Partial<ExtensionSettings>): Promise<void> {
    try {
      const response = await this.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: { settings: updatedSettings },
        timestamp: Date.now()
      });

      if (response?.success) {
        this.settings = { ...this.settings!, ...updatedSettings };
        this.updateUI();
      } else {
        this.showError('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showError('Failed to save settings');
    }
  }

  private updateUI(): void {
    if (!this.settings) return;

    // Update toggle state
    this.enableToggle.checked = this.settings.isEnabled;
    
    // Update tone selection
    this.toneSelect.value = this.settings.selectedTone;
    
    // Update character count
    this.updateCharCount();
    
    // Update analyze button state
    this.updateAnalyzeButton();
  }

  private updateCharCount(): void {
    const length = this.textInput.value.length;
    const maxLength = 500;
    this.charCount.textContent = `${length}/${maxLength} characters`;
    
    if (length > maxLength * 0.9) {
      this.charCount.classList.add('text-red-500');
    } else {
      this.charCount.classList.remove('text-red-500');
    }
  }

  private updateAnalyzeButton(): void {
    const text = this.textInput.value.trim();
    const isEnabled = text.length >= 10 && this.settings?.isEnabled;
    
    this.analyzeBtn.disabled = !isEnabled;
    
    if (!isEnabled) {
      this.analyzeBtn.textContent = text.length < 10 ? 'Min 10 chars' : 'Disabled';
    } else {
      this.analyzeBtn.textContent = 'Analyze';
    }
  }

  private async checkConnectionStatus(): Promise<void> {
    this.setStatus('loading', 'Checking connection...');
    
    try {
      // Ensure we have settings loaded
      if (!this.settings) {
        await this.loadSettings();
      }
      
      if (!this.settings?.apiUrl) {
        this.setStatus('disconnected', 'API not configured');
        return;
      }

      const response = await fetch(`${this.settings.apiUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        this.setStatus('connected', 'Connected to Ollama');
      } else {
        this.setStatus('disconnected', `Connection failed (${response.status})`);
      }
    } catch (error) {
      this.setStatus('disconnected', 'Connection failed');
      console.error('Connection check failed:', error);
    }
  }

  private setStatus(status: 'connected' | 'disconnected' | 'loading', text: string): void {
    this.statusIndicator.className = `w-2 h-2 rounded-full mr-2 status-${status}`;
    this.statusText.textContent = text;
  }

  private handleToggleChange(): void {
    if (this.settings) {
      this.saveSettings({ isEnabled: this.enableToggle.checked });
    }
  }

  private handleTextInput(): void {
    this.updateCharCount();
    this.updateAnalyzeButton();
    this.hideResults();
  }

  private handleTextPaste(): void {
    // Use setTimeout to handle paste event after text is inserted
    setTimeout(() => {
      this.updateCharCount();
      this.updateAnalyzeButton();
      this.hideResults();
    }, 10);
  }

  private async handleAnalyze(): Promise<void> {
    const text = this.textInput.value.trim();
    
    if (text.length < 10) {
      this.showError('Please enter at least 10 characters');
      return;
    }

    this.showLoading();
    
    try {
      console.log('Sending message to background script...');
      
      const response = await this.sendMessage({
        type: 'ANALYZE_POPUP_TEXT',
        data: { 
          text, 
          settings: this.settings 
        },
        timestamp: Date.now()
      });

      console.log('Background response:', response);

      if (response?.success) {
        this.showResults(response.data);
      } else {
        this.showError(response?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Popup analysis error:', error);
      this.showError(`Analysis failed: ${error.message || error}`);
    }
  }

  private handleToneChange(): void {
    if (this.settings) {
      this.saveSettings({ selectedTone: this.toneSelect.value as WritingTone });
    }
  }

  private handleKeyboard(event: KeyboardEvent): void {
    // Ctrl+Enter or Cmd+Enter to analyze
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      if (!this.analyzeBtn.disabled) {
        this.handleAnalyze();
      }
    }
    
    // Escape to close results
    if (event.key === 'Escape') {
      this.hideResults();
    }
  }

  private handleSettingsClick(): void {
    // Open options page in a new tab
    chrome.runtime.openOptionsPage();
  }

  private handleOpenOptions(): void {
    chrome.runtime.openOptionsPage();
  }

  private showLoading(): void {
    this.hideError();
    this.hideResults();
    this.loadingState.classList.remove('hidden');
    this.loadingState.classList.add('fade-in');
  }

  private hideLoading(): void {
    this.loadingState.classList.add('hidden');
    this.loadingState.classList.remove('fade-in');
  }

  private showResults(data: any): void {
    this.hideLoading();
    this.hideError();
    
    // Update corrected text
    const correctedContent = document.getElementById('correctedContent')!;
    correctedContent.textContent = data.corrected_text || 'No corrections needed';
    
    // Update paraphrased text
    const paraphrasedContent = document.getElementById('paraphrasedContent')!;
    const paraphrasedSection = document.getElementById('paraphrasedText')!;
    
    if (data.paraphrased_text && data.paraphrased_text !== data.corrected_text) {
      paraphrasedContent.textContent = data.paraphrased_text;
      paraphrasedSection.classList.remove('hidden');
    } else {
      paraphrasedSection.classList.add('hidden');
    }
    
    // Update suggestions
    const suggestionsList = document.getElementById('suggestionsList')!;
    suggestionsList.innerHTML = '';
    
    if (data.suggestions && data.suggestions.length > 0) {
      data.suggestions.forEach((suggestion: string) => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.textContent = suggestion;
        suggestionsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.textContent = 'Your text looks good!';
      suggestionsList.appendChild(li);
    }
    
    this.resultsArea.classList.remove('hidden');
    this.resultsArea.classList.add('fade-in');
  }

  private hideResults(): void {
    this.resultsArea.classList.add('hidden');
    this.resultsArea.classList.remove('fade-in');
  }

  private showError(message: string): void {
    this.hideLoading();
    this.hideResults();
    
    const errorMessage = document.getElementById('errorMessage')!;
    errorMessage.textContent = message;
    
    this.errorState.classList.remove('hidden');
    this.errorState.classList.add('fade-in');
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  private hideError(): void {
    this.errorState.classList.add('hidden');
    this.errorState.classList.remove('fade-in');
  }

  private async copyToClipboard(elementId: string): Promise<void> {
    try {
      const element = document.getElementById(elementId)!;
      const text = element.textContent || '';
      
      await navigator.clipboard.writeText(text);
      
      // Visual feedback
      element.classList.add('copy-success');
      setTimeout(() => {
        element.classList.remove('copy-success');
      }, 500);
      
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('Failed to copy to clipboard');
    }
  }

  private async sendMessage(message: PopupMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PopupManager());
} else {
  new PopupManager();
}