# Example Configuration for AI Writing Assistant

This document provides example configurations and test cases for the AI Writing Assistant Chrome Extension.

## API Configuration Examples

### Local Ollama Setup (Default)
```json
{
  "apiUrl": "http://localhost:11434",
  "testEndpoint": "/api/tags"
}
```

### Custom Ollama Port
```json
{
  "apiUrl": "http://localhost:8080",
  "testEndpoint": "/api/tags"
}
```

### Remote Ollama Instance
```json
{
  "apiUrl": "http://192.168.1.100:11434",
  "testEndpoint": "/api/tags"
}
```

## Prompt Templates

### Default Professional Prompt
```javascript
const prompt = `You are a professional writing assistant. Analyze the following text and provide:
1. Corrected grammar and spelling.
2. Improved style and clarity.
3. Optional paraphrased version in the same tone.

Input Text: "${text}"
Tone Preference: "professional"

Please respond with ONLY a valid JSON object in this exact format:
{
  "corrected_text": "...",
  "paraphrased_text": "...", 
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;
```

### Casual Tone Prompt
```javascript
const prompt = `You are a friendly writing assistant. Analyze the following text and provide:
1. Corrected grammar and spelling while keeping the casual tone.
2. Improved readability and flow.
3. Optional paraphrased version that sounds natural and conversational.

Input Text: "${text}"
Tone Preference: "casual"

Please respond with ONLY a valid JSON object in this exact format:
{
  "corrected_text": "...",
  "paraphrased_text": "...", 
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}`;
```

## Test Cases

### Grammar Correction Examples

#### Test Case 1: Basic Grammar Errors
```javascript
const testInput = "I are going to the store tommorow.";
const expectedOutput = {
  "corrected_text": "I am going to the store tomorrow.",
  "paraphrased_text": "I will be heading to the store tomorrow.",
  "suggestions": [
    "Use 'am' instead of 'are' for first person singular",
    "Correct spelling: 'tomorrow' not 'tommorow'",
    "Consider using future tense for planned actions"
  ]
};
```

#### Test Case 2: Complex Sentence Structure
```javascript
const testInput = "The meeting which was scheduled for yesterday, it got postponed because of the weather conditions that was bad.";
const expectedOutput = {
  "corrected_text": "The meeting scheduled for yesterday was postponed due to poor weather conditions.",
  "paraphrased_text": "Yesterday's meeting was postponed because of bad weather.",
  "suggestions": [
    "Remove redundant pronouns and simplify sentence structure",
    "Use 'due to' instead of 'because of' for more formal tone",
    "Combine related clauses to improve flow"
  ]
};
```

### Tone Adjustment Examples

#### Test Case 3: Professional Tone
```javascript
const testInput = "Hey, can you help me with this thing? It's kinda urgent.";
const expectedOutput = {
  "corrected_text": "Hello, could you please assist me with this matter? It is somewhat urgent.",
  "paraphrased_text": "Good morning, I would appreciate your assistance with this time-sensitive matter.",
  "suggestions": [
    "Use formal greetings in professional communication",
    "Replace casual expressions with professional alternatives",
    "Be specific about the nature of urgency"
  ]
};
```

#### Test Case 4: Casual Tone
```javascript
const testInput = "I must request your immediate assistance regarding this particular matter of great importance.";
const expectedOutput = {
  "corrected_text": "I need your help with this important thing.",
  "paraphrased_text": "Hey, can you help me with this? It's pretty important.",
  "suggestions": [
    "Use simpler, more conversational language",
    "Replace formal terms with everyday expressions", 
    "Make the tone more approachable and friendly"
  ]
};
```

## Extension Settings Examples

### Default Settings
```json
{
  "isEnabled": true,
  "apiUrl": "http://localhost:11434",
  "selectedTone": "professional",
  "suggestionFrequency": "medium",
  "enableRealTime": true,
  "enableAutoComplete": true,
  "debounceMs": 1500
}
```

### Performance-Optimized Settings
```json
{
  "isEnabled": true,
  "apiUrl": "http://localhost:11434",
  "selectedTone": "professional",
  "suggestionFrequency": "low",
  "enableRealTime": true,
  "enableAutoComplete": false,
  "debounceMs": 3000
}
```

### High-Accuracy Settings
```json
{
  "isEnabled": true,
  "apiUrl": "http://localhost:11434",
  "selectedTone": "academic",
  "suggestionFrequency": "high",
  "enableRealTime": true,
  "enableAutoComplete": true,
  "debounceMs": 1000
}
```

## Website Compatibility Test Cases

### Test Websites
1. **Gmail** - `compose.mail.google.com`
2. **Google Docs** - `docs.google.com`
3. **Twitter/X** - `twitter.com/compose`
4. **LinkedIn** - `linkedin.com/feed`
5. **Facebook** - `facebook.com`
6. **Slack** - `slack.com`
7. **Discord** - `discord.com`
8. **GitHub** - `github.com` (issue/comment creation)
9. **Medium** - `medium.com` (story writing)
10. **WordPress** - Any WordPress blog editing interface

### Element Selectors for Testing
```javascript
const testSelectors = [
  'textarea',
  'input[type="text"]',
  'input[type="email"]',
  '[contenteditable="true"]',
  '.compose-text',
  '.message-input',
  '.editor-content',
  '#post-textarea'
];
```

## API Response Examples

### Successful Response
```json
{
  "response": "{\"corrected_text\": \"This is a corrected sentence.\", \"paraphrased_text\": \"Here is an alternative phrasing.\", \"suggestions\": [\"Tip 1\", \"Tip 2\"]}"
}
```

### Error Response
```json
{
  "error": "Model not found: llama3.2"
}
```

### Malformed Response (to test error handling)
```json
{
  "response": "This is not JSON format"
}
```

## Browser Testing Configuration

### Chrome Extension Manifest Test
```json
{
  "manifest_version": 3,
  "name": "AI Writing Assistant",
  "version": "1.0.0",
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "scripting"
  ],
  "host_permissions": [
    "http://localhost:*/*"
  ]
}
```

### Content Security Policy Test
```javascript
// Test that extension works with strict CSP
const cspHeaders = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'"
};
```

## Performance Benchmarks

### Target Performance Metrics
- **API Response Time**: < 2 seconds for typical text (100-500 characters)
- **Memory Usage**: < 50MB additional memory usage
- **CPU Usage**: < 5% during active analysis
- **Cache Hit Rate**: > 70% for repeated text analysis

### Test Data Sizes
- **Small Text**: 10-50 characters
- **Medium Text**: 100-200 characters  
- **Large Text**: 300-500 characters
- **Maximum Text**: 500+ characters (should be truncated)

## Ollama Model Test Commands

### Verify Model Installation
```bash
ollama list
```

### Test Direct API Call
```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Fix this text: I are going to store",
    "stream": false
  }'
