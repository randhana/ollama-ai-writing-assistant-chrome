import './options.css';
import { ExtensionSettings, WritingTone, SuggestionFrequency } from '../types';
import { StorageManager, Logger } from '../utils/storage';
import { validateApiUrl } from '../utils/storage';

class OptionsManager {
  private settings: ExtensionSettings | null = null;
  private hasUnsavedChanges = false;
  
  // DOM elements
  private elements: { [key: string]: HTMLElement } = {};

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.bindDOMElements();
    this.setupEventListeners();
    await this.loadSettings();
    await this.loadDataInfo();
    this.updateUI();
    this.checkApiConnection();
  }

  private bindDOMElements(): void {
    const elementIds = [
      'apiUrl', 'testConnection', 'connectionIndicator', 'connectionText',
      'defaultTone', 'suggestionFrequency', 'debounceTime', 'debounceValue',
      'enableRealTime', 'enableAutoComplete', 'extensionEnabled',
      'clearCache', 'viewLogs', 'clearLogs', 'cacheInfo', 'logsInfo',
      'extensionStatus', 'apiStatus', 'exportSettings', 'importSettings', 
      'resetSettings', 'saveSettings', 'cancelChanges', 'saveStatus',
      'logsModal', 'closeLogsModal', 'logsContent', 'importFile'
    ];

    elementIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[id] = element;
      }
    });
  }

  private setupEventListeners(): void {
    // API Configuration
    (this.elements.apiUrl as HTMLInputElement).addEventListener('input', this.handleApiUrlChange.bind(this));
    this.elements.testConnection.addEventListener('click', this.testApiConnection.bind(this));

    // Writing preferences
    (this.elements.defaultTone as HTMLSelectElement).addEventListener('change', this.handleToneChange.bind(this));
    (this.elements.suggestionFrequency as HTMLSelectElement).addEventListener('change', this.handleFrequencyChange.bind(this));
    (this.elements.debounceTime as HTMLInputElement).addEventListener('input', this.handleDebounceChange.bind(this));

    // Feature toggles
    (this.elements.enableRealTime as HTMLInputElement).addEventListener('change', this.handleRealTimeToggle.bind(this));
    (this.elements.enableAutoComplete as HTMLInputElement).addEventListener('change', this.handleAutoCompleteToggle.bind(this));
    (this.elements.extensionEnabled as HTMLInputElement).addEventListener('change', this.handleExtensionToggle.bind(this));

    // Data management
    this.elements.clearCache.addEventListener('click', this.clearCache.bind(this));
    this.elements.viewLogs.addEventListener('click', this.viewLogs.bind(this));
    this.elements.clearLogs.addEventListener('click', this.clearLogs.bind(this));

    // Quick actions
    this.elements.exportSettings.addEventListener('click', this.exportSettings.bind(this));
    this.elements.importSettings.addEventListener('click', this.importSettings.bind(this));
    this.elements.resetSettings.addEventListener('click', this.resetSettings.bind(this));

    // Save actions
    this.elements.saveSettings.addEventListener('click', this.saveAllSettings.bind(this));
    this.elements.cancelChanges.addEventListener('click', this.cancelChanges.bind(this));

    // Modal
    this.elements.closeLogsModal.addEventListener('click', this.closeLogs.bind(this));
    (this.elements.importFile as HTMLInputElement).addEventListener('change', this.handleFileImport.bind(this));

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Auto-save on change
    document.addEventListener('input', this.markUnsavedChanges.bind(this));
    document.addEventListener('change', this.markUnsavedChanges.bind(this));
  }

  private async loadSettings(): Promise<void> {
    try {
      this.settings = await StorageManager.getSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showNotification('Failed to load settings', 'error');
    }
  }

  private updateUI(): void {
    if (!this.settings) return;

    // API Configuration
    (this.elements.apiUrl as HTMLInputElement).value = this.settings.apiUrl;

    // Writing preferences
    (this.elements.defaultTone as HTMLSelectElement).value = this.settings.selectedTone;
    (this.elements.suggestionFrequency as HTMLSelectElement).value = this.settings.suggestionFrequency;
    (this.elements.debounceTime as HTMLInputElement).value = this.settings.debounceMs.toString();
    this.elements.debounceValue.textContent = `${this.settings.debounceMs}ms`;

    // Feature toggles
    (this.elements.enableRealTime as HTMLInputElement).checked = this.settings.enableRealTime;
    (this.elements.enableAutoComplete as HTMLInputElement).checked = this.settings.enableAutoComplete;
    (this.elements.extensionEnabled as HTMLInputElement).checked = this.settings.isEnabled;

    // Status
    this.elements.extensionStatus.textContent = this.settings.isEnabled ? 'Active' : 'Inactive';
    this.elements.extensionStatus.className = this.settings.isEnabled ? 'font-medium status-active' : 'font-medium status-inactive';
  }

  private async loadDataInfo(): Promise<void> {
    try {
      // Get cache info
      const result = await chrome.storage.local.get('writing-assistant-cache');
      const cache = result['writing-assistant-cache'] || {};
      const cacheSize = Object.keys(cache).length;
      this.elements.cacheInfo.textContent = `${cacheSize} cached suggestions`;

      // Get logs info
      const logs = await Logger.getLogs();
      this.elements.logsInfo.textContent = `${logs.length} error entries`;
    } catch (error) {
      console.error('Failed to load data info:', error);
      this.elements.cacheInfo.textContent = 'Unable to load cache info';
      this.elements.logsInfo.textContent = 'Unable to load logs info';
    }
  }

  private handleApiUrlChange(): void {
    const url = (this.elements.apiUrl as HTMLInputElement).value;
    
    if (url && !validateApiUrl(url)) {
      this.elements.apiUrl.classList.add('input-error');
    } else {
      this.elements.apiUrl.classList.remove('input-error');
    }
    
    this.markUnsavedChanges();
  }

  private async testApiConnection(): Promise<void> {
    const url = (this.elements.apiUrl as HTMLInputElement).value;
    
    if (!validateApiUrl(url)) {
      this.setConnectionStatus('disconnected', 'Invalid URL format');
      return;
    }

    this.setConnectionStatus('testing', 'Testing connection...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.setConnectionStatus('connected', 'Connection successful');
        this.elements.apiStatus.textContent = 'Connected';
        this.elements.apiStatus.className = 'font-medium status-active';
      } else {
        this.setConnectionStatus('disconnected', `Failed (${response.status})`);
        this.elements.apiStatus.textContent = 'Disconnected';
        this.elements.apiStatus.className = 'font-medium status-inactive';
      }
    } catch (error) {
      this.setConnectionStatus('disconnected', 'Connection failed');
      this.elements.apiStatus.textContent = 'Error';
      this.elements.apiStatus.className = 'font-medium status-inactive';
    }
  }

  private async checkApiConnection(): Promise<void> {
    if (this.settings?.apiUrl) {
      // Auto-test connection on load
      setTimeout(() => this.testApiConnection(), 1000);
    }
  }

  private setConnectionStatus(status: 'connected' | 'disconnected' | 'testing', text: string): void {
    this.elements.connectionIndicator.className = `w-2 h-2 rounded-full mr-2 connection-${status}`;
    this.elements.connectionText.textContent = text;
  }

  private handleToneChange(): void {
    this.markUnsavedChanges();
  }

  private handleFrequencyChange(): void {
    this.markUnsavedChanges();
  }

  private handleDebounceChange(): void {
    const value = (this.elements.debounceTime as HTMLInputElement).value;
    this.elements.debounceValue.textContent = `${value}ms`;
    this.markUnsavedChanges();
  }

  private handleRealTimeToggle(): void {
    this.markUnsavedChanges();
  }

  private handleAutoCompleteToggle(): void {
    this.markUnsavedChanges();
  }

  private handleExtensionToggle(): void {
    const enabled = (this.elements.extensionEnabled as HTMLInputElement).checked;
    this.elements.extensionStatus.textContent = enabled ? 'Active' : 'Inactive';
    this.elements.extensionStatus.className = enabled ? 'font-medium status-active' : 'font-medium status-inactive';
    this.markUnsavedChanges();
  }

  private async clearCache(): Promise<void> {
    try {
      await StorageManager.clearCache();
      this.elements.cacheInfo.textContent = '0 cached suggestions';
      this.showNotification('Cache cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      this.showNotification('Failed to clear cache', 'error');
    }
  }

  private async viewLogs(): Promise<void> {
    try {
      const logs = await Logger.getLogs();
      
      if (logs.length === 0) {
        this.elements.logsContent.textContent = 'No error logs found.';
      } else {
        this.elements.logsContent.textContent = JSON.stringify(logs, null, 2);
      }
      
      this.elements.logsModal.classList.remove('hidden');
      this.elements.logsModal.classList.add('fade-in');
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.showNotification('Failed to load logs', 'error');
    }
  }

  private closeLogs(): void {
    this.elements.logsModal.classList.add('hidden');
    this.elements.logsModal.classList.remove('fade-in');
  }

  private async clearLogs(): Promise<void> {
    try {
      await Logger.clearLogs();
      this.elements.logsInfo.textContent = '0 error entries';
      this.showNotification('Logs cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear logs:', error);
      this.showNotification('Failed to clear logs', 'error');
    }
  }

  private async exportSettings(): Promise<void> {
    try {
      const settings = await StorageManager.getSettings();
      const dataStr = JSON.stringify(settings, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `writing-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      this.showNotification('Settings exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export settings:', error);
      this.showNotification('Failed to export settings', 'error');
    }
  }

  private importSettings(): void {
    (this.elements.importFile as HTMLInputElement).click();
  }

  private async handleFileImport(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text);
      
      // Validate imported settings
      if (typeof importedSettings !== 'object' || !importedSettings) {
        throw new Error('Invalid settings format');
      }
      
      await StorageManager.saveSettings(importedSettings);
      await this.loadSettings();
      this.updateUI();
      
      this.showNotification('Settings imported successfully', 'success');
    } catch (error) {
      console.error('Failed to import settings:', error);
      this.showNotification('Failed to import settings. Please check the file format.', 'error');
    }
    
    // Clear the file input
    (this.elements.importFile as HTMLInputElement).value = '';
  }

  private async resetSettings(): Promise<void> {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      // Clear all settings to trigger defaults
      await chrome.storage.local.remove('writing-assistant-settings');
      await this.loadSettings();
      this.updateUI();
      this.hasUnsavedChanges = false;
      this.updateSaveStatus();
      
      this.showNotification('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.showNotification('Failed to reset settings', 'error');
    }
  }

  private async saveAllSettings(): Promise<void> {
    try {
      this.setSaveStatus('saving', 'Saving changes...');
      
      const updatedSettings: Partial<ExtensionSettings> = {
        apiUrl: (this.elements.apiUrl as HTMLInputElement).value,
        selectedTone: (this.elements.defaultTone as HTMLSelectElement).value as WritingTone,
        suggestionFrequency: (this.elements.suggestionFrequency as HTMLSelectElement).value as SuggestionFrequency,
        debounceMs: parseInt((this.elements.debounceTime as HTMLInputElement).value),
        enableRealTime: (this.elements.enableRealTime as HTMLInputElement).checked,
        enableAutoComplete: (this.elements.enableAutoComplete as HTMLInputElement).checked,
        isEnabled: (this.elements.extensionEnabled as HTMLInputElement).checked
      };

      await StorageManager.saveSettings(updatedSettings);
      this.settings = { ...this.settings!, ...updatedSettings };
      
      this.hasUnsavedChanges = false;
      this.setSaveStatus('success', 'All changes saved');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        this.setSaveStatus('', 'All changes saved automatically');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.setSaveStatus('error', 'Failed to save changes');
      this.showNotification('Failed to save settings', 'error');
    }
  }

  private async cancelChanges(): Promise<void> {
    await this.loadSettings();
    this.updateUI();
    this.hasUnsavedChanges = false;
    this.updateSaveStatus();
    this.showNotification('Changes cancelled', 'info');
  }

  private markUnsavedChanges(): void {
    this.hasUnsavedChanges = true;
    this.updateSaveStatus();
  }

  private updateSaveStatus(): void {
    if (this.hasUnsavedChanges) {
      this.setSaveStatus('', 'You have unsaved changes');
    } else {
      this.setSaveStatus('', 'All changes saved automatically');
    }
  }

  private setSaveStatus(type: string, message: string): void {
    this.elements.saveStatus.textContent = message;
    this.elements.saveStatus.className = `text-sm text-gray-600 save-status-${type}`;
  }

  private handleKeyboard(event: KeyboardEvent): void {
    // Ctrl+S or Cmd+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.hasUnsavedChanges) {
        this.saveAllSettings();
      }
    }
    
    // Escape to close modals
    if (event.key === 'Escape') {
      if (!this.elements.logsModal.classList.contains('hidden')) {
        this.closeLogs();
      }
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.innerHTML = `
      <div class="flex items-center">
        <span class="flex-1">${message}</span>
        <button class="ml-3 text-gray-400 hover:text-gray-600">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
    
    // Manual close
    notification.querySelector('button')?.addEventListener('click', () => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }
}

// Initialize options manager when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new OptionsManager());
} else {
  new OptionsManager();
}