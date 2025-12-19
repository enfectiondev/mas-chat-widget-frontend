# Voice Input Component

## Overview
The VoiceInput component enables users to speak their messages instead of typing. It uses OpenAI's Whisper API to convert speech to text.

## Setup

### 1. Create .env File
Create a `.env` file in the project root with your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Security Warning
⚠️ **IMPORTANT**: Storing API keys in frontend code is a security risk. Even with obfuscation, the key can be extracted from the compiled JavaScript.

**For Production:**
- Use a backend proxy to handle API calls
- Never expose your API key in frontend code
- Consider using environment-specific keys with usage limits

### 3. How It Works
1. User clicks the microphone button
2. Browser requests microphone access
3. Audio is recorded using Web Audio API
4. Audio is sent to OpenAI Whisper API for transcription
5. Transcribed text is inserted into the chat input field

## Usage

The component is already integrated into `MasChatWidget.js`. It appears as a microphone button in the chat input area.

### Props
- `onTranscript`: Callback function called when transcription is complete
- `onError`: Callback function called when an error occurs
- `disabled`: Boolean to disable the button

## Browser Compatibility
- Requires microphone access permission
- Works in modern browsers (Chrome, Firefox, Safari, Edge)
- Uses WebM audio format for recording

## Troubleshooting

### "Microphone access denied"
- Check browser permissions for microphone access
- Ensure HTTPS (required for microphone access in most browsers)

### "API key not found"
- Verify `.env` file exists in project root
- Check that `OPENAI_API_KEY` is set correctly
- Rebuild the project after creating/updating `.env`

### "Failed to process audio"
- Check your OpenAI API key is valid
- Verify you have API credits available
- Check network connectivity

