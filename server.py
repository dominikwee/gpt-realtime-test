import asyncio
import json
import os
import signal
import ssl
import sys
from pathlib import Path

import certifi
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from openai import AzureOpenAI
import websockets
from websockets.exceptions import ConnectionClosed

# Load environment variables
load_dotenv()

# Configuration
PORT = int(os.getenv('PORT', 3000))
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT')

# Validate environment variables
if not all([AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT]):
    print('Missing environment variables')
    sys.exit(1)

print('Starting Python server...')
print(f'Endpoint: {AZURE_OPENAI_ENDPOINT}')
print(f'Deployment: {AZURE_OPENAI_DEPLOYMENT}')
print('')

# Create FastAPI app
app = FastAPI()

@app.get("/")
async def read_index():
    """Serve the index.html file"""
    from fastapi.responses import FileResponse
    public_path = Path(__file__).parent / "public" / "index.html"
    if public_path.exists():
        return FileResponse(str(public_path))
    return {"message": "Index file not found"}

@app.get("/{filename}")
async def read_static_file(filename: str):
    """Serve static files from public directory"""
    from fastapi.responses import FileResponse
    public_path = Path(__file__).parent / "public" / filename
    if public_path.exists() and public_path.is_file():
        return FileResponse(str(public_path))
    return {"message": "File not found"}

class AzureRealtimeClient:
    def __init__(self):
        self.client = AzureOpenAI(
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_key=AZURE_OPENAI_API_KEY,
            api_version='2025-04-01-preview'
        )
        self.websocket = None
        self.client_ws = None
        
    async def connect(self, client_websocket: WebSocket):
        """Connect to Azure OpenAI Realtime API"""
        self.client_ws = client_websocket
        
        # Build the WebSocket URL for Azure OpenAI Realtime API
        # Format: wss://{endpoint}/openai/realtime?api-version={api_version}&deployment={deployment}
        base_url = AZURE_OPENAI_ENDPOINT.replace('https://', 'wss://')
        if base_url.endswith('/'):
            base_url = base_url[:-1]
        
        ws_url = f"{base_url}/openai/realtime?api-version=2025-04-01-preview&deployment={AZURE_OPENAI_DEPLOYMENT}"
        
        # Create connection headers as a dictionary
        connection_headers = {
            'api-key': AZURE_OPENAI_API_KEY,
            'OpenAI-Beta': 'realtime=v1'
        }
        
        try:
            # Create SSL context with certifi's certificate bundle
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            ssl_context.check_hostname = True
            ssl_context.verify_mode = ssl.CERT_REQUIRED
            
            # Use the correct parameter name for websockets library
            self.websocket = await websockets.connect(
                ws_url,
                additional_headers=connection_headers,
                ssl=ssl_context
            )
            print('Connected to Azure')
            
            # Send connection success message to client
            await client_websocket.send_text(json.dumps({
                'type': 'connection', 
                'status': 'connected'
            }))
            
            # Start listening for messages from Azure
            asyncio.create_task(self._listen_azure_messages())
            
        except Exception as e:
            print(f'Connection failed: {e}')
            await client_websocket.send_text(json.dumps({
                'type': 'error', 
                'message': str(e)
            }))
            raise e
    
    async def _listen_azure_messages(self):
        """Listen for messages from Azure OpenAI and forward to client"""
        try:
            async for message in self.websocket:
                try:
                    event = json.loads(message)
                    print(f'Azure -> {event.get("type", "unknown")}')
                    
                    # Forward message to client
                    if self.client_ws:
                        await self.client_ws.send_text(message)
                        
                except json.JSONDecodeError:
                    print(f'Invalid JSON from Azure: {message}')
                except Exception as e:
                    print(f'Error processing Azure message: {e}')
                    
        except ConnectionClosed:
            print('Azure disconnected')
        except Exception as e:
            print(f'Azure error: {e}')
    
    async def send_to_azure(self, message_data):
        """Send message to Azure OpenAI"""
        if self.websocket:
            try:
                message_json = json.dumps(message_data)
                await self.websocket.send(message_json)
                print(f'Client -> {message_data.get("type", "unknown")}')
            except Exception as e:
                print(f'Error sending to Azure: {e}')
    
    async def close(self):
        """Close connection to Azure OpenAI"""
        if self.websocket:
            await self.websocket.close()
            self.websocket = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print('Client connected')
    
    azure_client = AzureRealtimeClient()
    
    try:
        # Connect to Azure OpenAI
        await azure_client.connect(websocket)
        
        # Listen for client messages
        while True:
            try:
                # Receive message from client
                message = await websocket.receive_text()
                message_data = json.loads(message)
                
                # Forward to Azure OpenAI
                await azure_client.send_to_azure(message_data)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                print(f'Invalid JSON from client: {message}')
            except Exception as e:
                print(f'Error processing client message: {e}')
                break
                
    except Exception as e:
        print(f'WebSocket error: {e}')
    finally:
        print('Client disconnected')
        await azure_client.close()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print('\nShutting down...')
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    print(f'Server running on http://localhost:{PORT}')
    uvicorn.run(
        "server:app", 
        host="0.0.0.0", 
        port=PORT, 
        reload=False,
        log_level="info"
    )