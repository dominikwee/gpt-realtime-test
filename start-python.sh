#!/bin/bash

# Activate virtual environment and start Python server
echo "Starting Python GPT Realtime Server..."
echo "Make sure your .env file contains:"
echo "  AZURE_OPENAI_ENDPOINT"
echo "  AZURE_OPENAI_API_KEY" 
echo "  AZURE_OPENAI_DEPLOYMENT"
echo ""

cd "$(dirname "$0")"
.venv/bin/python server.py