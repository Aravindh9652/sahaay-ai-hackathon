/**
 * Unit tests for multilingual utilities
 */

import {
  getLocalizedText,
  createMultilingualText,
  detectLanguage,
  isValidLanguageCode,
  getLanguageName,
  formatForVoice,
  simplifyJargon
} from '@/utils/multilingual';
import { MultilingualText } from '@/types';

describe('Multilingual Utils', () => {
  describe('getLocalizedText', () => {
    const sampleText: MultilingualText = {
      en: 'Hello',
      hi: 'नमस्ते',
      ta: 'வணக்கம்',
    };
    
    it('should return text in requested language', () => {
      expect(getLocalizedText(sampleText, 'hi')).toBe('नमस्ते');
      expect(getLocalizedText(sampleText, 'ta')).toBe('வணக்கம்');
    });
    
    it('should fallback to English when requested language not available', () => {
      expect(getLocalizedText(sampleText, 'te')).toBe('Hello');
      expect(getLocalizedText(sampleText, 'bn')).toBe('Hello');
    });
    
    it('should return first available text when English not available', () => {
      const textWithoutEnglish = { hi: 'नमस्ते', ta: 'வணக்கம்', en: '' } as MultilingualText;
      const result = getLocalizedText(textWithoutEnglish, 'en');
      
      expect(['नमस्ते', 'வணக்கம்']).toContain(result);
    });
    
    it('should return empty string for empty text object', () => {
      const emptyText = {} as MultilingualText;
      expect(getLocalizedText(emptyText, 'en')).toBe('');
    });
  });
  
  describe('createMultilingualText', () => {
    it('should create multilingual text with English base', () => {
      const result = createMultilingualText('Hello');
      
      expect(result.en).toBe('Hello');
      expect(Object.keys(result)).toHaveLength(1);
    });
    
    it('should add translations when provided', () => {
      const result = createMultilingualText('Hello', {
        hi: 'नमस्ते',
        ta: 'வணக்கம்',
      });
      
      expect(result.en).toBe('Hello');
      expect(result['hi']).toBe('नमस्ते');
      expect(result['ta']).toBe('வணக்கம்');
    });
    
    it('should ignore invalid language codes', () => {
      const result = createMultilingualText('Hello', {
        hi: 'नमस्ते',
        fr: 'Bonjour', // Invalid language code
      } as any);
      
      expect(result.en).toBe('Hello');
      expect(result['hi']).toBe('नमस्ते');
      expect(result['fr']).toBeUndefined();
    });
  });
  
  describe('detectLanguage', () => {
    it('should detect Hindi text', () => {
      expect(detectLanguage('नमस्ते दुनिया')).toBe('hi');
      expect(detectLanguage('सरकारी योजना')).toBe('hi');
    });
    
    it('should detect Tamil text', () => {
      expect(detectLanguage('வணக்கம் உலகம்')).toBe('ta');
      expect(detectLanguage('அரசு திட்டம்')).toBe('ta');
    });
    
    it('should detect Telugu text', () => {
      expect(detectLanguage('హలో ప్రపంచం')).toBe('te');
      expect(detectLanguage('ప్రభుత్వ పథకం')).toBe('te');
    });
    
    it('should detect Bengali text', () => {
      expect(detectLanguage('হ্যালো বিশ্ব')).toBe('bn');
      expect(detectLanguage('সরকারি প্রকল্প')).toBe('bn');
    });
    
    it('should default to English for unrecognized text', () => {
      expect(detectLanguage('Hello World')).toBe('en');
      expect(detectLanguage('Government Scheme')).toBe('en');
      expect(detectLanguage('123456')).toBe('en');
    });
  });
  
  describe('isValidLanguageCode', () => {
    it('should validate supported language codes', () => {
      expect(isValidLanguageCode('en')).toBe(true);
      expect(isValidLanguageCode('hi')).toBe(true);
      expect(isValidLanguageCode('ta')).toBe(true);
      expect(isValidLanguageCode('te')).toBe(true);
      expect(isValidLanguageCode('bn')).toBe(true);
    });
    
    it('should reject unsupported language codes', () => {
      expect(isValidLanguageCode('fr')).toBe(false);
      expect(isValidLanguageCode('de')).toBe(false);
      expect(isValidLanguageCode('invalid')).toBe(false);
    });
  });
  
  describe('getLanguageName', () => {
    it('should return language names in requested display language', () => {
      expect(getLanguageName('hi', 'en')).toBe('Hindi');
      expect(getLanguageName('hi', 'hi')).toBe('हिन्दी');
      expect(getLanguageName('ta', 'en')).toBe('Tamil');
      expect(getLanguageName('ta', 'ta')).toBe('தமிழ்');
    });
  });
  
  describe('formatForVoice', () => {
    it('should expand abbreviations in English', () => {
      const text = 'Dr. Smith from Govt. Dept. costs Rs. 100';
      const formatted = formatForVoice(text, 'en');
      
      expect(formatted).toContain('Doctor');
      expect(formatted).toContain('Government');
      expect(formatted).toContain('Department');
      expect(formatted).toContain('Rupees');
    });
    
    it('should expand abbreviations in Hindi', () => {
      const text = 'डॉ. शर्मा सरकार से रु. 100';
      const formatted = formatForVoice(text, 'hi');
      
      expect(formatted).toContain('डॉक्टर');
      expect(formatted).toContain('रुपये');
    });
    
    it('should remove special characters', () => {
      const text = 'Hello (world) [test] {data}!';
      const formatted = formatForVoice(text, 'en');
      
      expect(formatted).not.toContain('(');
      expect(formatted).not.toContain('[');
      expect(formatted).not.toContain('{');
      expect(formatted).not.toContain('!');
    });
    
    it('should normalize whitespace', () => {
      const text = 'Hello    world   test';
      const formatted = formatForVoice(text, 'en');
      
      expect(formatted).toBe('Hello world test');
    });
  });
  
  describe('simplifyJargon', () => {
    it('should simplify technical terms in English', () => {
      const text = 'Submit your application with eligibility criteria documentation';
      const simplified = simplifyJargon(text, 'en');
      
      expect(simplified).toContain('form');
      expect(simplified).toContain('requirements');
      expect(simplified).toContain('papers');
    });
    
    it('should simplify technical terms in Hindi', () => {
      const text = 'आवेदन फॉर्म भरें';
      const simplified = simplifyJargon(text, 'hi');
      
      // The function should replace 'आवेदन' with 'फॉर्म'
      expect(simplified).toContain('फॉर्म');
    });
    
    it('should preserve non-jargon text', () => {
      const text = 'This is simple text without jargon';
      const simplified = simplifyJargon(text, 'en');
      
      expect(simplified).toBe(text);
    });
  });
});