/**
 * Unit tests for Voice Interface Service
 */

import { VoiceInterfaceImpl, createVoiceInterface } from '@/services/voiceInterface';
import { SpeechToTextService, TextToSpeechService } from '@/interfaces/voice';
import { LanguageCode, TranscriptionResult, AudioBlob, VoiceProfile } from '@/types';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('VoiceInterface', () => {
  let voiceInterface: VoiceInterfaceImpl;
  let mockSTTService: jest.Mocked<SpeechToTextService>;
  let mockTTSService: jest.Mocked<TextToSpeechService>;
  let mockAudioBlob: Blob;

  beforeEach(() => {
    // Create mock services
    mockSTTService = {
      transcribe: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      getSupportedLanguages: jest.fn().mockReturnValue(['en', 'hi', 'ta', 'te', 'bn'])
    };

    mockTTSService = {
      synthesize: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
      getAvailableVoices: jest.fn(),
      getSupportedLanguages: jest.fn().mockReturnValue(['en', 'hi', 'ta', 'te', 'bn'])
    };

    // Add compressAudio method to mock STT service
    (mockSTTService as any).compressAudio = jest.fn().mockResolvedValue(mockAudioBlob);
    (mockSTTService as any).detectLanguage = jest.fn().mockResolvedValue('hi');

    // Create mock audio blob
    const audioData = new Uint8Array([1, 2, 3, 4, 5]);
    mockAudioBlob = new Blob([audioData], { type: 'audio/wav' });

    // Create voice interface with mocked services
    voiceInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService);
  });

  describe('Service Initialization', () => {
    it('should create voice interface with default configuration', () => {
      expect(voiceInterface).toBeInstanceOf(VoiceInterfaceImpl);
    });

    it('should create voice interface with custom configuration', () => {
      const customInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService, {
        enableVoiceInput: false,
        enableVoiceOutput: true,
        fallbackToText: false
      });
      
      expect(customInterface).toBeInstanceOf(VoiceInterfaceImpl);
    });

    it('should create voice interface using factory function', () => {
      const factoryInterface = createVoiceInterface();
      expect(factoryInterface).toBeDefined();
    });
  });

  describe('Speech-to-Text Conversion', () => {
    beforeEach(() => {
      const mockResult: TranscriptionResult = {
        text: 'मुझे सरकारी योजनाओं के बारे में जानकारी चाहिए',
        confidence: 0.92,
        detectedLanguage: 'hi',
        alternatives: ['मुझे सरकारी स्कीमों के बारे में जानकारी चाहिए']
      };
      
      mockSTTService.transcribe.mockResolvedValue(mockResult);
    });

    it('should convert speech to text successfully', async () => {
      const result = await voiceInterface.convertSpeechToText(mockAudioBlob);
      
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('detectedLanguage');
      expect(mockSTTService.transcribe).toHaveBeenCalledWith(mockAudioBlob, 'hi');
    });

    it('should convert speech with specified language', async () => {
      const targetLanguage: LanguageCode = 'en';
      const result = await voiceInterface.convertSpeechToText(mockAudioBlob, targetLanguage);
      
      expect(mockSTTService.transcribe).toHaveBeenCalledWith(mockAudioBlob, targetLanguage);
      expect(result.detectedLanguage).toBe('hi'); // From mock result
    });

    it('should handle STT service failures', async () => {
      mockSTTService.transcribe.mockRejectedValue(new Error('STT failed'));
      
      await expect(voiceInterface.convertSpeechToText(mockAudioBlob))
        .rejects.toThrow('STT failed');
    });

    it('should suggest text fallback after multiple failures', async () => {
      // Set up context
      const sessionId = 'session1';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      // Simulate multiple failures
      mockSTTService.transcribe.mockRejectedValue(new Error('STT failed'));
      
      try {
        await voiceInterface.convertSpeechToText(mockAudioBlob, undefined, sessionId);
      } catch (error: any) {
        // First failure shouldn't suggest fallback
        expect(error.message).toBe('STT failed');
      }
      
      try {
        await voiceInterface.convertSpeechToText(mockAudioBlob, undefined, sessionId);
      } catch (error: any) {
        // Second failure should suggest fallback
        expect(error.message).toContain('Please try typing your message instead');
        expect(error.suggestTextFallback).toBe(true);
      }
    });

    it('should throw error when voice input is disabled', async () => {
      const disabledInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService, {
        enableVoiceInput: false
      });
      
      await expect(disabledInterface.convertSpeechToText(mockAudioBlob))
        .rejects.toThrow('Voice input is disabled');
    });
  });

  describe('Text-to-Speech Conversion', () => {
    beforeEach(() => {
      const mockAudioBlob: AudioBlob = {
        data: Buffer.from('mock-audio-data'),
        format: 'wav',
        duration: 2.5,
        sampleRate: 22050
      };
      
      mockTTSService.synthesize.mockResolvedValue(mockAudioBlob);
    });

    it('should convert text to speech successfully', async () => {
      const text = 'Hello, how can I help you?';
      const language: LanguageCode = 'en';
      
      const result = await voiceInterface.convertTextToSpeech(text, language);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('duration');
      expect(mockTTSService.synthesize).toHaveBeenCalledWith(text, language, undefined);
    });

    it('should convert text with voice profile', async () => {
      const text = 'नमस्ते, मैं आपकी कैसे सहायता कर सकता हूं?';
      const language: LanguageCode = 'hi';
      const voice: VoiceProfile = {
        language: 'hi',
        gender: 'female',
        speed: 1.0,
        pitch: 1.0
      };
      
      await voiceInterface.convertTextToSpeech(text, language, voice);
      
      expect(mockTTSService.synthesize).toHaveBeenCalledWith(text, language, voice);
    });

    it('should handle TTS service failures', async () => {
      mockTTSService.synthesize.mockRejectedValue(new Error('TTS failed'));
      
      await expect(voiceInterface.convertTextToSpeech('test', 'en'))
        .rejects.toThrow('TTS failed');
    });

    it('should throw error when voice output is disabled', async () => {
      const disabledInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService, {
        enableVoiceOutput: false
      });
      
      await expect(disabledInterface.convertTextToSpeech('test', 'en'))
        .rejects.toThrow('Voice output is disabled');
    });
  });

  describe('Language Detection', () => {
    it('should detect language from audio', async () => {
      const detectedLanguage = await voiceInterface.detectLanguage(mockAudioBlob);
      
      expect(detectedLanguage).toBe('hi');
    });

    it('should fallback to default language on detection failure', async () => {
      // Mock detection failure
      (mockSTTService as any).detectLanguage = jest.fn().mockRejectedValue(new Error('Detection failed'));
      
      const detectedLanguage = await voiceInterface.detectLanguage(mockAudioBlob);
      
      expect(detectedLanguage).toBe('hi'); // Default language
    });
  });

  describe('Audio Compression', () => {
    it('should compress audio when enabled', async () => {
      // Create a voice interface with real STT service for this test
      const realSTTService = new (require('@/services/speechToText').SpeechToTextServiceImpl)();
      const testInterface = new VoiceInterfaceImpl(realSTTService, mockTTSService);
      
      const compressed = await testInterface.compressAudio(mockAudioBlob, 5);
      
      expect(compressed).toBeInstanceOf(Blob);
    });

    it('should return original blob when compression disabled', async () => {
      const noCompressionInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService, {
        audioCompression: false
      });
      
      const result = await noCompressionInterface.compressAudio(mockAudioBlob, 5);
      
      expect(result).toBe(mockAudioBlob);
    });
  });

  describe('Service Availability', () => {
    it('should check voice input availability', async () => {
      const isAvailable = await voiceInterface.isVoiceInputAvailable();
      
      expect(isAvailable).toBe(true);
      expect(mockSTTService.isAvailable).toHaveBeenCalled();
    });

    it('should check voice output availability', async () => {
      const isAvailable = await voiceInterface.isVoiceOutputAvailable();
      
      expect(isAvailable).toBe(true);
      expect(mockTTSService.isAvailable).toHaveBeenCalled();
    });

    it('should return false when services are disabled', async () => {
      const disabledInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService, {
        enableVoiceInput: false,
        enableVoiceOutput: false
      });
      
      const inputAvailable = await disabledInterface.isVoiceInputAvailable();
      const outputAvailable = await disabledInterface.isVoiceOutputAvailable();
      
      expect(inputAvailable).toBe(false);
      expect(outputAvailable).toBe(false);
    });
  });

  describe('Language Support', () => {
    it('should return supported input languages', () => {
      const languages = voiceInterface.getSupportedInputLanguages();
      
      expect(languages).toEqual(['en', 'hi', 'ta', 'te', 'bn']);
      expect(mockSTTService.getSupportedLanguages).toHaveBeenCalled();
    });

    it('should return supported output languages', async () => {
      const languages = await voiceInterface.getSupportedOutputLanguages();
      
      expect(languages).toEqual(['en', 'hi', 'ta', 'te', 'bn']);
    });
  });

  describe('Context Management', () => {
    it('should set and get context', () => {
      const sessionId = 'session123';
      const language: LanguageCode = 'hi';
      const inputMode = 'voice';
      
      voiceInterface.setContext(sessionId, language, inputMode);
      const context = voiceInterface.getContext(sessionId);
      
      expect(context).toBeDefined();
      expect(context?.sessionId).toBe(sessionId);
      expect(context?.currentLanguage).toBe(language);
      expect(context?.inputMode).toBe(inputMode);
      expect(context?.failureCount).toBe(0);
    });

    it('should clear context', () => {
      const sessionId = 'session123';
      
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      expect(voiceInterface.getContext(sessionId)).toBeDefined();
      
      voiceInterface.clearContext(sessionId);
      expect(voiceInterface.getContext(sessionId)).toBeUndefined();
    });

    it('should switch input mode', () => {
      const sessionId = 'session123';
      
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      voiceInterface.switchInputMode(sessionId, 'text');
      
      const context = voiceInterface.getContext(sessionId);
      expect(context?.inputMode).toBe('text');
      expect(context?.failureCount).toBe(0); // Should reset on mode switch
    });

    it('should not set context when preservation is disabled', () => {
      const noContextInterface = new VoiceInterfaceImpl(mockSTTService, mockTTSService, {
        preserveContext: false
      });
      
      noContextInterface.setContext('session123', 'hi', 'voice');
      const context = noContextInterface.getContext('session123');
      
      expect(context).toBeUndefined();
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle context preservation across failures', async () => {
      const sessionId = 'session123';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      // Simulate failure
      mockSTTService.transcribe.mockRejectedValue(new Error('STT failed'));
      
      try {
        await voiceInterface.convertSpeechToText(mockAudioBlob, undefined, sessionId);
      } catch (error) {
        // Context should still exist and failure count should increment
        const context = voiceInterface.getContext(sessionId);
        expect(context?.failureCount).toBe(1);
      }
    });

    it('should reset failure count on successful transcription', async () => {
      const sessionId = 'session123';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      // Simulate failure first
      mockSTTService.transcribe.mockRejectedValueOnce(new Error('STT failed'));
      
      try {
        await voiceInterface.convertSpeechToText(mockAudioBlob, undefined, sessionId);
      } catch (error) {
        // Failure count should be 1
        expect(voiceInterface.getContext(sessionId)?.failureCount).toBe(1);
      }
      
      // Now simulate success
      const mockResult: TranscriptionResult = {
        text: 'success',
        confidence: 0.9,
        detectedLanguage: 'hi'
      };
      mockSTTService.transcribe.mockResolvedValue(mockResult);
      
      await voiceInterface.convertSpeechToText(mockAudioBlob, undefined, sessionId);
      
      // Failure count should be reset
      expect(voiceInterface.getContext(sessionId)?.failureCount).toBe(0);
    });
  });

  describe('Multilingual Support', () => {
    const supportedLanguages: LanguageCode[] = ['en', 'hi', 'ta', 'te', 'bn'];

    it.each(supportedLanguages)('should handle %s language for STT', async (language) => {
      const mockResult: TranscriptionResult = {
        text: 'test text',
        confidence: 0.9,
        detectedLanguage: language
      };
      mockSTTService.transcribe.mockResolvedValue(mockResult);
      
      const result = await voiceInterface.convertSpeechToText(mockAudioBlob, language);
      
      expect(result.detectedLanguage).toBe(language);
      expect(mockSTTService.transcribe).toHaveBeenCalledWith(mockAudioBlob, language);
    });

    it.each(supportedLanguages)('should handle %s language for TTS', async (language) => {
      const mockAudioBlob: AudioBlob = {
        data: Buffer.from('mock-audio'),
        format: 'wav',
        duration: 1.0,
        sampleRate: 22050
      };
      mockTTSService.synthesize.mockResolvedValue(mockAudioBlob);
      
      await voiceInterface.convertTextToSpeech('test', language);
      
      expect(mockTTSService.synthesize).toHaveBeenCalledWith('test', language, undefined);
    });
  });

  describe('Enhanced Context Management', () => {
    it('should track conversation history', () => {
      const sessionId = 'history-test';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      const context = voiceInterface.getContext(sessionId);
      expect(context?.conversationHistory).toHaveLength(1);
      expect(context?.conversationHistory?.[0]?.inputMode).toBe('voice');
      expect(context?.conversationHistory?.[0]?.success).toBe(true);
    });

    it('should provide fallback suggestions', () => {
      const sessionId = 'fallback-test';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      // Initially no fallback needed
      let suggestion = voiceInterface.getFallbackSuggestion(sessionId);
      expect(suggestion?.shouldSuggestFallback).toBe(false);
      
      // Simulate failures to trigger fallback
      const context = voiceInterface.getContext(sessionId);
      if (context) {
        context.failureCount = 3; // Exceed threshold
        suggestion = voiceInterface.getFallbackSuggestion(sessionId);
        expect(suggestion?.shouldSuggestFallback).toBe(true);
        expect(suggestion?.reason).toBe('multiple_failures');
      }
    });

    it('should clean up expired contexts', () => {
      const sessionId = 'expired-test';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      // Manually set old timestamp
      const context = voiceInterface.getContext(sessionId);
      if (context) {
        context.lastInteraction = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      }
      
      const cleanedCount = voiceInterface.cleanupExpiredContexts();
      expect(cleanedCount).toBe(1);
      expect(voiceInterface.getContext(sessionId)).toBeUndefined();
    });

    it('should provide context statistics', () => {
      voiceInterface.setContext('session1', 'hi', 'voice');
      voiceInterface.setContext('session2', 'en', 'text');
      
      const stats = voiceInterface.getContextStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.voiceModeSessions).toBe(1);
      expect(stats.textModeSessions).toBe(1);
    });
  });

  describe('Text Input Processing', () => {
    it('should process text input successfully', async () => {
      const sessionId = 'text-test';
      const text = 'Hello, I need help with government schemes';
      
      voiceInterface.setContext(sessionId, 'en', 'text');
      
      const result = await voiceInterface.processTextInput(text, sessionId, 'en');
      
      expect(result.processedText).toBe(text);
      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBe(1.0);
    });

    it('should handle empty text input', async () => {
      const sessionId = 'empty-test';
      
      await expect(voiceInterface.processTextInput('', sessionId))
        .rejects.toThrow('Text input cannot be empty');
    });

    it('should use context language when not specified', async () => {
      const sessionId = 'context-lang-test';
      voiceInterface.setContext(sessionId, 'hi', 'text');
      
      const result = await voiceInterface.processTextInput('test text', sessionId);
      
      expect(result.detectedLanguage).toBe('hi');
    });
  });

  describe('Enhanced Input Mode Switching', () => {
    it('should switch input mode with reason tracking', () => {
      const sessionId = 'switch-test';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      const success = voiceInterface.switchInputMode(sessionId, 'text', 'user_preference');
      
      expect(success).toBe(true);
      const context = voiceInterface.getContext(sessionId);
      expect(context?.inputMode).toBe('text');
      expect(context?.failureCount).toBe(0); // Should reset on switch
    });

    it('should return false for non-existent session', () => {
      const success = voiceInterface.switchInputMode('non-existent', 'text');
      expect(success).toBe(false);
    });

    it('should mark fallback as suggested', () => {
      const sessionId = 'mark-fallback-test';
      voiceInterface.setContext(sessionId, 'hi', 'voice');
      
      voiceInterface.markFallbackSuggested(sessionId);
      
      const context = voiceInterface.getContext(sessionId);
      expect(context?.fallbackSuggested).toBe(true);
    });
  });
});