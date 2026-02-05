/**
 * Data validation utilities for Sahaay AI
 */

import Joi from 'joi';
import { 
  LanguageCode, 
  ValidationResult,
  ValidationError 
} from '@/types';

// Supported languages validation
const languageSchema = Joi.string().valid('en', 'hi', 'ta', 'te', 'bn');

// User profile validation schema
const userProfileSchema = Joi.object({
  sessionId: Joi.string().required(),
  demographics: Joi.object({
    ageRange: Joi.string().valid('0-18', '18-35', '35-60', '60+').optional(),
    incomeRange: Joi.string().valid('below-2lakh', '2-5lakh', '5-10lakh', 'above-10lakh').optional(),
    location: Joi.object({
      state: Joi.string().required(),
      district: Joi.string().optional(),
      pincode: Joi.string().pattern(/^\d{6}$/).optional(),
      isRural: Joi.boolean().optional(),
    }).optional(),
    category: Joi.string().valid('general', 'obc', 'sc', 'st', 'ews').optional(),
    occupation: Joi.string().valid('farmer', 'student', 'unemployed', 'self-employed', 'salaried', 'retired').optional(),
  }).required(),
  preferences: Joi.object({
    language: languageSchema.required(),
    interactionMode: Joi.string().valid('voice', 'text', 'mixed').required(),
  }).required(),
  conversationHistory: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    timestamp: Joi.date().required(),
    userInput: Joi.string().required(),
    systemResponse: Joi.string().required(),
    intent: Joi.string().required(),
    language: languageSchema.required(),
    inputMode: Joi.string().valid('voice', 'text').required(),
  })).required(),
});

// Multilingual text validation schema
const multilingualTextSchema = Joi.object({
  en: Joi.string().required(), // English is always required as fallback
}).pattern(languageSchema, Joi.string());

// Scheme details validation schema
const schemeDetailsSchema = Joi.object({
  id: Joi.string().required(),
  name: multilingualTextSchema.required(),
  description: multilingualTextSchema.required(),
  category: Joi.string().valid(
    'agriculture', 'education', 'healthcare', 'employment', 
    'housing', 'social_welfare', 'financial_inclusion', 'digital_services'
  ).required(),
  eligibilityCriteria: Joi.array().required(),
  benefits: Joi.array().required(),
  applicationProcess: Joi.object().required(),
  requiredDocuments: Joi.array().required(),
  contactInformation: Joi.array().required(),
  lastUpdated: Joi.date().required(),
  source: Joi.string().valid('api_setu', 'state_portal', 'central_portal', 'manual_entry').required(),
});

/**
 * Validate user profile data
 */
export const validateUserProfile = (profile: unknown): ValidationResult => {
  const { error } = userProfileSchema.validate(profile, { abortEarly: false });
  
  if (error) {
    const errors: ValidationError[] = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: { en: detail.message },
      code: detail.type,
    }));
    
    return {
      isValid: false,
      errors,
      warnings: [],
    };
  }
  
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
};

/**
 * Validate scheme details data
 */
export const validateSchemeDetails = (scheme: unknown): ValidationResult => {
  const { error } = schemeDetailsSchema.validate(scheme, { abortEarly: false });
  
  if (error) {
    const errors: ValidationError[] = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: { en: detail.message },
      code: detail.type,
    }));
    
    return {
      isValid: false,
      errors,
      warnings: [],
    };
  }
  
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
};

/**
 * Validate language code
 */
export const validateLanguageCode = (language: string): boolean => {
  const supportedLanguages: LanguageCode[] = ['en', 'hi', 'ta', 'te', 'bn'];
  return supportedLanguages.includes(language as LanguageCode);
};

/**
 * Validate multilingual text object
 */
export const validateMultilingualText = (text: unknown): ValidationResult => {
  const { error } = multilingualTextSchema.validate(text);
  
  if (error) {
    return {
      isValid: false,
      errors: [{
        field: 'multilingualText',
        message: { en: error.message },
        code: error.details[0]?.type || 'validation.error',
      }],
      warnings: [],
    };
  }
  
  return {
    isValid: true,
    errors: [],
    warnings: [],
  };
};

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate session ID format
 */
export const validateSessionId = (sessionId: string): boolean => {
  // Session ID should be alphanumeric with hyphens, 10-50 characters
  const sessionIdPattern = /^[a-zA-Z0-9-]{10,50}$/;
  return sessionIdPattern.test(sessionId);
};

/**
 * Validate Indian pincode format
 */
export const validatePincode = (pincode: string): boolean => {
  const pincodePattern = /^\d{6}$/;
  return pincodePattern.test(pincode);
};