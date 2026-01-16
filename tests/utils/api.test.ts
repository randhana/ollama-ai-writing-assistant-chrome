import { OllamaApiClient } from '../../src/utils/api';

// Mock StorageManager
jest.mock('../../src/utils/storage', () => ({
  StorageManager: {
    getSettings: jest.fn(),
    getCachedSuggestion: jest.fn(),
    setCachedSuggestion: jest.fn()
  },
  Logger: {
    logError: jest.fn()
  }
}));

import { StorageManager, Logger } from '../../src/utils/storage';

describe('OllamaApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('analyzText', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        corrected_text: 'Cached result',
        paraphrased_text: 'Cached paraphrase',
        suggestions: ['cached tip']
      };
      
      (StorageManager.getCachedSuggestion as jest.Mock).mockResolvedValue(cachedResult);
      
      const result = await OllamaApiClient.analyzText('test text');
      
      expect(result).toEqual(cachedResult);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should make API request when no cache available', async () => {
      (StorageManager.getCachedSuggestion as jest.Mock).mockResolvedValue(null);
      (StorageManager.getSettings as jest.Mock).mockResolvedValue({
        apiUrl: 'http://localhost:11434'
      });
      
      const apiResponse = {
        response: JSON.stringify({
          corrected_text: 'API result',
          paraphrased_text: 'API paraphrase',
          suggestions: ['api tip']
        })
      };
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      });
      
      const result = await OllamaApiClient.analyzText('test text', 'professional');
      
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test text')
        })
      );
      
      expect(result).toEqual({
        corrected_text: 'API result',
        paraphrased_text: 'API paraphrase',
        suggestions: ['api tip']
      });
      
      expect(StorageManager.setCachedSuggestion).toHaveBeenCalledWith('test text', result);
    });

    it('should handle API errors gracefully', async () => {
      (StorageManager.getCachedSuggestion as jest.Mock).mockResolvedValue(null);
      (StorageManager.getSettings as jest.Mock).mockResolvedValue({
        apiUrl: 'http://localhost:11434'
      });
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      
      await expect(OllamaApiClient.analyzText('test text')).rejects.toThrow();
      expect(Logger.logError).toHaveBeenCalled();
    });

    it('should handle malformed JSON responses', async () => {
      (StorageManager.getCachedSuggestion as jest.Mock).mockResolvedValue(null);
      (StorageManager.getSettings as jest.Mock).mockResolvedValue({
        apiUrl: 'http://localhost:11434'
      });
      
      const apiResponse = {
        response: 'This is not valid JSON'
      };
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse)
      });
      
      const result = await OllamaApiClient.analyzText('test text');
      
      expect(result).toEqual({
        corrected_text: '',
        paraphrased_text: '',
        suggestions: ['Unable to process text at this time']
      });
    });

    it('should throw error when API URL is not configured', async () => {
      (StorageManager.getCachedSuggestion as jest.Mock).mockResolvedValue(null);
      (StorageManager.getSettings as jest.Mock).mockResolvedValue({
        apiUrl: ''
      });
      
      await expect(OllamaApiClient.analyzText('test text')).rejects.toThrow('API URL not configured');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true
      });
      
      const result = await OllamaApiClient.testConnection('http://localhost:11434');
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return false for failed connection', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const result = await OllamaApiClient.testConnection('http://localhost:11434');
      
      expect(result).toBe(false);
    });

    it('should return false for non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const result = await OllamaApiClient.testConnection('http://localhost:11434');
      
      expect(result).toBe(false);
    });
  });
});