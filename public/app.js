// DOM Elements
const connectBtn = document.getElementById('connectBtn');
const micBtn = document.getElementById('micBtn');
const micBtnText = document.getElementById('micBtnText');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const transcript = document.getElementById('transcript');

// State
let ws = null;
let audioContext = null;
let mediaStream = null;
let audioWorkletNode = null;
let isRecording = false;
let isConnected = false;

// Audio playback queue
let audioQueue = [];
let isPlaying = false;

// Initialize
init();

function init() {
    connectBtn.addEventListener('click', toggleConnection);
    micBtn.addEventListener('click', toggleRecording);
}

// Connection Management
async function toggleConnection() {
    if (isConnected) {
        disconnect();
    } else {
        await connect();
    }
}

async function connect() {
    try {
        updateStatus('connecting', 'Connecting...');
        connectBtn.disabled = true;

        // Create WebSocket connection to our server
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/realtime`;
        
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Client: WebSocket connected');
            updateStatus('connected', 'Connected');
            isConnected = true;
            connectBtn.innerHTML = '<span class="btn-icon">🔌</span><span>Disconnect</span>';
            connectBtn.disabled = false;
            micBtn.disabled = false;
            
            // Don't initialize session immediately - wait for session.created event
            addMessage('system', 'Client: Connected to Azure OpenAI. Waiting for session...');
        };

        ws.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                await handleServerMessage(message);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addMessage('system', 'Connection error occurred');
        };

        ws.onclose = () => {
            console.log('Client: WebSocket closed');
            disconnect();
        };

    } catch (error) {
        console.error('Connection error:', error);
        updateStatus('disconnected', 'Connection failed');
        addMessage('error', `Connection failed: ${error.message}`);
        connectBtn.disabled = false;
    }
}

function disconnect() {
    if (isRecording) {
        stopRecording();
    }

    if (ws) {
        ws.close();
        ws = null;
    }

    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }

    isConnected = false;
    updateStatus('disconnected', 'Disconnected');
    connectBtn.innerHTML = '<span class="btn-icon">🔌</span><span>Connect</span>';
    connectBtn.disabled = false;
    micBtn.disabled = true;
}

// Session Initialization
function initializeSession() {
    console.log('Client: Initializing session configuration...');
    
    const sessionConfig = {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a helpful AI assistant. Please speak clearly and naturally.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
                model: 'whisper-1'
            },
            turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500
            },
            temperature: 0.8
        }
    };

    console.log('Client: Sending session config:', JSON.stringify(sessionConfig, null, 2));
    sendMessage(sessionConfig);
}

// Audio Recording
async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        // Request microphone access
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                sampleRate: 24000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });

        // Create audio context
        audioContext = new AudioContext({ sampleRate: 24000 });
        const source = audioContext.createMediaStreamSource(mediaStream);

        // Create audio processor
        await audioContext.audioWorklet.addModule(getAudioProcessorCode());
        audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');

        // Handle processed audio data
        audioWorkletNode.port.onmessage = (event) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const audioData = arrayBufferToBase64(event.data);
                sendMessage({
                    type: 'input_audio_buffer.append',
                    audio: audioData
                });
            }
        };

        // Connect nodes
        source.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);

        isRecording = true;
        micBtn.classList.add('recording');
        micBtnText.textContent = 'Stop Recording';
        addMessage('system', 'Recording started - speak now!');

    } catch (error) {
        console.error('Error starting recording:', error);
        addMessage('error', `Microphone error: ${error.message}`);
    }
}

function stopRecording() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (audioWorkletNode) {
        audioWorkletNode.disconnect();
        audioWorkletNode = null;
    }

    isRecording = false;
    micBtn.classList.remove('recording');
    micBtnText.textContent = 'Start Recording';
    addMessage('system', 'Recording stopped');
}

// Audio Processor Code (inline)
function getAudioProcessorCode() {
    const processorCode = `
        class AudioProcessor extends AudioWorkletProcessor {
            constructor() {
                super();
                this.bufferSize = 4800; // 200ms at 24kHz
                this.buffer = new Float32Array(this.bufferSize);
                this.bufferIndex = 0;
            }

            process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input.length > 0) {
                    const inputChannel = input[0];
                    
                    for (let i = 0; i < inputChannel.length; i++) {
                        this.buffer[this.bufferIndex++] = inputChannel[i];
                        
                        if (this.bufferIndex >= this.bufferSize) {
                            // Convert Float32 to Int16 PCM
                            const pcm16 = new Int16Array(this.bufferSize);
                            for (let j = 0; j < this.bufferSize; j++) {
                                const s = Math.max(-1, Math.min(1, this.buffer[j]));
                                pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }
                            
                            this.port.postMessage(pcm16.buffer);
                            this.bufferIndex = 0;
                        }
                    }
                }
                
                return true;
            }
        }

        registerProcessor('audio-processor', AudioProcessor);
    `;

    const blob = new Blob([processorCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
}

// Audio Playback
async function playAudio(base64Audio) {
    try {
        if (!audioContext) {
            audioContext = new AudioContext({ sampleRate: 24000 });
        }

        // Decode base64 to PCM16
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert Int16 PCM to Float32
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
        }

        // Create audio buffer
        const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);

        // Add to queue
        audioQueue.push(audioBuffer);
        
        // Start playing if not already playing
        if (!isPlaying) {
            playNextInQueue();
        }

    } catch (error) {
        console.error('Error playing audio:', error);
    }
}

function playNextInQueue() {
    if (audioQueue.length === 0) {
        isPlaying = false;
        return;
    }

    isPlaying = true;
    const audioBuffer = audioQueue.shift();

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
        playNextInQueue();
    };

    source.start();
}

// Message Handling
async function handleServerMessage(message) {
    console.log('Client: Received:', message.type, message);

    switch (message.type) {
        case 'connection':
            if (message.status === 'connected') {
                addMessage('system', message.message);
            } else if (message.status === 'disconnected') {
                addMessage('system', 'Disconnected from Azure OpenAI');
                disconnect();
            }
            break;

        case 'session.created':
            console.log('Client: Session created:', message.session);
            addMessage('system', 'Session created! Configuring...');
            // Initialize session configuration
            initializeSession();
            break;

        case 'session.updated':
            console.log('Client: Session updated');
            addMessage('system', 'Session ready! You can now start recording.');
            break;

        case 'conversation.item.created':
            console.log('Client: Conversation item created');
            break;

        case 'input_audio_buffer.speech_started':
            addMessage('system', 'Speech detected...');
            break;

        case 'input_audio_buffer.speech_stopped':
            console.log('Client: Speech stopped');
            break;

        case 'input_audio_buffer.committed':
            console.log('Client: Audio buffer committed');
            break;

        case 'conversation.item.input_audio_transcription.completed':
            if (message.transcript) {
                addMessage('user', message.transcript);
            }
            break;

        case 'response.created':
            console.log('Client: Response created');
            break;

        case 'response.output_item.added':
            console.log('Client: Output item added');
            break;

        case 'response.content_part.added':
            console.log('Client: Content part added');
            break;

        case 'response.audio_transcript.delta':
            // Handle streaming transcript
            break;

        case 'response.audio.delta':
            if (message.delta) {
                await playAudio(message.delta);
            }
            break;

        case 'response.audio_transcript.done':
            if (message.transcript) {
                addMessage('assistant', message.transcript);
            }
            break;

        case 'response.done':
            console.log('Client: Response completed');
            break;

        case 'error':
            console.error('Client: Error from server:', message);
            addMessage('error', message.message || 'An error occurred');
            break;

        default:
            console.log('Client: Unhandled message type:', message.type);
    }
}

// Helper Functions
function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

function updateStatus(status, text) {
    statusDot.className = 'status-dot ' + status;
    statusText.textContent = text;
}

function addMessage(type, content) {
    // Remove empty state if present
    const emptyState = transcript.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    
    const headerEl = document.createElement('div');
    headerEl.className = 'message-header';
    headerEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;
    
    messageEl.appendChild(headerEl);
    messageEl.appendChild(contentEl);
    transcript.appendChild(messageEl);
    
    // Scroll to bottom
    transcript.scrollTop = transcript.scrollHeight;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
