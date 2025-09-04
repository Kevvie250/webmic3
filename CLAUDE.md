# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple Electron app that helps you save time during phone calls. When you call into a voice dating service and hear someone's voicemail, you can record it, send it to AI for a response, then play that response back into the call.

**Goal:** Save time by automating phone call responses instead of thinking of what to say manually.

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm start            # Launch the Electron application
npm run build        # Build application with electron-builder
npm run dist         # Build distribution package
```

### Running the Application
```bash
node setup.js        # Initialize project files (if needed)
npm start            # Start the Electron app
```

## Architecture

### Core Files Structure
- `main.js` - Electron main process, handles window creation and IPC communication
- `index.html` - Single-page application UI with embedded CSS and JavaScript
- `preload.js` - Electron preload script for secure IPC communication
- `setup.js` - Project initialization script that creates all necessary files

### How It Works

The app has three simple parts:
- **main.js** - Opens the window and saves files
- **index.html** - The recording interface you see and use
- **preload.js** - Connects the interface to file saving

### What It Does
- **Record voicemails** clearly without background noise
- **Send to AI** for automatic response generation  
- **Play responses back** when you're ready
- **Keep track** of your recordings

### External Dependencies
- **Transcription Service:** `https://n8n.thegroundeffect.com/webhook/voice-chat-audio`
- **Audio Formats Supported:** MP3, WAV, WebM, M4A
- **Recording Format:** WebM audio

### Settings and Data Storage
- Settings stored as JSON in `app.getPath('userData')/settings.json`
- Recordings saved to `app.getPath('userData')/recordings/` directory
- Device preferences persist across application sessions

## Simple Workflow
1. **Call** the PBX voice dating service
2. **Record** what you hear (their voicemail)
3. **Send** it to AI for processing  
4. **Play** the AI response back into the call
5. **Done** - saved you time writing a response

## Setup Requirements

**What you're actually doing:** Making outbound calls to a PBX voice dating service, recording what you hear, then playing responses back into the same call.

**Why virtual audio cables (for now):** Your computer can't normally record "what's playing through speakers" during a phone call. Virtual audio cables are the simplest solution we found to capture call audio cleanly.

**Note:** If there's ever an easier way to record phone calls directly, we'd prefer that. Virtual cables are just the current workaround for this technical limitation.