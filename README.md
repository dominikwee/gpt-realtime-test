# GPT Realtime Voice Chat

A web application for real-time voice conversations with Azure OpenAI's GPT Realtime API. Available in both Python (FastAPI) and Node.js (Express) implementations.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+ OR Node.js (v18+)
- Azure OpenAI resource with GPT Realtime API access
- Modern web browser with microphone support

### Installation

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd gpt-realtime-test
   ```

2. **Configure Azure OpenAI credentials:**
   
   Copy and edit the environment file:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Azure OpenAI details in `.env`:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_DEPLOYMENT=gpt-realtime
   PORT=3000
   ```

3. **Run the application:**

   **Option A: Python (Recommended)**
   ```bash
   # Quick start script
   ./start-python.sh
   
   # Or using npm script
   npm run start:python
   
   # Or manually
   .venv/bin/python server.py
   ```

   **Option B: Node.js (Legacy)**
   ```bash
   npm install
   npm start
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Grant microphone permissions when prompted
   - Click "Connect" then "Start Recording"
   - Start talking with the AI!

## 📋 Azure OpenAI Setup

### Getting Your Credentials

1. **Endpoint**: 
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your Azure OpenAI resource
   - Find "Endpoint" in the overview section
   - Format: `https://your-resource-name.openai.azure.com`

2. **API Key**:
   - In your Azure OpenAI resource
   - Go to "Keys and Endpoint"
   - Copy either KEY 1 or KEY 2

3. **Deployment Name**:
   - Go to "Model deployments" or Azure OpenAI Studio
   - Create a deployment with the `gpt-realtime` model  
   - Use the deployment name you created

### Required Model
- Model: `gpt-realtime` (latest version)
- Ensure your Azure subscription has access to this model

## 🏗️ Project Structure

```
gpt-realtime-test/
├── server.py               # Python FastAPI server (recommended)
├── requirements.txt        # Python dependencies  
├── start-python.sh        # Python startup script
├── .venv/                 # Python virtual environment
├── public/                # Static files served to browser
│   ├── index.html        # Main UI
│   ├── app.js            # Client-side logic  
│   └── styles.css        # Styling
├── package.json          # Node.js dependencies (legacy)
├── .env                  # Environment variables (not in git)
├── .env.example         # Environment template
└── README.md            # This file
```

## 🔧 How It Works

**Python Implementation (Current):**
1. **Browser** captures audio from your microphone
2. **WebSocket** (`/ws`) sends audio chunks to the FastAPI server
3. **Python server** establishes secure connection to Azure OpenAI Realtime API
4. **Azure OpenAI** processes audio and generates voice responses
5. **Server** relays audio back to the browser via WebSocket
6. **Browser** plays the AI's voice response

**Architecture:**
- **Frontend**: Vanilla JavaScript with Web Audio API
- **Backend**: Python FastAPI with async WebSocket support
- **Connection**: Secure WebSocket proxy with SSL certificate handling

## 🎯 Features

- ✅ **Dual Implementation**: Python (FastAPI) and Node.js (Express) servers
- ✅ **Real-time voice conversations** with Azure OpenAI
- ✅ **Text transcript** of conversation
- ✅ **Visual status indicators** and connection management
- ✅ **Error handling and recovery** with SSL certificate support
- ✅ **Simple, intuitive interface** with modern design
- ✅ **Cross-platform support** via Python virtual environment

## 🐛 Troubleshooting

### Microphone not working
- Ensure you've granted microphone permissions in your browser
- Check browser console for errors
- Try using HTTPS (required by some browsers)

### Connection errors
- Verify your `.env` file has correct values
- Check that your Azure OpenAI deployment is active  
- Ensure you have quota available in Azure
- For Python: SSL certificate issues are handled automatically with `certifi`

### Python-specific issues
- Ensure virtual environment is activated: `.venv/bin/python`
- Check that all requirements are installed: `pip install -r requirements.txt`
- SSL errors should be resolved automatically with the `certifi` package

### No audio playback
- Check browser audio settings
- Ensure volume is not muted
- Look for errors in browser console

## 📚 Resources

- [Azure OpenAI Realtime API Documentation](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/realtime-audio)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Python WebSockets Library](https://websockets.readthedocs.io/)

## 📝 License

MIT

## 🤝 Contributing

This is a trial/demo project. Feel free to fork and modify for your needs!

---

**Status**: ✅ **COMPLETE - Python implementation working**
**Last Updated**: October 24, 2025
