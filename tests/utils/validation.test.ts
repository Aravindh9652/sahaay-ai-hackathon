/**
 * Unit tests for validation utilities
 */

import { 
  validateUserProfile, 
  validateSchemeDetails, 
  validateLanguageCode,
  validateMultilingualText,
  sanitizeInput,
  validateSessionId,
  validatePincode
} from '@/utils/validation';
import { UserProfile } from '@/types';

// Helper functions to create mock data
const createMockUserProfile = (): UserProfile => ({
  sessionId: 'test-session-123',
  demographics: {
    ageRange: '18-35' as const,
    incomeRange: 'below-2lakh' as const,
    location: {
      state: 'Karnataka',
      district: 'Bangalore Urban',
      pincode: '560001',
      isRural: false,
    },
    category: 'general' as const,
    occupation: 'student' as const,
  },
  preferences: {
    language: 'en' as const,
    interactionMode: 'mixed' as const,
  },
  conversationHistory: [],
});

const createMockScheme = () => ({
  id: 'test-scheme-123',
  name: {
    en: 'Test Education Scheme',
    hi: 'परीक्षा शिक्षा योजना',
  },
  description: {
    en: 'A test scheme for educational support',
    hi: 'शैक्षिक सहायता के लिए एक परीक्षा योजना',
  },
  category: 'education' as const,
  eligibilityCriteria: [],
  benefits: [],
  applicationProcess: {
    methods: [],
    estimatedProcessingTime: '30 days',
  },
  requiredDocuments: [],
  contactInformation: [],
  lastUpdated: new Date(),
  source: 'manual_entry' as const,
});

describe('Validation Utils', () => {
  describe('validateUserProfile', () => {
    it('should validate a correct user profile', () => {
      const profile = createMockUserProfile();
      const result = validateUserProfile(profile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject profile with missing sessionId', () => {
      const profile = { ...createMockUserProfile() };
      delete (profile as Partial<UserProfile>).sessionId;
      
      const result = validateUserProfile(profile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'sessionId')).toBe(true);
    });
    
    it('should reject profile with invalid language', () => {
      const profile = createMockUserProfile();
      (profile.preferences.language as string) = 'invalid';
      
      const result = validateUserProfile(profile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('language'))).toBe(true);
    });
    
    it('should reject profile with invalid pincode format', () => {
      const profile = createMockUserProfile();
      if (profile.demographics.location) {
        profile.demographics.location.pincode = '12345'; // Invalid: only 5 digits
      }
      
      const result = validateUserProfile(profile);
      
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('validateSchemeDetails', () => {
    it('should validate a correct scheme', () => {
      const scheme = createMockScheme();
      const result = validateSchemeDetails(scheme);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject scheme with missing English text', () => {
      const scheme = createMockScheme();
      const schemeWithoutEn = { ...scheme, name: { hi: scheme.name['hi'] } };
      
      const result = validateSchemeDetails(schemeWithoutEn);
      
      expect(result.isValid).toBe(false);
    });
    
    it('should reject scheme with invalid category', () => {
      const scheme = createMockScheme();
      (scheme.category as string) = 'invalid_category';
      
      const result = validateSchemeDetails(scheme);
      
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('validateLanguageCode', () => {
    it('should accept valid language codes', () => {
      expect(validateLanguageCode('en')).toBe(true);
      expect(validateLanguageCode('hi')).toBe(true);
      expect(validateLanguageCode('ta')).toBe(true);
      expect(validateLanguageCode('te')).toBe(true);
      expect(validateLanguageCode('bn')).toBe(true);
    });
    
    it('should reject invalid language codes', () => {
      expect(validateLanguageCode('fr')).toBe(false);
      expect(validateLanguageCode('invalid')).toBe(false);
      expect(validateLanguageCode('')).toBe(false);
    });
  });
  
  describe('validateMultilingualText', () => {
    it('should validate correct multilingual text', () => {
      const text = {
        en: 'Hello',
        hi: 'नमस्ते',
        ta: 'வணக்கம்',
      };
      
      const result = validateMultilingualText(text);
      
      expect(result.isValid).toBe(true);
    });
    
    it('should reject text without English', () => {
      const text = {
        hi: 'नमस्ते',
        ta: 'வணக்கம்',
      };
      
      const result = validateMultilingualText(text);
      
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe('Hello  World');
      expect(sanitized).not.toContain('<script>');
    });
    
    it('should remove javascript protocol', () => {
      const input = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('javascript:');
    });
    
    it('should remove event handlers', () => {
      const input = 'Hello onclick="alert()" World';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).not.toContain('onclick=');
    });
    
    it('should preserve normal text', () => {
      const input = 'This is normal text with numbers 123 and symbols !@#';
      const sanitized = sanitizeInput(input);
      
      expect(sanitized).toBe(input);
    });
  });
  
  describe('validateSessionId', () => {
    it('should accept valid session IDs', () => {
      expect(validateSessionId('session-123-abc')).toBe(true);
      expect(validateSessionId('1234567890')).toBe(true);
      expect(validateSessionId('abc-def-ghi-jkl')).toBe(true);
    });
    
    it('should reject invalid session IDs', () => {
      expect(validateSessionId('short')).toBe(false); // Too short
      expect(validateSessionId('a'.repeat(51))).toBe(false); // Too long
      expect(validateSessionId('session@123')).toBe(false); // Invalid characters
      expect(validateSessionId('')).toBe(false); // Empty
    });
  });
  
  describe('validatePincode', () => {
    it('should accept valid Indian pincodes', () => {
      expect(validatePincode('560001')).toBe(true);
      expect(validatePincode('110001')).toBe(true);
      expect(validatePincode('400001')).toBe(true);
    });
    
    it('should reject invalid pincodes', () => {
      expect(validatePincode('12345')).toBe(false); // Too short
      expect(validatePincode('1234567')).toBe(false); // Too long
      expect(validatePincode('56000a')).toBe(false); // Contains letter
      expect(validatePincode('')).toBe(false); // Empty
    });
  });
});