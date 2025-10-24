// WebSocket connection
let ws = null;
let audioContext = null;
let mediaStream = null;

// UI Elements
const connectBtn = document.getElementById('connectBtn');
const micBtn = document.getElementById('micBtn');
const clearBtn = document.getElementById('clearBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');

// Connect to server
connectBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        return;
    }

    ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
        console.log('WebSocket connected');
        statusEl.textContent = 'Connecting to Azure...';
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log('Received:', msg.type);
        handleMessage(msg);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addMessage('error', 'Connection error');
    };

    ws.onclose = () => {
        console.log('WebSocket closed');
        statusEl.textContent = 'Disconnected';
        statusEl.classList.remove('connected');
        connectBtn.textContent = 'Connect';
        micBtn.disabled = true;
    };
});

// Clear transcript button
clearBtn.addEventListener('click', () => {
    if (confirm('Clear the conversation transcript?')) {
        clearTranscript();
    }
});

// Handle messages from server
function handleMessage(msg) {
    switch (msg.type) {
        case 'connection':
            if (msg.status === 'connected') {
                statusEl.textContent = 'Connected';
                statusEl.classList.add('connected');
                connectBtn.textContent = 'Disconnect';
                micBtn.disabled = false;
                clearTranscript();
                addMessage('info', 'Connected! Waiting for session...');
            }
            break;

        case 'session.created':
            addMessage('info', `Session started: ${msg.session.id}`);
            // Send session config
            sendSessionConfig();
            break;

        case 'session.updated':
            addMessage('info', 'Session configured successfully!');
            break;

        case 'error':
            addMessage('error', msg.error?.message || msg.message || 'An error occurred');
            break;

        case 'response.audio_transcript.delta':
            // Accumulate assistant transcript deltas
            if (!window.currentAssistantMessage) {
                window.currentAssistantMessage = '';
                showTypingIndicator();
            }
            window.currentAssistantMessage += msg.delta;
            updateOrAddMessage('assistant', window.currentAssistantMessage);
            break;

        case 'response.audio_transcript.done':
            // Finalize assistant message
            hideTypingIndicator();
            if (window.currentAssistantMessage) {
                finalizeMessage('assistant', window.currentAssistantMessage);
                window.currentAssistantMessage = '';
            }
            break;

        case 'conversation.item.input_audio_transcription.completed':
            addMessage('user', msg.transcript);
            break;

        case 'conversation.item.input_audio_transcription.failed':
            addMessage('error', 'Failed to transcribe audio');
            break;

        case 'response.done':
            // Add a separator after AI response is complete
            hideTypingIndicator();
            if (window.currentAssistantMessage) {
                finalizeMessage('assistant', window.currentAssistantMessage);
                window.currentAssistantMessage = '';
            }
            break;
    }
}

// Send session configuration
function sendSessionConfig() {
    const config = {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            voice: 'alloy',
            instructions: 'You are a helpful assistant.',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
                model: 'whisper-1'
            },
            turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 200
            }
        }
    };

    console.log('Sending session config');
    ws.send(JSON.stringify(config));
}

// Microphone handling
micBtn.addEventListener('click', async () => {
    if (mediaStream) {
        stopRecording();
        return;
    }

    try {
        await startRecording();
    } catch (error) {
        console.error('Microphone error:', error);
        addMessage('error', 'Failed to access microphone');
    }
});

async function startRecording() {
    audioContext = new AudioContext({ sampleRate: 24000 });
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const source = audioContext.createMediaStreamSource(mediaStream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = convertToPCM16(inputData);
            
            ws.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: arrayBufferToBase64(pcm16)
            }));
        }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    micBtn.textContent = 'Stop Recording';
    micBtn.classList.add('recording');
    addMessage('info', 'Recording...');
}

function stopRecording() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    micBtn.textContent = 'Start Recording';
    micBtn.classList.remove('recording');
    addMessage('info', 'Recording stopped');
}

// Audio conversion helpers
function convertToPCM16(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// UI helpers
function addMessage(type, text) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${type}`;
    msgEl.textContent = text;
    msgEl.setAttribute('data-message-id', Date.now());
    transcriptEl.appendChild(msgEl);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function updateOrAddMessage(type, text) {
    // Find the last message of this type or create a new one
    const lastMessage = transcriptEl.querySelector(`.message.${type}:last-child`);
    if (lastMessage && !lastMessage.hasAttribute('data-finalized')) {
        lastMessage.textContent = text;
    } else {
        const msgEl = document.createElement('div');
        msgEl.className = `message ${type}`;
        msgEl.textContent = text;
        msgEl.setAttribute('data-message-id', Date.now());
        transcriptEl.appendChild(msgEl);
    }
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function finalizeMessage(type, text) {
    const lastMessage = transcriptEl.querySelector(`.message.${type}:last-child`);
    if (lastMessage) {
        lastMessage.textContent = text;
        lastMessage.setAttribute('data-finalized', 'true');
    }
}

function clearTranscript() {
    transcriptEl.innerHTML = '<p class="info">Connected! Start speaking...</p>';
    window.currentAssistantMessage = '';
}

function showTypingIndicator() {
    hideTypingIndicator(); // Remove any existing indicator
    const indicator = document.createElement('div');
    indicator.className = 'message assistant typing-indicator';
    indicator.innerHTML = '<span class="typing-dots">AI is responding<span class="dots">...</span></span>';
    indicator.setAttribute('data-typing', 'true');
    transcriptEl.appendChild(indicator);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = transcriptEl.querySelector('[data-typing="true"]');
    if (indicator) {
        indicator.remove();
    }
}
