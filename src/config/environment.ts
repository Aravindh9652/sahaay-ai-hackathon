/**
 * Environment configuration for Sahaay AI
 */

import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  
  // Voice processing configuration
  STT_SERVICE: Joi.string().valid('whisper', 'cloud', 'hybrid').default('hybrid'),
  TTS_SERVICE: Joi.string().valid('local', 'cloud', 'hybrid').default('hybrid'),
  AUDIO_COMPRESSION_QUALITY: Joi.number().min(1).max(10).default(6),
  
  // Language support
  DEFAULT_LANGUAGE: Joi.string().default('en'),
  SUPPORTED_LANGUAGES: Joi.string().default('en,hi,ta,te,bn'),
  
  // API configuration
  API_SETU_BASE_URL: Joi.string().uri().optional(),
  API_SETU_API_KEY: Joi.string().optional(),
  
  // Cache configuration
  CACHE_TTL_SECONDS: Joi.number().default(3600),
  MAX_CACHE_SIZE: Joi.number().default(1000),
  
  // Privacy and security
  SESSION_TIMEOUT_MINUTES: Joi.number().default(30),
  MAX_CONVERSATION_TURNS: Joi.number().default(50),
  ENABLE_ANALYTICS: Joi.boolean().default(false),
  
  // Performance
  MAX_CONCURRENT_REQUESTS: Joi.number().default(100),
  REQUEST_TIMEOUT_MS: Joi.number().default(30000),
  
  // Testing
  PROPERTY_TEST_ITERATIONS: Joi.number().default(100),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  nodeEnv: envVars.NODE_ENV as string,
  port: envVars.PORT as number,
  logLevel: envVars.LOG_LEVEL as string,
  
  // Voice processing
  sttService: envVars.STT_SERVICE as string,
  ttsService: envVars.TTS_SERVICE as string,
  audioCompressionQuality: envVars.AUDIO_COMPRESSION_QUALITY as number,
  
  // Language support
  defaultLanguage: envVars.DEFAULT_LANGUAGE as string,
  supportedLanguages: (envVars.SUPPORTED_LANGUAGES as string).split(','),
  
  // API configuration
  apiSetu: {
    baseUrl: envVars.API_SETU_BASE_URL as string | undefined,
    apiKey: envVars.API_SETU_API_KEY as string | undefined,
  },
  
  // Cache configuration
  cache: {
    ttlSeconds: envVars.CACHE_TTL_SECONDS as number,
    maxSize: envVars.MAX_CACHE_SIZE as number,
  },
  
  // Privacy and security
  session: {
    timeoutMinutes: envVars.SESSION_TIMEOUT_MINUTES as number,
    maxConversationTurns: envVars.MAX_CONVERSATION_TURNS as number,
  },
  enableAnalytics: envVars.ENABLE_ANALYTICS as boolean,
  
  // Performance
  maxConcurrentRequests: envVars.MAX_CONCURRENT_REQUESTS as number,
  requestTimeoutMs: envVars.REQUEST_TIMEOUT_MS as number,
  
  // Testing
  propertyTestIterations: envVars.PROPERTY_TEST_ITERATIONS as number,
};