# GPT-4 Realtime API Trial

A simple web application to test Azure OpenAI's GPT-4 Realtime API for voice-based conversations.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Azure OpenAI resource with GPT-4 Realtime API access
- Modern web browser with microphone support

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Azure OpenAI credentials:**
   
   Open the `.env` file and fill in your Azure OpenAI details:
   ```env
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
   AZURE_OPENAI_API_KEY=your-api-key-here
   AZURE_OPENAI_DEPLOYMENT=gpt-4o-realtime-preview
   PORT=3000
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - Grant microphone permissions when prompted
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
   - Create a deployment with the `gpt-4o-realtime-preview` model
   - Use the deployment name you created

### Required Model
- Model: `gpt-4o-realtime-preview` (or `gpt-4-realtime-preview`)
- Ensure your Azure subscription has access to this model

## 🏗️ Project Structure

```
gpt-realtime/
├── server.js              # Express server with WebSocket proxy
├── public/                # Static files served to browser
│   ├── index.html        # Main UI
│   ├── app.js            # Client-side logic
│   └── styles.css        # Styling
├── package.json          # Project dependencies
├── .env                  # Environment variables (not in git)
├── .env.example         # Environment template
└── README.md            # This file
```

## 🔧 How It Works

1. **Browser** captures audio from your microphone
2. **WebSocket** sends audio chunks to the Node.js server
3. **Server** proxies the connection to Azure OpenAI Realtime API
4. **Azure OpenAI** processes audio and generates voice responses
5. **Server** relays audio back to the browser
6. **Browser** plays the AI's voice response

## 🎯 Features

- ✅ Real-time voice conversations
- ✅ Text transcript of conversation
- ✅ Visual status indicators
- ✅ Error handling and recovery
- ✅ Simple, intuitive interface

## 🐛 Troubleshooting

### Microphone not working
- Ensure you've granted microphone permissions in your browser
- Check browser console for errors
- Try using HTTPS (required by some browsers)

### Connection errors
- Verify your `.env` file has correct values
- Check that your Azure OpenAI deployment is active
- Ensure you have quota available in Azure

### No audio playback
- Check browser audio settings
- Ensure volume is not muted
- Look for errors in browser console

## 📚 Resources

- [Azure OpenAI Realtime API Documentation](https://learn.microsoft.com/azure/ai-services/openai/how-to/realtime)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 📝 License

MIT

## 🤝 Contributing

This is a trial/demo project. Feel free to fork and modify for your needs!

---

**Status**: 🏗️ In Development
**Last Updated**: October 20, 2025
