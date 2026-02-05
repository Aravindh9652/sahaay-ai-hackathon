/**
 * Voice processing interfaces for Sahaay AI
 */

import { 
  TranscriptionResult, 
  AudioBlob, 
  LanguageCode, 
  CompressionLevel, 
  VoiceProfile 
} from '@/types';

/**
 * Context for voice interactions with enhanced tracking
 */
export interface VoiceContext {
  sessionId: string;
  currentLanguage: LanguageCode;
  inputMode: 'voice' | 'text';
  lastInteraction: Date;
  failureCount: number;
  totalInteractions: number;
  fallbackSuggested: boolean;
  conversationHistory: Array<{
    timestamp: Date;
    inputMode: 'voice' | 'text';
    success: boolean;
    language: LanguageCode;
  }>;
}

/**
 * Fallback suggestion result
 */
export interface FallbackSuggestion {
  shouldSuggestFallback: boolean;
  reason: 'multiple_failures' | 'low_confidence' | 'service_unavailable';
  failureCount: number;
  lastSuccessfulMode?: 'voice' | 'text';
}

/**
 * Main voice interface that coordinates STT and TTS services
 */
export interface VoiceInterface {
  /**
   * Convert speech to text with language detection and session tracking
   */
  convertSpeechToText(audioBlob: Blob, language?: LanguageCode, sessionId?: string): Promise<TranscriptionResult>;
  
  /**
   * Convert text to speech in specified language
   */
  convertTextToSpeech(text: string, language: LanguageCode, voice?: VoiceProfile): Promise<AudioBlob>;
  
  /**
   * Process text input with context tracking
   */
  processTextInput(text: string, sessionId: string, language?: LanguageCode): Promise<{
    processedText: string;
    detectedLanguage: LanguageCode;
    confidence: number;
  }>;
  
  /**
   * Detect language from audio input
   */
  detectLanguage(audioBlob: Blob): Promise<LanguageCode>;
  
  /**
   * Compress audio for bandwidth optimization
   */
  compressAudio(audioBlob: Blob, quality: CompressionLevel): Promise<Blob>;

  /**
   * Check if voice input is available
   */
  isVoiceInputAvailable(): Promise<boolean>;

  /**
   * Check if voice output is available
   */
  isVoiceOutputAvailable(): Promise<boolean>;

  /**
   * Get supported input languages
   */
  getSupportedInputLanguages(): LanguageCode[];

  /**
   * Get supported output languages
   */
  getSupportedOutputLanguages(): Promise<LanguageCode[]>;

  /**
   * Set context for a session
   */
  setContext(sessionId: string, language: LanguageCode, inputMode: 'voice' | 'text'): void;

  /**
   * Get context for a session
   */
  getContext(sessionId: string): VoiceContext | undefined;

  /**
   * Clear context for a session
   */
  clearContext(sessionId: string): void;

  /**
   * Switch input mode with context preservation
   */
  switchInputMode(sessionId: string, newMode: 'voice' | 'text', reason?: string): boolean;

  /**
   * Get fallback suggestion for a session
   */
  getFallbackSuggestion(sessionId: string): FallbackSuggestion | null;

  /**
   * Mark fallback as suggested for a session
   */
  markFallbackSuggested(sessionId: string): void;

  /**
   * Clean up expired contexts
   */
  cleanupExpiredContexts(): number;

  /**
   * Get context statistics
   */
  getContextStats(): {
    totalSessions: number;
    activeSessions: number;
    averageInteractionsPerSession: number;
    voiceModeSessions: number;
    textModeSessions: number;
  };
}

/**
 * Speech-to-Text service interface
 */
export interface SpeechToTextService {
  /**
   * Transcribe audio to text
   */
  transcribe(audioBlob: Blob, language?: LanguageCode): Promise<TranscriptionResult>;
  
  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[];
}

/**
 * Text-to-Speech service interface
 */
export interface TextToSpeechService {
  /**
   * Synthesize text to speech
   */
  synthesize(text: string, language: LanguageCode, voice?: VoiceProfile): Promise<AudioBlob>;
  
  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get available voices for a language
   */
  getAvailableVoices(language: LanguageCode): Promise<VoiceProfile[]>;
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageCode[];
}