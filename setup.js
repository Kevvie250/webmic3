const fs = require('fs');
const path = require('path');

// Create all necessary files
const files = {
  'package.json': `{
  "name": "audio-control-panel",
  "version": "1.0.0",
  "description": "Virtual Audio Cable Control Panel",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "dist": "electron-builder --publish=never"
  },
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4"
  },
  "build": {
    "appId": "com.yourcompany.audiocontrol",
    "productName": "Audio Control Panel",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "nsis"
    }
  }
}`,

  'main.js': `const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 700,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        resizable: false,
        backgroundColor: '#667eea'
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    
    // Create recordings directory
    const recordingsDir = path.join(app.getPath('userData'), 'recordings');
    fs.mkdir(recordingsDir, { recursive: true }).catch(console.error);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// Save recording to disk
ipcMain.handle('save-recording', async (event, audioBuffer, filename) => {
    try {
        const recordingsDir = path.join(app.getPath('userData'), 'recordings');
        const filepath = path.join(recordingsDir, filename);
        await fs.writeFile(filepath, Buffer.from(audioBuffer));
        return { success: true, path: filepath };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Open file picker
ipcMain.handle('select-audio-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['mp3', 'wav', 'webm', 'm4a'] }
        ]
    });
    return result.canceled ? null : result.filePaths[0];
});

// Save/load settings
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-settings', async () => {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        const data = await fs.readFile(settingsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { recordingDevice: '', playbackDevice: '' };
    }
});`,

  'preload.js': `const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveRecording: (audioBuffer, filename) => 
        ipcRenderer.invoke('save-recording', audioBuffer, filename),
    selectAudioFile: () => 
        ipcRenderer.invoke('select-audio-file'),
    saveSettings: (settings) => 
        ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => 
        ipcRenderer.invoke('load-settings')
});`,

  'index.html': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Audio Control Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 30px;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
        }
        .section {
            margin-bottom: 25px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        .device-selector {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
        }
        select {
            flex: 1;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            background: white;
        }
        .audio-meter {
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
            margin-bottom: 5px;
        }
        .audio-level {
            height: 100%;
            background: linear-gradient(90deg, #4ade80 0%, #fbbf24 70%, #ef4444 100%);
            border-radius: 15px;
            transition: width 0.1s ease-out;
            width: 0%;
        }
        .btn {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 10px;
        }
        .btn-record {
            background: #ef4444;
            color: white;
        }
        .btn-record.recording {
            background: #991b1b;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .btn-play {
            background: #10b981;
            color: white;
        }
        .btn-transcribe {
            background: #8b5cf6;
            color: white;
        }
        .status {
            padding: 15px;
            background: #f0f9ff;
            border-left: 4px solid #3b82f6;
            border-radius: 5px;
            font-size: 14px;
            color: #1e40af;
            margin-top: 20px;
        }
        .status.error {
            background: #fef2f2;
            border-left-color: #ef4444;
            color: #991b1b;
        }
        .status.success {
            background: #f0fdf4;
            border-left-color: #10b981;
            color: #166534;
        }
        input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .recording-indicator {
            display: none;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #fee2e2;
            border-radius: 8px;
            margin-top: 15px;
        }
        .recording-indicator.active {
            display: flex;
        }
        .recording-dot {
            width: 12px;
            height: 12px;
            background: #ef4444;
            border-radius: 50%;
            animation: blink 1s infinite;
        }
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎙️ Audio Control Panel</h1>
        
        <div class="section">
            <div class="section-title">Recording Device (Virtual Cable Output)</div>
            <div class="device-selector">
                <select id="recordingDevice">
                    <option value="">Select recording device...</option>
                </select>
                <button class="btn" style="width: auto; padding: 10px 15px;" onclick="refreshDevices()">🔄</button>
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Input Level:</div>
            <div class="audio-meter">
                <div class="audio-level" id="recordingLevel"></div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Playback Device (Virtual Cable Input)</div>
            <select id="playbackDevice" style="width: 100%; margin-bottom: 10px;">
                <option value="">Select playback device...</option>
            </select>
            <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Output Level:</div>
            <div class="audio-meter">
                <div class="audio-level" id="playbackLevel"></div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Recording</div>
            <button class="btn btn-record" id="recordBtn" onclick="toggleRecording()">
                Start Recording
            </button>
            <div class="recording-indicator" id="recordingIndicator">
                <div class="recording-dot"></div>
                <span>Recording...</span>
                <span id="recordingTimer">00:00</span>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Playback</div>
            <input type="text" id="audioUrl" placeholder="Paste ElevenLabs URL (or leave empty to select file)">
            <button class="btn btn-play" onclick="playAudio()">Play Audio</button>
        </div>
        
        <div class="section">
            <div class="section-title">Transcription</div>
            <button class="btn btn-transcribe" onclick="transcribeLastRecording()">
                Send to Transcription
            </button>
        </div>
        
        <div class="status" id="status">Ready. Select your audio devices to begin.</div>
    </div>

    <script>
        let mediaRecorder = null;
        let recordedChunks = [];
        let isRecording = false;
        let recordingStartTime = null;
        let recordingInterval = null;
        let lastRecordingPath = null;
        let audioContext = null;
        let inputAnalyser = null;
        let inputStream = null;
        
        // Initialize
        window.addEventListener('DOMContentLoaded', async () => {
            await refreshDevices();
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Load saved settings
            if (window.electronAPI) {
                const settings = await window.electronAPI.loadSettings();
                if (settings.recordingDevice) {
                    document.getElementById('recordingDevice').value = settings.recordingDevice;
                }
                if (settings.playbackDevice) {
                    document.getElementById('playbackDevice').value = settings.playbackDevice;
                }
            }
        });
        
        // Refresh devices
        async function refreshDevices() {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const recordingSelect = document.getElementById('recordingDevice');
                const playbackSelect = document.getElementById('playbackDevice');
                
                recordingSelect.innerHTML = '<option value="">Select recording device...</option>';
                playbackSelect.innerHTML = '<option value="">Select playback device...</option>';
                
                devices.filter(d => d.kind === 'audioinput').forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || 'Microphone ' + device.deviceId.substr(0, 5);
                    recordingSelect.appendChild(option);
                });
                
                devices.filter(d => d.kind === 'audiooutput').forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || 'Speaker ' + device.deviceId.substr(0, 5);
                    playbackSelect.appendChild(option);
                });
                
                updateStatus('Devices refreshed', 'success');
            } catch (error) {
                updateStatus('Error: ' + error.message, 'error');
            }
        }
        
        // Monitor input levels
        document.getElementById('recordingDevice').addEventListener('change', async (e) => {
            const deviceId = e.target.value;
            if (!deviceId) return;
            
            try {
                if (inputStream) {
                    inputStream.getTracks().forEach(track => track.stop());
                }
                
                inputStream = await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId: { exact: deviceId } }
                });
                
                const source = audioContext.createMediaStreamSource(inputStream);
                inputAnalyser = audioContext.createAnalyser();
                inputAnalyser.fftSize = 256;
                source.connect(inputAnalyser);
                
                monitorInputLevel();
                updateStatus('Recording device connected', 'success');
                
                // Save settings
                if (window.electronAPI) {
                    await window.electronAPI.saveSettings({
                        recordingDevice: deviceId,
                        playbackDevice: document.getElementById('playbackDevice').value
                    });
                }
            } catch (error) {
                updateStatus('Error: ' + error.message, 'error');
            }
        });
        
        function monitorInputLevel() {
            if (!inputAnalyser) return;
            const dataArray = new Uint8Array(inputAnalyser.frequencyBinCount);
            inputAnalyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const percentage = Math.min(100, (average / 128) * 100);
            document.getElementById('recordingLevel').style.width = percentage + '%';
            requestAnimationFrame(monitorInputLevel);
        }
        
        // Recording functions
        async function toggleRecording() {
            if (!isRecording) {
                startRecording();
            } else {
                stopRecording();
            }
        }
        
        async function startRecording() {
            const deviceId = document.getElementById('recordingDevice').value;
            if (!deviceId) {
                updateStatus('Please select a recording device', 'error');
                return;
            }
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { deviceId: { exact: deviceId } }
                });
                
                mediaRecorder = new MediaRecorder(stream);
                recordedChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = saveRecording;
                mediaRecorder.start();
                isRecording = true;
                recordingStartTime = Date.now();
                
                document.getElementById('recordBtn').textContent = 'Stop Recording';
                document.getElementById('recordBtn').classList.add('recording');
                document.getElementById('recordingIndicator').classList.add('active');
                
                recordingInterval = setInterval(updateRecordingTimer, 100);
                updateStatus('Recording started', 'success');
            } catch (error) {
                updateStatus('Error: ' + error.message, 'error');
            }
        }
        
        function stopRecording() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
                isRecording = false;
                clearInterval(recordingInterval);
                
                document.getElementById('recordBtn').textContent = 'Start Recording';
                document.getElementById('recordBtn').classList.remove('recording');
                document.getElementById('recordingIndicator').classList.remove('active');
                
                updateStatus('Recording stopped', 'success');
            }
        }
        
        function updateRecordingTimer() {
            if (!recordingStartTime) return;
            const elapsed = Date.now() - recordingStartTime;
            const seconds = Math.floor(elapsed / 1000) % 60;
            const minutes = Math.floor(elapsed / 60000);
            document.getElementById('recordingTimer').textContent = 
                minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
        }
        
        async function saveRecording() {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = 'recording_' + timestamp + '.webm';
            
            if (window.electronAPI) {
                const arrayBuffer = await blob.arrayBuffer();
                const result = await window.electronAPI.saveRecording(arrayBuffer, filename);
                if (result.success) {
                    lastRecordingPath = result.path;
                    updateStatus('Recording saved: ' + filename, 'success');
                } else {
                    updateStatus('Error saving: ' + result.error, 'error');
                }
            } else {
                lastRecordingPath = URL.createObjectURL(blob);
                updateStatus('Recording saved (in memory)', 'success');
            }
            
            window.lastRecordingBlob = blob;
        }
        
        // Playback
        async function playAudio() {
            const urlInput = document.getElementById('audioUrl').value;
            const deviceId = document.getElementById('playbackDevice').value;
            
            if (!deviceId) {
                updateStatus('Please select a playback device', 'error');
                return;
            }
            
            try {
                let audioUrl = urlInput;
                
                if (!audioUrl && window.electronAPI) {
                    const filepath = await window.electronAPI.selectAudioFile();
                    if (!filepath) return;
                    audioUrl = 'file://' + filepath;
                }
                
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    if (audio.setSinkId) {
                        await audio.setSinkId(deviceId);
                    }
                    audio.play();
                    updateStatus('Playing audio...', 'success');
                    
                    // Simple level visualization
                    audio.addEventListener('play', () => {
                        const interval = setInterval(() => {
                            if (audio.paused || audio.ended) {
                                clearInterval(interval);
                                document.getElementById('playbackLevel').style.width = '0%';
                            } else {
                                const level = 30 + Math.random() * 40;
                                document.getElementById('playbackLevel').style.width = level + '%';
                            }
                        }, 100);
                    });
                }
            } catch (error) {
                updateStatus('Error: ' + error.message, 'error');
            }
        }
        
        // Transcription
        async function transcribeLastRecording() {
            if (!window.lastRecordingBlob) {
                updateStatus('No recording to transcribe', 'error');
                return;
            }
            
            try {
                updateStatus('Sending to transcription...', 'info');
                const formData = new FormData();
                formData.append('audio', window.lastRecordingBlob, 'recording.webm');
                
                const response = await fetch('https://n8n.thegroundeffect.com/webhook/voice-chat-audio', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    updateStatus('Transcription sent successfully', 'success');
                } else {
                    updateStatus('Transcription failed: ' + response.statusText, 'error');
                }
            } catch (error) {
                updateStatus('Error: ' + error.message, 'error');
            }
        }
        
        function updateStatus(message, type = 'info') {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.className = 'status';
            if (type === 'error' || type === 'success') {
                statusEl.classList.add(type);
            }
        }
    </script>
</body>
</html>`
};

// Write all files
Object.entries(files).forEach(([filename, content]) => {
    fs.writeFileSync(filename, content);
    console.log(\`Created: \${filename}\`);
});

console.log('\\nSetup complete! Now run:\\n  npm install\\n  npm start');
`;

// Write the setup script
fs.writeFileSync('setup.js', files['setup.js']);
console.log('Setup script created! Run: node setup.js');
