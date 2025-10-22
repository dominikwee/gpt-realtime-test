require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;

// Validate environment variables
if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT in your .env file');
  process.exit(1);
}

// Create Express app
const app = express();
const server = http.createServer(app);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create WebSocket server for client connections
const wss = new WebSocket.Server({ server, path: '/realtime' });

console.log('🚀 Starting GPT-4 Realtime API Server...');
console.log(`📍 Azure Endpoint: ${AZURE_OPENAI_ENDPOINT}`);
console.log(`🎯 Deployment: ${AZURE_OPENAI_DEPLOYMENT}`);

// Handle WebSocket connections from browser clients
wss.on('connection', (clientWs) => {
  console.log('👤 Client connected');
  
  let azureWs = null;
  let isAzureConnected = false;

  // Construct Azure OpenAI Realtime API URL
  // For newer gpt-realtime models (2025-08-28), use the 2025-04-01-preview API version
  const apiVersion = '2025-04-01-preview';
  const azureUrl = `${AZURE_OPENAI_ENDPOINT.replace('https://', 'wss://')}/openai/realtime?api-version=${apiVersion}&deployment=${AZURE_OPENAI_DEPLOYMENT}`;
  
  console.log('🔗 Connecting to Azure OpenAI Realtime API...');
  console.log('📡 URL:', azureUrl.replace(AZURE_OPENAI_API_KEY, '***'));
  console.log('🔧 API Version:', apiVersion);
  console.log('📦 Deployment:', AZURE_OPENAI_DEPLOYMENT);

  try {
    // Create WebSocket connection to Azure OpenAI
    azureWs = new WebSocket(azureUrl, {
      headers: {
        'api-key': AZURE_OPENAI_API_KEY,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    // Azure WebSocket opened
    azureWs.on('open', () => {
      console.log('✅ Connected to Azure OpenAI Realtime API');
      isAzureConnected = true;
      
      // Notify client that connection is established
      clientWs.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        message: 'Connected to Azure OpenAI Realtime API'
      }));
      
      console.log('⏳ Waiting for session.created event from Azure...');
    });

    // Forward messages from Azure to client
    azureWs.on('message', (data) => {
      try {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
          
          // Log important events (optional, for debugging)
          const message = JSON.parse(data.toString());
          console.log(`📨 Azure -> Client: ${message.type}`);
          
          if (message.type === 'error') {
            console.error('❌ Azure error:', message.error || message);
          } else if (message.type === 'session.created') {
            console.log('📝 Session created:', message.session?.id);
            console.log('🎤 Voice:', message.session?.voice);
            console.log('🔧 Modalities:', message.session?.modalities);
          } else if (message.type === 'session.updated') {
            console.log('⚙️  Session updated successfully');
          } else if (message.type === 'response.done') {
            console.log('✅ Response completed');
          } else if (message.type === 'input_audio_buffer.speech_started') {
            console.log('🎤 Speech detected');
          } else if (message.type === 'input_audio_buffer.speech_stopped') {
            console.log('🛑 Speech stopped');
          }
        }
      } catch (error) {
        console.error('Error forwarding message from Azure:', error);
      }
    });

    // Handle Azure WebSocket errors
    azureWs.on('error', (error) => {
      console.error('❌ Azure WebSocket error:', error.message);
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: `Azure connection error: ${error.message}`
        }));
      }
    });

    // Handle Azure WebSocket closure
    azureWs.on('close', (code, reason) => {
      console.log(`🔌 Azure WebSocket closed (code: ${code})`);
      isAzureConnected = false;
      
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'connection',
          status: 'disconnected',
          message: 'Disconnected from Azure OpenAI'
        }));
        clientWs.close();
      }
    });

    // Forward messages from client to Azure
    clientWs.on('message', (data) => {
      try {
        if (azureWs && isAzureConnected && azureWs.readyState === WebSocket.OPEN) {
          azureWs.send(data);
          
          // Log message types (optional, for debugging)
          const message = JSON.parse(data.toString());
          if (message.type === 'session.update') {
            console.log('⚙️  Session update sent');
          } else if (message.type === 'input_audio_buffer.append') {
            // Don't log audio chunks (too verbose)
          } else if (message.type === 'input_audio_buffer.commit') {
            console.log('🎤 Audio buffer committed');
          } else if (message.type === 'response.create') {
            console.log('💬 Response creation requested');
          }
        } else {
          console.warn('⚠️  Cannot send message - Azure connection not ready');
        }
      } catch (error) {
        console.error('Error forwarding message to Azure:', error);
      }
    });

    // Handle client disconnection
    clientWs.on('close', () => {
      console.log('👋 Client disconnected');
      
      if (azureWs && azureWs.readyState === WebSocket.OPEN) {
        azureWs.close();
      }
    });

    // Handle client errors
    clientWs.on('error', (error) => {
      console.error('❌ Client WebSocket error:', error.message);
    });

  } catch (error) {
    console.error('❌ Failed to establish Azure connection:', error);
    
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'error',
        message: `Failed to connect to Azure: ${error.message}`
      }));
      clientWs.close();
    }
  }
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Start the server
server.listen(PORT, () => {
  console.log('');
  console.log('✅ Server is running!');
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });
  
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
