/**
 * Voice Interface Service Implementation for Sahaay AI
 * 
 * This service orchestrates speech-to-text and text-to-speech services,
 * providing fallback mechanisms and context preservation across input modalities.
 * 
 * Key Features:
 * - Automatic fallback from voice to text input when voice fails
 * - Context preservation across input modality switches
 * - Multi-language support with automatic language detection
 * - Bandwidth optimization with audio compression
 * - Session management with failure tracking
 */

import { 
  VoiceInterface,
  SpeechToTextService,
  TextToSpeechService,
  VoiceContext,
  FallbackSuggestion
} from '@/interfaces/voice';
import { 
  TranscriptionResult,
  AudioBlob,
  LanguageCode,
  CompressionLevel,
  VoiceProfile
} from '@/types';
import { SpeechToTextServiceImpl } from './speechToText';
import { TextToSpeechServiceImpl } from './textToSpeech';
import { logger } from '@/utils/logger';

/**
 * Configuration for voice interface
 */
interface VoiceInterfaceConfig {
  enableVoiceInput: boolean;
  enableVoiceOutput: boolean;
  fallbackToText: boolean;
  preserveContext: boolean;
  audioCompression: boolean;
  defaultLanguage: LanguageCode;
  maxFailuresBeforeFallback: number;
  contextTimeoutMinutes: number;
}

/**
 * Main voice interface implementation
 */
export class VoiceInterfaceImpl implements VoiceInterface {
  private sttService: SpeechToTextService;
  private ttsService: TextToSpeechService;
  private config: VoiceInterfaceConfig;
  private contexts: Map<string, VoiceContext> = new Map();

  constructor(
    sttService?: SpeechToTextService,
    ttsService?: TextToSpeechService,
    config: Partial<VoiceInterfaceConfig> = {}
  ) {
    this.config = {
      enableVoiceInput: true,
      enableVoiceOutput: true,
      fallbackToText: true,
      preserveContext: true,
      audioCompression: true,
      defaultLanguage: 'hi',
      maxFailuresBeforeFallback: 2,
      contextTimeoutMinutes: 30,
      ...config
    };

    this.sttService = sttService || new SpeechToTextServiceImpl();
    this.ttsService = ttsService || new TextToSpeechServiceImpl();
  }

  async convertSpeechToText(audioBlob: Blob, language?: LanguageCode, sessionId?: string): Promise<TranscriptionResult> {
    if (!this.config.enableVoiceInput) {
      throw new Error('Voice input is disabled');
    }

    const startTime = Date.now();
    logger.info('Converting speech to text...', { 
      audioSize: audioBlob.size, 
      language, 
      sessionId 
    });

    try {
      // Detect language if not provided
      const targetLanguage = language || await this.detectLanguage(audioBlob);
      
      // Perform transcription
      const result = await this.sttService.transcribe(audioBlob, targetLanguage);
      
      // Update context on successful transcription
      if (sessionId) {
        this.updateContextOnSuccess(sessionId, targetLanguage, 'voice');
      }
      
      const processingTime = Date.now() - startTime;
      logger.info(`STT successful: "${result.text}" (confidence: ${result.confidence}, time: ${processingTime}ms)`);
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Speech-to-text conversion failed:', { 
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        sessionId
      });
      
