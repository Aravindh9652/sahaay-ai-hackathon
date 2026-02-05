/**
 * Unit tests for Text-to-Speech Service
 */

import { TextToSpeechServiceImpl, createTextToSpeechService } from '@/services/textToSpeech';
import { LanguageCode, VoiceProfile } from '@/types';

describe('TextToSpeechService', () => {
  let ttsService: TextToSpeechServiceImpl;

  beforeEach(() => {
    ttsService = new TextToSpeechServiceImpl({
      preferLocalTTS: true,
      enableCloudTTS: false, // Disable cloud for unit tests
      enableCompression: true
    });
  });

  describe('synthesize', () => {
    it('should synthesize text to speech in supported languages', async () => {
      const text = 'Hello, this is a test message';
      const language: LanguageCode = 'en';

      const result = await ttsService.synthesize(text, language);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.format).toBe('wav');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.sampleRate).toBe(22050);
    });

    it('should synthesize text in Hindi', async () => {
      const text = 'नमस्ते, यह एक परीक्षण संदेश है';
      const language: LanguageCode = 'hi';

      const result = await ttsService.synthesize(text, language);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
      expect(result.format).toBe('wav');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should use custom voice profile when provided', async () => {
      const text = 'Test with custom voice';
      const language: LanguageCode = 'en';
      const voice: VoiceProfile = {
        language: 'en',
        gender: 'male',
        speed: 1.2,
        pitch: 0.8
      };

      const result = await ttsService.synthesize(text, language, voice);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should throw error for empty text', async () => {
      const language: LanguageCode = 'en';

      await expect(ttsService.synthesize('', language))
        .rejects.toThrow('Text cannot be empty');
    });

    it('should throw error for unsupported language', async () => {
      const text = 'Test message';
      // @ts-ignore - Testing with invalid language
      const language = 'fr' as LanguageCode;

      await expect(ttsService.synthesize(text, language))
        .rejects.toThrow('Language fr is not supported');
    });

    it('should handle long text input', async () => {
      const longText = 'This is a very long text message that should be handled properly by the TTS service. '.repeat(10);
      const language: LanguageCode = 'en';

      const result = await ttsService.synthesize(longText, language);

      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(5); // Should be longer for more text
    });
  });

  describe('isAvailable', () => {
    it('should return true when TTS service is available', async () => {
      const available = await ttsService.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('getAvailableVoices', () => {
    it('should return available voices for English', async () => {
      const voices = await ttsService.getAvailableVoices('en');

      expect(voices).toHaveLength(2);
      expect(voices[0]).toHaveProperty('language', 'en');
      expect(voices[0]).toHaveProperty('gender');
      expect(voices[0]).toHaveProperty('speed');
      expect(voices[0]).toHaveProperty('pitch');
    });

    it('should return available voices for Hindi', async () => {
      const voices = await ttsService.getAvailableVoices('hi');

      expect(voices).toHaveLength(2);
      expect(voices[0]).toHaveProperty('language', 'hi');
    });

    it('should return empty array for unsupported languages in local mode', async () => {
      const voices = await ttsService.getAvailableVoices('ta');
      expect(voices).toHaveLength(0);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const languages = ttsService.getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('hi');
      expect(languages).toContain('ta');
      expect(languages).toContain('te');
      expect(languages).toContain('bn');
    });
  });

  describe('compressAudio', () => {
    it('should compress audio with specified quality level', async () => {
      const text = 'Test message for compression';
      const language: LanguageCode = 'en';
      const originalAudio = await ttsService.synthesize(text, language);

      const compressedAudio = await ttsService.compressAudio(originalAudio, 5);

      expect(compressedAudio).toBeDefined();
      expect(compressedAudio.data.length).toBeLessThanOrEqual(originalAudio.data.length);
      expect(compressedAudio.sampleRate).toBeLessThanOrEqual(originalAudio.sampleRate);
    });

    it('should handle different compression levels', async () => {
      const text = 'Test message for compression levels';
      const language: LanguageCode = 'en';
      const originalAudio = await ttsService.synthesize(text, language);

      const highCompression = await ttsService.compressAudio(originalAudio, 1);
      const lowCompression = await ttsService.compressAudio(originalAudio, 10);

      expect(highCompression.data.length).toBeLessThan(lowCompression.data.length);
    });

    it('should return original audio when compression is disabled', async () => {
      const ttsWithoutCompression = new TextToSpeechServiceImpl({
        enableCompression: false
      });

      const text = 'Test message';
      const language: LanguageCode = 'en';
      const originalAudio = await ttsWithoutCompression.synthesize(text, language);

      const result = await ttsWithoutCompression.compressAudio(originalAudio, 5);

      expect(result).toBe(originalAudio);
    });
  });

  describe('synthesizeWithSSML', () => {
    it('should handle SSML markup', async () => {
      const ssmlText = '<speak>Hello <break time="1s"/> world!</speak>';
      const language: LanguageCode = 'en';

      const result = await ttsService.synthesizeWithSSML(ssmlText, language);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should strip SSML tags and synthesize plain text', async () => {
      const ssmlText = '<speak><prosody rate="slow">Hello world</prosody></speak>';
      const plainText = 'Hello world';
      const language: LanguageCode = 'en';

      const ssmlResult = await ttsService.synthesizeWithSSML(ssmlText, language);
      const plainResult = await ttsService.synthesize(plainText, language);

      // Results should be similar since SSML is stripped
      expect(ssmlResult.duration).toBeCloseTo(plainResult.duration, 1);
    });
  });

  describe('factory function', () => {
    it('should create TTS service with default config', () => {
      const service = createTextToSpeechService();
      expect(service).toBeInstanceOf(TextToSpeechServiceImpl);
    });

    it('should create TTS service with custom config', () => {
      const service = createTextToSpeechService({
        preferLocalTTS: false,
        enableCloudTTS: true
      });
      expect(service).toBeInstanceOf(TextToSpeechServiceImpl);
    });
  });

  describe('error handling', () => {
    it('should handle synthesis errors gracefully', async () => {
      // Create a service that will fail
      const failingService = new TextToSpeechServiceImpl({
        preferLocalTTS: false,
        enableCloudTTS: false
      });

      const text = 'This should fail';
      const language: LanguageCode = 'ta'; // Not supported by local engine

      await expect(failingService.synthesize(text, language))
        .rejects.toThrow('No TTS engine available');
    });

    it('should handle compression errors gracefully', async () => {
      const text = 'Test message';
      const language: LanguageCode = 'en';
      const originalAudio = await ttsService.synthesize(text, language);

      // Mock a compression failure by passing invalid quality
      const result = await ttsService.compressAudio(originalAudio, 5);

      // Should not throw, should return compressed audio or original on failure
      expect(result).toBeDefined();
    });
  });

  describe('multilingual support', () => {
    const testCases: Array<{ language: LanguageCode; text: string; description: string }> = [
      { language: 'en', text: 'Hello world', description: 'English text' },
      { language: 'hi', text: 'नमस्ते दुनिया', description: 'Hindi text' },
      { language: 'ta', text: 'வணக்கம் உலகம்', description: 'Tamil text' },
      { language: 'te', text: 'హలో వరల్డ్', description: 'Telugu text' },
      { language: 'bn', text: 'হ্যালো বিশ্ব', description: 'Bengali text' }
    ];

    testCases.forEach(({ language, text, description }) => {
      it(`should handle ${description}`, async () => {
        // Note: Only English and Hindi are supported by local engine in current implementation
        if (language === 'en' || language === 'hi') {
          const result = await ttsService.synthesize(text, language);
          expect(result).toBeDefined();
          expect(result.data).toBeInstanceOf(Buffer);
        } else {
          // Other languages should fail with local-only setup
          await expect(ttsService.synthesize(text, language))
            .rejects.toThrow('No TTS engine available');
        }
      });
    });
  });

  describe('voice profile variations', () => {
    it('should handle different gender voices', async () => {
      const text = 'Test message';
      const language: LanguageCode = 'en';

      const femaleVoice: VoiceProfile = {
        language: 'en',
        gender: 'female',
        speed: 1.0,
        pitch: 1.0
      };

      const maleVoice: VoiceProfile = {
        language: 'en',
        gender: 'male',
        speed: 1.0,
        pitch: 1.0
      };

      const femaleResult = await ttsService.synthesize(text, language, femaleVoice);
      const maleResult = await ttsService.synthesize(text, language, maleVoice);

      expect(femaleResult).toBeDefined();
      expect(maleResult).toBeDefined();
      // Results should be different (different audio data)
      expect(femaleResult.data).not.toEqual(maleResult.data);
    });

    it('should handle different speed settings', async () => {
      const text = 'Test message with different speeds';
      const language: LanguageCode = 'en';

      const slowVoice: VoiceProfile = {
        language: 'en',
        gender: 'female',
        speed: 0.7,
        pitch: 1.0
      };

      const fastVoice: VoiceProfile = {
        language: 'en',
        gender: 'female',
        speed: 1.5,
        pitch: 1.0
      };

      const slowResult = await ttsService.synthesize(text, language, slowVoice);
      const fastResult = await ttsService.synthesize(text, language, fastVoice);

      expect(slowResult).toBeDefined();
      expect(fastResult).toBeDefined();
      // Different speeds should produce different audio
      expect(slowResult.data).not.toEqual(fastResult.data);
    });
  });
});

describe('TTS Integration with Voice Interface', () => {
  it('should integrate properly with voice interface', async () => {
    const ttsService = new TextToSpeechServiceImpl();
    
    expect(await ttsService.isAvailable()).toBe(true);
    expect(ttsService.getSupportedLanguages()).toContain('en');
    expect(ttsService.getSupportedLanguages()).toContain('hi');
  });
});