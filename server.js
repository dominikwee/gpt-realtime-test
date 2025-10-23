import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';
import { OpenAIRealtimeWS } from 'openai/realtime/ws';
import { AzureOpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const PORT = process.env.PORT || 3000;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT;

if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
  console.error('Missing environment variables');
  process.exit(1);
}

console.log('Starting server...');
console.log('Endpoint:', AZURE_OPENAI_ENDPOINT);
console.log('Deployment:', AZURE_OPENAI_DEPLOYMENT);
console.log('');

const app = express();
const server = http.createServer(app);
app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocketServer({ server });

wss.on('connection', async (clientWs) => {
  console.log('Client connected');
  let azureRT = null;

  try {
    const azureClient = new AzureOpenAI({
      endpoint: AZURE_OPENAI_ENDPOINT,
      apiKey: AZURE_OPENAI_API_KEY,
      apiVersion: '2025-04-01-preview',
      deployment: AZURE_OPENAI_DEPLOYMENT
    });

    azureRT = await OpenAIRealtimeWS.azure(azureClient);

    azureRT.socket.on('open', () => {
      console.log('Connected to Azure');
      clientWs.send(JSON.stringify({ type: 'connection', status: 'connected' }));
    });

    azureRT.on('event', (event) => {
      console.log('Azure ->', event.type);
      if (clientWs.readyState === 1) {
        clientWs.send(JSON.stringify(event));
      }
    });

    azureRT.on('error', (err) => console.error('Azure error:', err.message));
    azureRT.socket.on('close', () => console.log('Azure disconnected'));

    clientWs.on('message', (data) => {
      const msg = JSON.parse(data);
      console.log('Client ->', msg.type);
      azureRT.send(msg);
    });

  } catch (error) {
    console.error('Connection failed:', error.message);
    clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
  }

  clientWs.on('close', () => {
    console.log('Client disconnected');
    if (azureRT) azureRT.close();
  });
});

server.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
