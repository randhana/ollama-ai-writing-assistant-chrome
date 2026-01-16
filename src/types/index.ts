export interface ExtensionSettings {
  isEnabled: boolean;
  apiKey: string;
  apiUrl: string;
  selectedTone: WritingTone;
  suggestionFrequency: SuggestionFrequency;
  enableRealTime: boolean;
  enableAutoComplete: boolean;
  debounceMs: number;
}

export interface WritingSuggestion {
  corrected_text: string;
  paraphrased_text?: string;
  suggestions: string[];
  confidence?: number;
  type: SuggestionType;
}

export interface OllamaResponse {
  corrected_text: string;
  paraphrased_text: string;
  suggestions: string[];
}

export interface TextElement {
  element: HTMLElement;
  originalText: string;
  suggestions: WritingSuggestion[];
  highlights: HighlightRange[];
}

export interface HighlightRange {
  start: number;
  end: number;
  type: SuggestionType;
  suggestion: string;
}

export interface ApiError {
  message: string;
  code: string;
  timestamp: number;
}

export type WritingTone = 'professional' | 'casual' | 'friendly' | 'persuasive' | 'academic';

export type SuggestionType = 'grammar' | 'spelling' | 'style' | 'clarity' | 'tone' | 'conciseness';

export type SuggestionFrequency = 'high' | 'medium' | 'low';

export interface MessagePayload {
  type: string;
  data?: any;
  timestamp: number;
}

export interface ContentMessage extends MessagePayload {
  type: 'ANALYZE_TEXT' | 'GET_SUGGESTIONS' | 'APPLY_SUGGESTION' | 'CLEAR_HIGHLIGHTS' | 'GET_SETTINGS';
  data: {
    text?: string;
    element?: string;
    suggestion?: WritingSuggestion;
  };
}

export interface BackgroundMessage extends MessagePayload {
  type: 'API_REQUEST' | 'SETTINGS_UPDATE' | 'ERROR_LOG';
  data: {
    text?: string;
    tone?: WritingTone;
    settings?: Partial<ExtensionSettings>;
    error?: ApiError;
  };
}

export interface PopupMessage extends MessagePayload {
  type: 'GET_SETTINGS' | 'UPDATE_SETTINGS' | 'ANALYZE_POPUP_TEXT';
  data: {
    settings?: Partial<ExtensionSettings>;
    text?: string;
  };
}