```

### Health Check
```bash
curl -X GET http://localhost:11434/api/tags
```

## Error Simulation for Testing

### Network Error Simulation
```javascript
// Mock fetch to simulate network errors
window.fetch = jest.fn(() => 
  Promise.reject(new Error('Network Error'))
);
```

### Timeout Simulation  
```javascript
// Mock fetch to simulate timeout
window.fetch = jest.fn(() => 
  new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout')), 10000);
  })
);
```

### Invalid JSON Response
```javascript
// Mock fetch to return invalid JSON
window.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      response: "This is not valid JSON{"
    })
  })
);
```

## Security Test Cases

### Input Sanitization Tests
```javascript
const maliciousInputs = [
  "<script>alert('xss')</script>",
  "'; DROP TABLE users; --",
  "../../../etc/passwd",
  "javascript:alert('xss')",
  "\"><img src=x onerror=alert('xss')>"
];
```

### Permission Test
```javascript
// Test that extension only requests necessary permissions
const requiredPermissions = [
  'activeTab',
  'storage', 
  'contextMenus',
  'scripting'
];

const prohibitedPermissions = [
  'tabs',
  'history',
  'bookmarks',
  'management'
];
```

This configuration file provides comprehensive examples for testing and configuring the AI Writing Assistant extension across various scenarios and use cases.