      // Update context on failure and check for fallback suggestion
      if (sessionId) {
        const fallbackSuggestion = this.updateContextOnFailure(sessionId, 'voice');
        
        if (fallbackSuggestion.shouldSuggestFallback) {
          const fallbackError = new VoiceInputError(
            `Voice input failed after ${fallbackSuggestion.failureCount} attempts. Please try typing your message instead.`,
            true
          );
          fallbackError.fallbackSuggestion = fallbackSuggestion;
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  async convertTextToSpeech(
    text: string, 
    language: LanguageCode, 
    voice?: VoiceProfile
  ): Promise<AudioBlob> {
    if (!this.config.enableVoiceOutput) {
      throw new Error('Voice output is disabled');
    }

    try {
      logger.info(`Converting text to speech in language: ${language}`);
      
      const result = await this.ttsService.synthesize(text, language, voice);
      
      logger.info('TTS conversion successful');
      return result;
      
    } catch (error) {
      logger.error('Text-to-speech conversion failed:', error);
      throw error;
    }
  }

  async detectLanguage(audioBlob: Blob): Promise<LanguageCode> {
    try {
      // Use STT service's language detection capability
      if (this.sttService instanceof SpeechToTextServiceImpl) {
        return await this.sttService.detectLanguage(audioBlob);
      }
      
      // Fallback to default language
      return this.config.defaultLanguage;
      
    } catch (error) {
      logger.error('Language detection failed:', error);
      return this.config.defaultLanguage;
    }
  }

  async compressAudio(audioBlob: Blob, quality: CompressionLevel): Promise<Blob> {
    if (!this.config.audioCompression) {
      return audioBlob;
    }

    try {
      // Use STT service's compression capability
      if (this.sttService instanceof SpeechToTextServiceImpl) {
        return await this.sttService.compressAudio(audioBlob, quality);
      }
      
      // Fallback to original blob
      return audioBlob;
      
    } catch (error) {
      logger.error('Audio compression failed:', error);
      return audioBlob;
    }
  }

  /**
   * Process text input with context tracking
   */
  async processTextInput(text: string, sessionId: string, language?: LanguageCode): Promise<{
    processedText: string;
    detectedLanguage: LanguageCode;
    confidence: number;
  }> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text input cannot be empty');
    }

    const startTime = Date.now();
    logger.info('Processing text input...', { 
      textLength: text.length, 
      language, 
      sessionId 
    });

    try {
      // Use current context language or detect from text
      const context = this.contexts.get(sessionId);
      const targetLanguage = language || context?.currentLanguage || this.config.defaultLanguage;
      
      // Process and normalize text
      const processedText = text.trim();
      
      // Update context on successful text processing
      this.updateContextOnSuccess(sessionId, targetLanguage, 'text');
      
      const processingTime = Date.now() - startTime;
      logger.info(`Text processing successful (time: ${processingTime}ms)`, {
        textLength: processedText.length,
        language: targetLanguage
      });
      
      return {
        processedText,
        detectedLanguage: targetLanguage,
        confidence: 1.0 // Text input has perfect confidence
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Text processing failed:', { 
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        sessionId
      });
      
      // Update context on failure
      this.updateContextOnFailure(sessionId, 'text');
      throw error;
    }
  }

  /**
   * Check if voice input is available
   */
  async isVoiceInputAvailable(): Promise<boolean> {
    if (!this.config.enableVoiceInput) {
      return false;
    }
    
    return await this.sttService.isAvailable();
  }

  /**
   * Check if voice output is available
   */
  async isVoiceOutputAvailable(): Promise<boolean> {
    if (!this.config.enableVoiceOutput) {
      return false;
    }
    
    return await this.ttsService.isAvailable();
  }

  /**
   * Get supported languages for voice input
   */
  getSupportedInputLanguages(): LanguageCode[] {
    return this.sttService.getSupportedLanguages();
  }

  /**
   * Get supported languages for voice output
   */
  async getSupportedOutputLanguages(): Promise<LanguageCode[]> {
    if (this.ttsService instanceof TextToSpeechServiceImpl) {
      return this.ttsService.getSupportedLanguages();
    }
    return ['en', 'hi', 'ta', 'te', 'bn'];
  }

  /**
   * Set context for a session with enhanced tracking
   */
  setContext(sessionId: string, language: LanguageCode, inputMode: 'voice' | 'text'): void {
    if (!this.config.preserveContext) {
      return;
    }

    const existingContext = this.contexts.get(sessionId);
    const now = new Date();

    this.contexts.set(sessionId, {
      sessionId,
      currentLanguage: language,
      inputMode,
      lastInteraction: now,
      failureCount: existingContext?.failureCount || 0,
      totalInteractions: (existingContext?.totalInteractions || 0) + 1,
      fallbackSuggested: existingContext?.fallbackSuggested || false,
      conversationHistory: [
        ...(existingContext?.conversationHistory || []),
        {
          timestamp: now,
          inputMode,
          success: true, // Assume success when setting context
          language
        }
      ].slice(-10) // Keep only last 10 interactions
    });

    logger.info(`Context set for session ${sessionId}`, { language, inputMode });
  }

  /**
   * Get context for a session
   */
  getContext(sessionId: string): VoiceContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * Clear context for a session
   */
  clearContext(sessionId: string): void {
    this.contexts.delete(sessionId);
  }

  /**
   * Handle input mode switching with context preservation
   */
  switchInputMode(sessionId: string, newMode: 'voice' | 'text', reason?: string): boolean {
    const context = this.contexts.get(sessionId);
    if (!context) {
      logger.warn(`No context found for session ${sessionId} when switching input mode`);
      return false;
    }

    const oldMode = context.inputMode;
    logger.info(`Switching input mode from ${oldMode} to ${newMode} for session ${sessionId}`, { reason });
    
    // Update context with mode switch
    context.inputMode = newMode;
    context.lastInteraction = new Date();
    
    // Reset failure count when switching modes (fresh start)
    context.failureCount = 0;
    context.fallbackSuggested = false;
    
    // Add to conversation history
    context.conversationHistory.push({
      timestamp: new Date(),
      inputMode: newMode,
      success: true,
      language: context.currentLanguage
    });
    
    // Keep only last 10 interactions
    context.conversationHistory = context.conversationHistory.slice(-10);
    
    logger.info(`Successfully switched input mode for session ${sessionId}`, {
      from: oldMode,
      to: newMode,
      totalInteractions: context.totalInteractions
    });
    
    return true;
  }

  /**
   * Get fallback suggestion for a session
   */
  getFallbackSuggestion(sessionId: string): FallbackSuggestion | null {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return null;
    }

    // Check if we should suggest fallback based on failure count
    const shouldSuggestFallback = this.config.fallbackToText && 
      context.failureCount >= this.config.maxFailuresBeforeFallback &&
      context.inputMode === 'voice' &&
      !context.fallbackSuggested;

    if (shouldSuggestFallback) {
      // Find last successful mode from history
      const lastSuccessful = context.conversationHistory
        .slice()
        .reverse()
        .find(h => h.success);

      return {
        shouldSuggestFallback: true,
        reason: 'multiple_failures',
        failureCount: context.failureCount,
        ...(lastSuccessful && { lastSuccessfulMode: lastSuccessful.inputMode })
      };
    }

    return {
      shouldSuggestFallback: false,
      reason: 'multiple_failures',
      failureCount: context.failureCount
    };
  }

  /**
   * Mark fallback as suggested for a session
   */
  markFallbackSuggested(sessionId: string): void {
    const context = this.contexts.get(sessionId);
    if (context) {
      context.fallbackSuggested = true;
    }
  }

  /**
   * Check if context has expired and clean up if needed
   */
  cleanupExpiredContexts(): number {
    const now = new Date();
    const timeoutMs = this.config.contextTimeoutMinutes * 60 * 1000;
    let cleanedCount = 0;

    for (const [sessionId, context] of this.contexts.entries()) {
      const timeSinceLastInteraction = now.getTime() - context.lastInteraction.getTime();
      
      if (timeSinceLastInteraction > timeoutMs) {
        this.contexts.delete(sessionId);
        cleanedCount++;
        logger.info(`Cleaned up expired context for session ${sessionId}`);
      }
    }

    return cleanedCount;
  }

  /**
   * Get context statistics for monitoring
   */
  getContextStats(): {
    totalSessions: number;
    activeSessions: number;
    averageInteractionsPerSession: number;
    voiceModeSessions: number;
    textModeSessions: number;
  } {
    const contexts = Array.from(this.contexts.values());
    const now = new Date();
    const activeThresholdMs = 5 * 60 * 1000; // 5 minutes

    const activeSessions = contexts.filter(
      c => now.getTime() - c.lastInteraction.getTime() < activeThresholdMs
    ).length;

    const totalInteractions = contexts.reduce((sum, c) => sum + c.totalInteractions, 0);
    const averageInteractions = contexts.length > 0 ? totalInteractions / contexts.length : 0;

    const voiceModeSessions = contexts.filter(c => c.inputMode === 'voice').length;
    const textModeSessions = contexts.filter(c => c.inputMode === 'text').length;

    return {
      totalSessions: contexts.length,
      activeSessions,
      averageInteractionsPerSession: Math.round(averageInteractions * 100) / 100,
      voiceModeSessions,
      textModeSessions
    };
  }

  private updateContextOnSuccess(sessionId: string, language: LanguageCode, inputMode: 'voice' | 'text'): void {
    if (!this.config.preserveContext) {
      return;
    }

    const context = this.contexts.get(sessionId);
    if (context) {
      context.currentLanguage = language;
      context.lastInteraction = new Date();
      context.failureCount = 0; // Reset failure count on success
      context.totalInteractions++;
      
      // Add successful interaction to history
      context.conversationHistory.push({
        timestamp: new Date(),
        inputMode,
        success: true,
        language
      });
      
      // Keep only last 10 interactions
      context.conversationHistory = context.conversationHistory.slice(-10);
      
      logger.debug(`Context updated on success for session ${sessionId}`, {
        language,
        inputMode,
        totalInteractions: context.totalInteractions
      });
    } else {
      logger.warn(`No context found for session ${sessionId} during success update`);
    }
  }

  private updateContextOnFailure(sessionId: string, inputMode: 'voice' | 'text'): FallbackSuggestion {
    const context = this.contexts.get(sessionId);
    if (!context) {
      return {
        shouldSuggestFallback: false,
        reason: 'multiple_failures',
        failureCount: 0
      };
    }

    // Increment failure count and update interaction time
    context.failureCount++;
    context.lastInteraction = new Date();
    context.totalInteractions++;
    
    // Add failed interaction to history
    context.conversationHistory.push({
      timestamp: new Date(),
      inputMode,
      success: false,
      language: context.currentLanguage
    });
    
    // Keep only last 10 interactions
    context.conversationHistory = context.conversationHistory.slice(-10);
    
    logger.debug(`Context updated on failure for session ${sessionId}`, {
      failureCount: context.failureCount,
      inputMode,
      totalInteractions: context.totalInteractions
    });

    // Check if we should suggest fallback
    const shouldSuggestFallback = this.config.fallbackToText && 
      context.failureCount >= this.config.maxFailuresBeforeFallback &&
      inputMode === 'voice' &&
      !context.fallbackSuggested;

    if (shouldSuggestFallback) {
      context.fallbackSuggested = true;
      
      // Find last successful mode from history
      const lastSuccessful = context.conversationHistory
        .slice()
        .reverse()
        .find(h => h.success);

      return {
        shouldSuggestFallback: true,
        reason: 'multiple_failures',
        failureCount: context.failureCount,
        ...(lastSuccessful && { lastSuccessfulMode: lastSuccessful.inputMode })
      };
    }

    return {
      shouldSuggestFallback: false,
      reason: 'multiple_failures',
      failureCount: context.failureCount
    };
  }
}

/**
 * Factory function to create voice interface
 */
export function createVoiceInterface(
  sttService?: SpeechToTextService,
  ttsService?: TextToSpeechService,
  config?: Partial<VoiceInterfaceConfig>
): VoiceInterface {
  return new VoiceInterfaceImpl(sttService, ttsService, config);
}

/**
 * Error types for voice interface
 */
export class VoiceInputError extends Error {
  public readonly suggestTextFallback: boolean;
  public fallbackSuggestion?: FallbackSuggestion;

  constructor(message: string, suggestTextFallback: boolean = false) {
    super(message);
    this.name = 'VoiceInputError';
    this.suggestTextFallback = suggestTextFallback;
  }
}

export class VoiceOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceOutputError';
  }
}

export class ContextError extends Error {
  constructor(message: string, public readonly sessionId: string) {
    super(message);
    this.name = 'ContextError';
  }
}