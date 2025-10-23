// WebSocket connection
let ws = null;
let audioContext = null;
let mediaStream = null;

// UI Elements
const connectBtn = document.getElementById('connectBtn');
const micBtn = document.getElementById('micBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');

// Connect to server
connectBtn.addEventListener('click', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        return;
    }

    ws = new WebSocket(`ws://${window.location.host}`);

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
            addMessage('assistant', msg.delta);
            break;

        case 'conversation.item.input_audio_transcription.completed':
            addMessage('user', msg.transcript);
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
    transcriptEl.appendChild(msgEl);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

function clearTranscript() {
    transcriptEl.innerHTML = '';
}
