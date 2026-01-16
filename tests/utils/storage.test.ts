import { StorageManager } from '../../src/utils/storage';
import { ExtensionSettings } from '../../src/types';

describe('StorageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should return default settings when storage is empty', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
      
      const settings = await StorageManager.getSettings();
      
      expect(settings).toEqual({
        isEnabled: true,
        apiKey: '',
        apiUrl: 'http://localhost:11434',
        selectedTone: 'professional',
        suggestionFrequency: 'medium',
        enableRealTime: true,
        enableAutoComplete: true,
        debounceMs: 1500
      });
    });

    it('should merge stored settings with defaults', async () => {
      const storedSettings = {
        isEnabled: false,
        selectedTone: 'casual'
      };
      
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        'writing-assistant-settings': storedSettings
      });
      
      const settings = await StorageManager.getSettings();
      
      expect(settings.isEnabled).toBe(false);
      expect(settings.selectedTone).toBe('casual');
      expect(settings.apiUrl).toBe('http://localhost:11434'); // default value
    });

    it('should handle storage errors gracefully', async () => {
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(new Error('Storage error'));
      
      const settings = await StorageManager.getSettings();
      
      expect(settings).toEqual({
        isEnabled: true,
        apiKey: '',
        apiUrl: 'http://localhost:11434',
        selectedTone: 'professional',
        suggestionFrequency: 'medium',
        enableRealTime: true,
        enableAutoComplete: true,
        debounceMs: 1500
      });
    });
  });

  describe('saveSettings', () => {
    it('should merge new settings with existing ones', async () => {
      const existingSettings: ExtensionSettings = {
        isEnabled: true,
        apiKey: '',
        apiUrl: 'http://localhost:11434',
        selectedTone: 'professional',
        suggestionFrequency: 'medium',
        enableRealTime: true,
        enableAutoComplete: true,
        debounceMs: 1500
      };
      
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        'writing-assistant-settings': existingSettings
      });
      
      const newSettings = {
        selectedTone: 'casual' as const,
        debounceMs: 2000
      };
      
      await StorageManager.saveSettings(newSettings);
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'writing-assistant-settings': {
          ...existingSettings,
          ...newSettings
        }
      });
    });

    it('should handle save errors', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
      (chrome.storage.local.set as jest.Mock).mockRejectedValue(new Error('Save error'));
      
      await expect(StorageManager.saveSettings({ isEnabled: false }))
        .rejects.toThrow('Failed to save settings');
    });
  });

  describe('cache operations', () => {
    it('should cache and retrieve suggestions', async () => {
      const suggestion = {
        corrected_text: 'Test corrected text',
        paraphrased_text: 'Test paraphrased',
        suggestions: ['tip1', 'tip2']
      };
      
      (chrome.storage.local.get as jest.Mock)
        .mockResolvedValueOnce({}) // First call for setCachedSuggestion
        .mockResolvedValueOnce({ 'writing-assistant-cache': { '123': suggestion } }); // Second call for getCachedSuggestion
      
      await StorageManager.setCachedSuggestion('test text', suggestion);
      const cached = await StorageManager.getCachedSuggestion('test text');
      
      expect(cached).toEqual(suggestion);
    });

    it('should clear cache', async () => {
      await StorageManager.clearCache();
      
      expect(chrome.storage.local.remove).toHaveBeenCalledWith('writing-assistant-cache');
    });
  });
});