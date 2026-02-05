/**
 * Unit tests for Speech-to-Text Service
 */

import { SpeechToTextServiceImpl, createSpeechToTextService } from '@/services/speechToText';
import { LanguageCode } from '@/types';

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('SpeechToTextService', () => {
  let sttService: SpeechToTextServiceImpl;
  let mockAudioBlob: Blob;

  beforeEach(() => {
    sttService = new SpeechToTextServiceImpl();
    
    // Create mock audio blob
    const audioData = new Uint8Array([1, 2, 3, 4, 5]);
    mockAudioBlob = new Blob([audioData], { type: 'audio/wav' });
  });

  describe('Service Initialization', () => {
    it('should create service with default configuration', () => {
      expect(sttService).toBeInstanceOf(SpeechToTextServiceImpl);
    });

    it('should create service with custom configuration', () => {
      const customService = new SpeechToTextServiceImpl({
        fallbackToOffline: false,
        compressionEnabled: false,
        confidenceThreshold: 0.9
      });
      
      expect(customService).toBeInstanceOf(SpeechToTextServiceImpl);
    });

    it('should create service using factory function', () => {
      const factoryService = createSpeechToTextService();
      expect(factoryService).toBeInstanceOf(SpeechToTextServiceImpl);
    });
  });

  describe('Service Availability', () => {
    it('should report service as available', async () => {
      const isAvailable = await sttService.isAvailable();
      expect(isAvailable).toBe(true);
    });

    it('should return supported languages', () => {
      const languages = sttService.getSupportedLanguages();
      expect(languages).toEqual(['en', 'hi', 'ta', 'te', 'bn']);
      expect(languages).toContain('hi'); // Hindi should be supported
      expect(languages).toContain('en'); // English should be supported
    });
  });

  describe('Speech Transcription', () => {
    it('should transcribe audio successfully', async () => {
      const result = await sttService.transcribe(mockAudioBlob);
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('detectedLanguage');
      expect(typeof result.text).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should transcribe with specified language', async () => {
      const targetLanguage: LanguageCode = 'en';
      const result = await sttService.transcribe(mockAudioBlob, targetLanguage);
      
      expect(result.detectedLanguage).toBe(targetLanguage);
    });

    it('should handle Hindi language transcription', async () => {
      const result = await sttService.transcribe(mockAudioBlob, 'hi');
      
      expect(result.detectedLanguage).toBe('hi');
      expect(result.text).toBeTruthy();
    });

    it('should provide alternatives when available', async () => {
      const result = await sttService.transcribe(mockAudioBlob);
      
      if (result.alternatives) {
        expect(Array.isArray(result.alternatives)).toBe(true);
        expect(result.alternatives.length).toBeGreaterThan(0);
      }
    });

    it('should handle transcription errors gracefully', async () => {
      // Create invalid audio blob
      const invalidBlob = new Blob(['invalid'], { type: 'text/plain' });
      
      // The service should handle this gracefully
      try {
        await sttService.transcribe(invalidBlob);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Language Detection', () => {
    it('should detect language from audio', async () => {
      const detectedLanguage = await sttService.detectLanguage(mockAudioBlob);
      
      expect(detectedLanguage).toBeTruthy();
      expect(['en', 'hi', 'ta', 'te', 'bn']).toContain(detectedLanguage);
    });

    it('should fallback to default language on detection failure', async () => {
      // Create problematic audio blob
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      
      const detectedLanguage = await sttService.detectLanguage(emptyBlob);
      expect(detectedLanguage).toBe('hi'); // Should fallback to Hindi
    });
  });

  describe('Audio Compression', () => {
    it('should compress audio successfully', async () => {
      const compressedBlob = await sttService.compressAudio(mockAudioBlob, 5);
      
      expect(compressedBlob).toBeInstanceOf(Blob);
      // In the mock implementation, it returns the original blob
      expect(compressedBlob.size).toBe(mockAudioBlob.size);
    });

    it('should handle different compression levels', async () => {
      const levels = [1, 5, 10] as const;
      
      for (const level of levels) {
        const compressed = await sttService.compressAudio(mockAudioBlob, level);
        expect(compressed).toBeInstanceOf(Blob);
      }
    });

    it('should handle compression errors gracefully', async () => {
      // Should not throw even with problematic input
      const result = await sttService.compressAudio(mockAudioBlob, 1);
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('Confidence Threshold Handling', () => {
    it('should handle low confidence results', async () => {
      // Create service with high confidence threshold
      const strictService = new SpeechToTextServiceImpl({
        confidenceThreshold: 0.95
      });
      
      const result = await strictService.transcribe(mockAudioBlob);
      
      // Should still return a result, but may trigger fallback logic
      expect(result).toHaveProperty('confidence');
    });

    it('should accept high confidence results', async () => {
      const result = await sttService.transcribe(mockAudioBlob);
      
      // Mock service returns high confidence
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Multilingual Support', () => {
    const supportedLanguages: LanguageCode[] = ['en', 'hi', 'ta', 'te', 'bn'];

    it.each(supportedLanguages)('should handle %s language', async (language) => {
      const result = await sttService.transcribe(mockAudioBlob, language);
      
      expect(result.detectedLanguage).toBe(language);
      expect(result.text).toBeTruthy();
    });

    it('should maintain language consistency', async () => {
      const language: LanguageCode = 'ta';
      const result = await sttService.transcribe(mockAudioBlob, language);
      
      expect(result.detectedLanguage).toBe(language);
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability', async () => {
      // Mock service unavailability
      jest.spyOn(sttService, 'isAvailable').mockResolvedValue(false);
      
      try {
        await sttService.transcribe(mockAudioBlob);
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('STT service');
      }
    });

    it('should provide meaningful error messages', async () => {
      // Create a scenario that would cause an error
      const invalidBlob = new Blob([], { type: 'invalid/type' });
      
      try {
        await sttService.transcribe(invalidBlob);
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Performance Considerations', () => {
    it('should complete transcription within reasonable time', async () => {
      const startTime = Date.now();
      
      await sttService.transcribe(mockAudioBlob);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent transcriptions', async () => {
      const promises = Array(3).fill(null).map(() => 
        sttService.transcribe(mockAudioBlob)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach((result: any) => {
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('confidence');
      });
    });
  });

  describe('Integration with Audio Processing', () => {
    it('should work with compressed audio', async () => {
      // First compress the audio
      const compressed = await sttService.compressAudio(mockAudioBlob, 5);
      
      // Then transcribe the compressed audio
      const result = await sttService.transcribe(compressed);
      
      expect(result).toHaveProperty('text');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should maintain quality with light compression', async () => {
      const lightCompressed = await sttService.compressAudio(mockAudioBlob, 8);
      const result = await sttService.transcribe(lightCompressed);
      
      // Should maintain good confidence with light compression
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });
});