# Manual Testing Plan for AI Writing Assistant

This document provides a comprehensive testing plan to ensure all features work correctly before deployment.

## Pre-Testing Setup

1. **Install Ollama locally**:
   ```bash
   # Download and install Ollama from https://ollama.ai
   ollama serve
   ollama pull llama3.2
   ```

2. **Load Extension in Chrome**:
   - Build the extension: `npm run build`
   - Open Chrome Extensions page: `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## 1. Installation and Setup Testing

### 1.1 First Installation
- [ ] Extension installs without errors
- [ ] Options page opens automatically after installation
- [ ] Default settings are properly loaded
- [ ] Extension icon appears in toolbar

### 1.2 Options Page Configuration  
- [ ] API URL field shows default value (http://localhost:11434)
- [ ] Connection test button works correctly
- [ ] All toggle switches function properly
- [ ] Settings save and persist after page reload
- [ ] Export/import settings functionality works
- [ ] Reset to defaults clears all custom settings

## 2. API Integration Testing

### 2.1 Connection Testing
- [ ] Test with Ollama running: should show "Connected"
- [ ] Test with Ollama stopped: should show "Connection failed"
- [ ] Test with invalid URL: should show appropriate error
- [ ] Connection status updates correctly in popup

### 2.2 Text Analysis
- [ ] Analyze text in popup interface
- [ ] Verify API request includes proper prompt format
- [ ] Confirm response parsing works for valid JSON
- [ ] Handle malformed API responses gracefully
- [ ] Cache suggestions work (same text doesn't trigger new API call)

## 3. Real-time Suggestions Testing

### 3.1 Text Input Detection
Test on various websites:
- [ ] Gmail compose window
- [ ] Google Docs
- [ ] Twitter/X compose
- [ ] Facebook post creation
- [ ] LinkedIn post/comment
- [ ] Any website with `<textarea>` elements
- [ ] Any website with `<input type="text">` elements
- [ ] Any website with `contentEditable` elements

### 3.2 Suggestion Display
- [ ] Blue border appears around text fields with suggestions
- [ ] Blue indicator icon appears in top-right corner of text fields
- [ ] Clicking indicator shows tooltip with suggestions
- [ ] Tooltip displays corrected text, paraphrased version, and improvement tips
- [ ] Clicking suggestions applies them to the text field

### 3.3 Performance Testing
- [ ] Typing doesn't lag (debouncing works correctly)
- [ ] Suggestions appear within reasonable time (1-3 seconds)
- [ ] Memory usage remains stable during extended use
- [ ] No excessive API calls when typing rapidly

## 4. Popup Interface Testing

### 4.1 Basic Functionality  
- [ ] Popup opens when clicking extension icon
- [ ] Enable/disable toggle updates settings
- [ ] Text input area accepts pasted and typed text
- [ ] Character counter updates correctly
- [ ] Analyze button enables/disables appropriately

### 4.2 Analysis Results
- [ ] Loading state shows during API request
- [ ] Results display corrected text
- [ ] Paraphrased text shows when different from corrected
- [ ] Improvement suggestions list populates
- [ ] Copy buttons work for corrected and paraphrased text
- [ ] Error messages display for API failures

### 4.3 Tone Selection
- [ ] Tone dropdown includes all options (professional, casual, friendly, persuasive, academic)
- [ ] Changing tone affects analysis results
- [ ] Selected tone persists across sessions

## 5. Context Menu Testing

### 5.1 Text Selection
- [ ] Right-click context menu appears on selected text
- [ ] "Analyze with AI Writing Assistant" option shows
- [ ] Clicking menu item analyzes selected text
- [ ] Results appear appropriately (popup or notification)

## 6. Settings and Customization Testing

### 6.1 Writing Preferences
- [ ] Default tone setting affects all analyses
- [ ] Suggestion frequency setting works (low/medium/high)
- [ ] Debounce timing adjustment affects real-time analysis delay

### 6.2 Feature Toggles
- [ ] Disabling real-time suggestions stops automatic analysis
- [ ] Disabling auto-complete removes completion features
- [ ] Master toggle disables all extension functionality
- [ ] Settings sync across popup and options pages

### 6.3 Data Management
- [ ] Cache information displays correctly
- [ ] Clear cache removes stored suggestions
- [ ] Error logs accumulate and can be viewed
- [ ] Clear logs removes error entries

## 7. Error Handling Testing

### 7.1 Network Errors
- [ ] API timeout handled gracefully (show appropriate error)
- [ ] Network disconnection handled properly
- [ ] Invalid API responses don't crash extension

### 7.2 Edge Cases
- [ ] Empty text input handled appropriately
- [ ] Very long text (500+ characters) processed correctly
- [ ] Special characters and Unicode handled properly
- [ ] Malicious or unusual input doesn't cause issues

### 7.3 Browser Compatibility
- [ ] Works in Chrome (latest version)
- [ ] Functions correctly in Chromium-based browsers (Edge, Brave, etc.)
- [ ] No console errors in normal operation

## 8. Privacy and Security Testing

### 8.1 Data Handling
- [ ] No data sent to external servers (only to local Ollama)
- [ ] Cached data stored locally only
- [ ] Settings stored in Chrome's local storage
- [ ] No sensitive information logged

### 8.2 Permissions
- [ ] Extension requests only necessary permissions
- [ ] Works correctly with granted permissions
- [ ] Handles permission denial gracefully

## 9. Performance and Resource Usage

### 9.1 Resource Monitoring
- [ ] CPU usage remains reasonable during operation
- [ ] Memory usage doesn't grow unbounded
- [ ] Network requests are appropriately throttled
- [ ] Extension doesn't slow down web page loading

### 9.2 Cache Performance
- [ ] Repeated text analysis uses cache (no new API calls)
- [ ] Cache size limit prevents storage overflow
- [ ] Cache clearing improves performance if needed

## 10. User Experience Testing

### 10.1 Visual Design
- [ ] All UI elements render correctly
- [ ] Colors and fonts are consistent
- [ ] Responsive design works on different screen sizes
- [ ] Icons and graphics display properly

### 10.2 Interaction Flow
- [ ] Natural progression from installation to usage
- [ ] Intuitive navigation between popup and options
- [ ] Clear feedback for all user actions
- [ ] Consistent behavior across different websites

## Test Environment Variations

Test the extension under different conditions:
- [ ] Different Chrome versions
- [ ] With other extensions installed
- [ ] On different operating systems (Windows, macOS, Linux)
- [ ] With different Ollama model versions
- [ ] With slow network connections
- [ ] With high CPU/memory usage scenarios

## Acceptance Criteria

The extension passes testing when:
- [ ] All core features work without crashes
- [ ] API integration is stable and secure
- [ ] Real-time suggestions work on major websites
- [ ] User interface is intuitive and responsive
- [ ] Settings persist correctly
- [ ] Error handling prevents user frustration
- [ ] Performance doesn't negatively impact browsing

## Test Documentation

For each test scenario, document:
- [ ] Test steps performed
- [ ] Expected results
- [ ] Actual results
- [ ] Any issues encountered
- [ ] Screenshots for UI-related tests
- [ ] Performance metrics where relevant

---

**Note**: This testing plan should be executed in a systematic manner, with issues documented and resolved before proceeding to the next section. Critical issues should block deployment until resolved.