# Text-to-Speech Service Implementation

## Overview

The Text-to-Speech (TTS) service for Sahaay AI provides voice synthesis capabilities with both local and cloud-based engines, supporting all 5 required Indian languages with audio compression for low-bandwidth scenarios.

## Architecture

### Dual Engine Approach

The TTS service implements a dual-engine architecture:

1. **Local TTS Engine**: Lightweight models for offline synthesis
   - Supports English and Hindi currently
   - Fast processing with minimal latency
   - Works without internet connectivity
   - Lower quality but reliable fallback

2. **Cloud TTS Provider**: High-quality natural voice generation
   - Supports all 5 languages (English, Hindi, Tamil, Telugu, Bengali)
   - Natural-sounding voices with multiple options
   - Higher latency but superior quality
   - Requires internet connectivity

### Fallback Strategy

The service implements intelligent fallback:
1. **Primary**: Local TTS (if preferred and language supported)
2. **Secondary**: Cloud TTS (if available and configured)
3. **Final**: Local TTS (even if not preferred, for basic functionality)

## Features

### Language Support

- **English (en)**: Full local and cloud support
- **Hindi (hi)**: Full local and cloud support  
- **Tamil (ta)**: Cloud support only
- **Telugu (te)**: Cloud support only
- **Bengali (bn)**: Cloud support only

### Voice Profiles

Each language supports multiple voice profiles:
- **Gender**: Male, Female, Neutral
- **Speed**: 0.5x to 2.0x (adjustable speech rate)
- **Pitch**: 0.5x to 2.0x (adjustable voice pitch)

### Audio Compression

Built-in audio compression for low-bandwidth scenarios:
- **Quality Levels**: 1-10 (1 = highest compression, 10 = lowest compression)
- **Format Conversion**: WAV to MP3 for better compression
- **Sample Rate Reduction**: Adaptive based on quality level
- **Bandwidth Optimization**: Automatic compression when enabled

### SSML Support

Basic SSML (Speech Synthesis Markup Language) support:
- Strips SSML tags for current implementation
- Foundation for future enhanced speech control
- Maintains compatibility with SSML-enabled clients

## Configuration

### TTS Service Configuration

```typescript
interface TTSConfig {
  preferLocalTTS: boolean;        // Prefer local over cloud
  enableCloudTTS: boolean;        // Enable cloud TTS provider
  defaultVoiceProfile: VoiceProfile; // Default voice settings
  audioFormat: AudioFormat;       // Output audio format
  sampleRate: number;            // Audio sample rate
  enableCompression: boolean;     // Enable audio compression
  cloudTTSApiKey?: string;       // Cloud service API key
  cloudTTSEndpoint?: string;     // Cloud service endpoint
}
```

### Default Configuration

- **Prefer Local TTS**: `true` (offline-first approach)
- **Enable Cloud TTS**: `true` (for better quality when available)
- **Audio Format**: `wav` (local), `mp3` (cloud/compressed)
- **Sample Rate**: `22050` Hz (local), `44100` Hz (cloud)
- **Compression**: Enabled by default

## Usage Examples

### Basic Text Synthesis

```typescript
const ttsService = new TextToSpeechServiceImpl();

// Synthesize text in Hindi
const audioBlob = await ttsService.synthesize(
  "नमस्ते, आपका स्वागत है", 
  'hi'
);
```

### Custom Voice Profile

```typescript
const customVoice: VoiceProfile = {
  language: 'en',
  gender: 'female',
  speed: 0.9,    // Slightly slower
  pitch: 1.1     // Slightly higher pitch
};

const audioBlob = await ttsService.synthesize(
  "Welcome to Sahaay AI",
  'en',
  customVoice
);
```

### Audio Compression

```typescript
// Synthesize and compress for low bandwidth
const originalAudio = await ttsService.synthesize(text, 'hi');
const compressedAudio = await ttsService.compressAudio(originalAudio, 3);
```

### SSML Synthesis

```typescript
const ssmlText = '<speak>Hello <break time="1s"/> world!</speak>';
const audioBlob = await ttsService.synthesizeWithSSML(ssmlText, 'en');
```

## Integration with Voice Interface

The TTS service integrates seamlessly with the Voice Interface:

```typescript
const voiceInterface = new VoiceInterfaceImpl();

// Convert text to speech through voice interface
const audioBlob = await voiceInterface.convertTextToSpeech(
  "आपकी योजना की जानकारी यहाँ है",
  'hi'
);
```

## Error Handling

The service implements comprehensive error handling:

- **Language Not Supported**: Clear error messages with supported language list
- **Service Unavailable**: Automatic fallback to alternative engines
- **Network Issues**: Graceful degradation to local TTS
- **Invalid Input**: Validation with helpful error messages

## Performance Characteristics

### Local TTS Engine
- **Latency**: 50-100ms per character
- **Quality**: Basic but clear
- **Resource Usage**: Low CPU, minimal memory
- **Offline**: Fully functional

### Cloud TTS Provider
- **Latency**: 30-80ms per character + network latency
- **Quality**: High-quality natural voices
- **Resource Usage**: Network bandwidth dependent
- **Online**: Requires internet connectivity

### Audio Compression
- **Compression Ratio**: 30-95% size reduction
- **Quality Loss**: Minimal at levels 6-10
- **Processing Time**: <100ms for typical responses

## Testing

The implementation includes comprehensive test coverage:

- **Unit Tests**: 28 test cases covering all functionality
- **Integration Tests**: Voice interface integration
- **Error Scenarios**: Comprehensive error handling validation
- **Multilingual Tests**: All 5 supported languages
- **Performance Tests**: Compression and synthesis timing

## Future Enhancements

### Planned Improvements

1. **Enhanced Local Support**: Add Tamil, Telugu, Bengali local models
2. **Advanced SSML**: Full SSML markup support with prosody control
3. **Voice Cloning**: Custom voice profile generation
4. **Streaming TTS**: Real-time audio streaming for long texts
5. **Emotion Control**: Emotional voice synthesis capabilities
6. **Caching**: Intelligent audio caching for repeated phrases

### Integration Opportunities

1. **Government Scheme Database**: Pre-synthesized common responses
2. **User Preferences**: Personalized voice settings storage
3. **Analytics**: Voice usage patterns and optimization
4. **A/B Testing**: Voice quality and preference testing

## Compliance and Accessibility

The TTS service supports accessibility requirements:

- **Screen Reader Compatibility**: Standard audio output formats
- **Hearing Impaired Support**: Visual feedback integration ready
- **Low Bandwidth Support**: Automatic compression and quality adjustment
- **Offline Functionality**: Core features work without internet

## Monitoring and Metrics

Key metrics tracked:

- **Synthesis Success Rate**: Per language and engine
- **Average Latency**: Response time measurements
- **Compression Efficiency**: Size reduction vs. quality metrics
- **Fallback Usage**: Local vs. cloud engine utilization
- **Error Rates**: By error type and language

This implementation provides a robust foundation for voice output in the Sahaay AI system, ensuring accessibility and reliability across diverse network conditions and user needs.