const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// Disable hardware acceleration to fix GPU errors
app.disableHardwareAcceleration();

// Also add command line switches for better compatibility
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 720,
        height: 1000,  // Increased height
        minWidth: 700,  // Minimum width
        minHeight: 950, // Minimum height to ensure all content is visible
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // Additional flags for stability
            webgl: false,
            experimentalFeatures: false
        },
        resizable: true,  // Now resizable with constraints
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
});
