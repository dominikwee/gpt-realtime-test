# Project-Specific Instructions for GitHub Copilot

## Model Information
This project uses the **Azure OpenAI GPT-Realtime API**, NOT the GPT-4 Realtime API.

### Key Differences:
- **Model name**: `gpt-realtime` (deployed as `gpt-realtime` in Azure)
- **Latest model version**: `gpt-realtime` (`2025-08-28`) and `gpt-realtime-mini` (`2025-10-06`)
- **API version**: `2025-04-01-preview` (required for these newer models)
- **Deployment**: Azure OpenAI Service (not OpenAI directly)

### Official Documentation:
- Primary: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio
- OpenAI announcement: https://openai.com/index/introducing-gpt-realtime/

## Project Architecture
- **Backend**: Node.js/Express server acting as WebSocket proxy
- **Frontend**: Vanilla JavaScript with Web Audio API
- **Communication**: WebSocket connections (client ↔ server ↔ Azure OpenAI)
- **Audio format**: PCM16 at 24kHz sample rate

## Important Notes
- Always use API version `2025-04-01-preview` for the `gpt-realtime` model
- The deployment name in Azure is `gpt-realtime`
- Server-side VAD (Voice Activity Detection) is used for speech detection
- Audio is processed in 200ms chunks (4800 samples at 24kHz)

## Environment Variables
Required in `.env`:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
