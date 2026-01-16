# AI Writing Assistant - Quick Start Guide

## 🎯 Installation & Setup

### 1. Prerequisites
Before you begin, make sure you have:
- **Chrome Browser** (version 88+)
- **Node.js** (version 16+) 
- **Ollama** installed and running

### 2. Install Ollama & LLaMA Model
```bash
# Download Ollama from https://ollama.ai
# Start Ollama service
ollama serve

# Pull the LLaMA 3.2 model
ollama pull llama3.2

# Verify installation
curl http://localhost:11434/api/tags
```

### 3. Build the Extension
```bash
# Clone or navigate to the project directory
cd "Writing Assistant"

# Install dependencies
npm install

# Build the extension
npm run build
```

### 4. Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from the project directory

### 5. Configure Settings
1. Click the extension icon in Chrome toolbar
2. Click the settings gear icon 
3. Verify API URL is `http://localhost:11434`
4. Click "Test Connection" - should show "Connected"
5. Configure your preferred tone and settings

## 🚀 Usage

### Real-time Suggestions
- Start typing in any text field on any website
- Look for blue indicators when suggestions are available
- Click indicators to view and apply suggestions

### Popup Analysis  
- Click extension icon → Enter text → Click "Analyze"
- Copy corrected or paraphrased text as needed

### Context Menu
- Select text on any webpage → Right-click → "Analyze with AI Writing Assistant"

## 🔧 Troubleshooting

**Extension not working?**
- Ensure Ollama is running: `ollama serve`
- Check API connection in extension settings
- Look for errors in Chrome DevTools console

**Poor suggestions?**
- Try different tone settings
- Ensure text is at least 10 characters
- Check if LLaMA 3.2 model is properly installed

## 📁 Project Structure
```
dist/                    # Built extension (load this in Chrome)
├── background/          # Service worker
├── content/            # Content scripts  
├── popup/              # Popup interface
├── options/            # Settings page
├── manifest.json       # Extension manifest
└── ...

src/                    # Source code
tests/                  # Test files
README.md              # Full documentation
MANUAL_TESTING.md      # Testing procedures
```

##  Verification Checklist
- [ ] Ollama service running (`ollama serve`)
- [ ] LLaMA 3.2 model installed (`ollama list`)
- [ ] Extension built successfully (`npm run build`)
- [ ] Extension loaded in Chrome
- [ ] Connection test passes
- [ ] Real-time suggestions work on test website
- [ ] Popup analysis works

## 🎉 You're Ready!
The AI Writing Assistant is now ready to help improve your writing across the web. For detailed documentation, see [README.md](README.md).

---
**Need Help?** Check the [troubleshooting section](README.md#troubleshooting) in the main documentation or review the [manual testing guide](tests/MANUAL_TESTING.md).