/**
 * Natural Language Processing interfaces for Sahaay AI
 */

import { 
  ProcessedQuery, 
  EntitySet, 
  ConversationContext, 
  LanguageCode 
} from '@/types';

/**
 * Main natural language processor interface
 */
export interface NaturalLanguageProcessor {
  /**
   * Process user query and extract intent and entities
   */
  processQuery(text: string, context: ConversationContext): Promise<ProcessedQuery>;
  
  /**
   * Extract entities from text
   */
  extractEntities(text: string, language: LanguageCode): Promise<EntitySet>;
  
  /**
   * Translate text between languages
   */
  translateText(text: string, fromLang: LanguageCode, toLang: LanguageCode): Promise<string>;
  
  /**
   * Maintain conversation context across turns
   */
  maintainContext(sessionId: string, query: ProcessedQuery): Promise<ConversationContext>;
}

/**
 * Intent recognition service interface
 */
export interface IntentRecognitionService {
  /**
   * Classify user intent from text
   */
  classifyIntent(text: string, language: LanguageCode): Promise<{
    intent: string;
    confidence: number;
    alternatives: Array<{ intent: string; confidence: number }>;
  }>;
  
  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Entity extraction service interface
 */
export interface EntityExtractionService {
  /**
   * Extract named entities from text
   */
  extractEntities(text: string, language: LanguageCode): Promise<EntitySet>;
  
  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
}