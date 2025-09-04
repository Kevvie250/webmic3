const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveRecording: (audioBuffer, filename) => 
        ipcRenderer.invoke('save-recording', audioBuffer, filename),
    selectAudioFile: () => 
        ipcRenderer.invoke('select-audio-file'),
    saveSettings: (settings) => 
        ipcRenderer.invoke('save-settings', settings),
    loadSettings: () => 
        ipcRenderer.invoke('load-settings')
});
