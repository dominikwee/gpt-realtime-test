# GPT Realtime API - Implementation

## Overview
Web-based voice chat application using Azure OpenAI GPT Realtime API with the official OpenAI Node.js SDK.

## Technology Stack
- **Backend**: Node.js with Express + OpenAI SDK (`openai/realtime/ws`)
- **Frontend**: Vanilla JavaScript with Web Audio API
- **Model**: `gpt-realtime` (2025-08-28) on Azure OpenAI
- **API Version**: `2025-04-01-preview`

## Architecture
```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────────┐
│   Web Browser   │ ◄────── │  Express Server  │ ◄────── │ Azure OpenAI        │
│   (HTML/JS)     │   WS    │  + OpenAI SDK    │   WS    │ gpt-realtime        │
│   + Microphone  │         │  (Proxy)         │         │                     │
└─────────────────┘         └──────────────────┘         └─────────────────────┘
```

## Implementation Steps

### Phase 1: Project Setup
1. **Initialize Node.js Project**
   - Create `package.json` with project metadata
   - Install dependencies:
     - `express` - Web server
     - `dotenv` - Environment variable management
     - `ws` - WebSocket client for realtime API
   
2. **Environment Configuration**
   - Create `.env` file for Azure credentials:
     - `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint URL
     - `AZURE_OPENAI_API_KEY` - Your API key
     - `AZURE_OPENAI_DEPLOYMENT` - Deployment name (e.g., "gpt-4o-realtime-preview")

### Phase 2: Backend Development
3. **Create Express Server** (`server.js`)
   - Set up HTTPS server (required for microphone access)
   - Serve static files (HTML, CSS, JS)
   - Create WebSocket proxy endpoint to Azure OpenAI
   - Handle authentication with Azure API key
   - Forward audio streams bidirectionally

4. **WebSocket Proxy Logic**
   - Accept WebSocket connections from browser
   - Establish connection to Azure OpenAI Realtime API
   - Relay messages between browser and Azure
   - Handle connection errors and reconnection

## Implementation

### Backend (`server.js`)
- Express server with WebSocket support
- Uses official `OpenAIRealtimeWS.azure()` SDK method
- Proxies WebSocket connection between browser and Azure
- Forwards all events bidirectionally
- Simple, clean code (~90 lines)

### Frontend (`public/`)
**index.html**: Simple UI with Connect and Recording buttons
**styles.css**: Modern gradient design
**app.js**: 
- WebSocket client connection
- Microphone capture with Web Audio API
- PCM16 audio conversion at 24kHz
- Session configuration with server VAD
- Event handling for transcripts and responses

## Key Features
✅ Official OpenAI SDK integration
✅ Clean proxy architecture
✅ Voice activity detection (server-side)
✅ Audio transcription with Whisper
✅ Real-time audio streaming
✅ Simple, maintainable codebase

## Configuration
Session setup in `app.js`:
- Voice: `alloy`
- Modalities: `text` + `audio`
- VAD: `server_vad` with 200ms silence detection
- Audio format: `pcm16` at 24kHz
- Transcription: `whisper-1`
    - User feedback for all states

### Phase 6: Testing & Documentation
11. **Testing**
    - Test microphone permissions
    - Verify audio quality
    - Test conversation flow
    - Test error scenarios
    - Cross-browser compatibility

12. **Documentation** (`README.md`)
    - Setup instructions
    - Azure OpenAI configuration guide
    - Usage instructions
    - Troubleshooting guide
## Current Status

### Completed ✅
- [x] Server setup with OpenAI SDK
- [x] Azure OpenAI connection working
- [x] WebSocket proxy implementation
- [x] Client UI (HTML/CSS)
- [x] Microphone capture
- [x] Audio conversion (Float32 → PCM16)
- [x] Session configuration
- [x] Event handling structure

### Working
- Session creation and configuration
- WebSocket communication
- Audio streaming to Azure

### To Test
- [ ] Full voice conversation flow
- [ ] Audio playback from AI
- [ ] Transcript display
- [ ] Error recovery

## Usage
```bash
npm start
# Open http://localhost:3000
# Click "Connect"
# Click "Start Recording"
# Speak to the AI
```

## Important Notes
- Uses `gpt-realtime` model (NOT `gpt-4o-realtime-preview`)
- API version MUST be `2025-04-01-preview`
- SDK handles authentication automatically
- Audio format: PCM16 at 24kHz mono
- **Input**: PCM 16-bit mono, 24kHz sample rate
- **Output**: PCM 16-bit mono, 24kHz sample rate (base64 encoded)

### Rate Limits
- Check your Azure OpenAI quota
- Typical limits: tokens per minute, requests per minute

## Development Workflow

1. **Local Development**
   ```bash
   npm install
   npm run dev
## Resources
- [Azure OpenAI Realtime API Documentation](https://learn.microsoft.com/azure/ai-foundry/openai/how-to/realtime-audio)
- [OpenAI Node.js SDK - Realtime](https://github.com/openai/openai-node/tree/main/examples/azure/realtime)
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

**Status**: Core implementation complete
**Last Updated**: October 23, 2025
