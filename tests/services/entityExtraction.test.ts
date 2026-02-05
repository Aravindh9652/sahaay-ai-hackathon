/**
 * Unit tests for Entity Extraction Service
 */

import { EntityExtractionService } from '@/services/entityExtraction';

describe('EntityExtractionService', () => {
  let service: EntityExtractionService;

  beforeEach(() => {
    service = new EntityExtractionService();
  });

  describe('extractEntities', () => {
    it('should extract location entities from English text', async () => {
      const text = 'I am from Maharashtra and live in Mumbai with pincode 400001';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.location).toBeDefined();
      expect(result.entities.location?.state).toBe('maharashtra');
      expect(result.entities.location?.pincode).toBe('400001');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.detectedLanguages).toContain('en');
    });

    it('should extract location entities from Hindi text', async () => {
      const text = 'मैं महाराष्ट्र से हूं और मुंबई में रहता हूं';
      const result = await service.extractEntities(text, 'hi');

      expect(result.entities.location).toBeDefined();
      expect(result.entities.location?.state).toBe('महाराष्ट्र');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.detectedLanguages).toContain('hi');
    });

    it('should detect rural/urban indicators', async () => {
      const ruralText = 'I live in a village in Bihar';
      const urbanText = 'I live in the city of Delhi';

      const ruralResult = await service.extractEntities(ruralText, 'en');
      const urbanResult = await service.extractEntities(urbanText, 'en');

      expect(ruralResult.entities.location?.isRural).toBe(true);
      expect(urbanResult.entities.location?.isRural).toBe(false);
    });

    it('should extract scheme names from text', async () => {
      const text = 'I want to know about PM Kisan and Ayushman Bharat schemes';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.schemeNames).toBeDefined();
      expect(result.entities.schemeNames).toContain('pm kisan');
      expect(result.entities.schemeNames).toContain('ayushman bharat');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should extract scheme names from Hindi text', async () => {
      const text = 'मुझे पीएम किसान और आयुष्मान भारत योजना के बारे में जानना है';
      const result = await service.extractEntities(text, 'hi');

      expect(result.entities.schemeNames).toBeDefined();
      expect(result.entities.schemeNames).toContain('पीएम किसान');
      expect(result.entities.schemeNames).toContain('आयुष्मान भारत');
    });

    it('should extract demographic information', async () => {
      const text = 'I am a young farmer from SC category with low income';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.demographics).toBeDefined();
      expect(result.entities.demographics?.ageRange).toBe('18-35');
      expect(result.entities.demographics?.occupation).toBe('farmer');
      expect(result.entities.demographics?.category).toBe('sc');
      expect(result.entities.demographics?.incomeRange).toBe('below-2lakh');
    });

    it('should extract document types from text', async () => {
      const text = 'I have Aadhaar card, PAN card, and ration card';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.documentTypes).toBeDefined();
      expect(result.entities.documentTypes).toContain('aadhaar');
      expect(result.entities.documentTypes).toContain('pan');
      expect(result.entities.documentTypes).toContain('ration_card');
    });

    it('should extract document types from Hindi text', async () => {
      const text = 'मेरे पास आधार कार्ड, पैन कार्ड और राशन कार्ड है';
      const result = await service.extractEntities(text, 'hi');

      expect(result.entities.documentTypes).toBeDefined();
      expect(result.entities.documentTypes).toContain('aadhaar');
      expect(result.entities.documentTypes).toContain('pan');
      expect(result.entities.documentTypes).toContain('ration_card');
    });

    it('should extract time references', async () => {
      const text = 'The deadline is 31/12/2024 and processing takes 30 days';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.timeReferences).toBeDefined();
      expect(result.entities.timeReferences).toContain('31/12/2024');
      expect(result.entities.timeReferences).toContain('30 days');
    });

    it('should handle code-switching between languages', async () => {
      const text = 'मैं PM Kisan योजना के बारे में जानना चाहता हूं और मेरे पास aadhaar card है';
      const result = await service.extractEntities(text, 'hi');

      expect(result.codeSwitchingDetected).toBe(true);
      expect(result.detectedLanguages.length).toBeGreaterThan(1);
      expect(result.entities.schemeNames).toContain('pm kisan');
      expect(result.entities.documentTypes).toContain('aadhaar');
    });

    it('should handle empty text gracefully', async () => {
      const result = await service.extractEntities('', 'en');

      expect(result.entities).toEqual({});
      expect(result.confidence).toBe(0);
      expect(result.detectedLanguages).toContain('en');
      expect(result.codeSwitchingDetected).toBe(false);
    });

    it('should handle text with no entities', async () => {
      const text = 'Hello how are you today';
      const result = await service.extractEntities(text, 'en');

      expect(Object.keys(result.entities)).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    it('should extract multiple entities with proper confidence scoring', async () => {
      const text = 'I am a 25 year old farmer from Tamil Nadu with Aadhaar card looking for PM Kisan scheme';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.location?.state).toBe('tamil nadu');
      expect(result.entities.demographics?.ageRange).toBe('18-35');
      expect(result.entities.demographics?.occupation).toBe('farmer');
      expect(result.entities.documentTypes).toContain('aadhaar');
      expect(result.entities.schemeNames).toContain('pm kisan');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle Tamil text correctly', async () => {
      const text = 'நான் தமிழ் நாட்டில் இருந்து வந்த விவசாயி';
      const result = await service.extractEntities(text, 'ta');

      expect(result.detectedLanguages).toContain('ta');
      expect(result.entities.location?.state).toBe('தமிழ் நாடு');
      expect(result.entities.demographics?.occupation).toBe('farmer');
    });

    it('should handle Telugu text correctly', async () => {
      const text = 'నేను తెలంగాణ నుండి వచ్చిన రైతును';
      const result = await service.extractEntities(text, 'te');

      expect(result.detectedLanguages).toContain('te');
      expect(result.entities.location?.state).toBe('తెలంగాణ');
      expect(result.entities.demographics?.occupation).toBe('farmer');
    });

    it('should handle Bengali text correctly', async () => {
      const text = 'আমি পশ্চিমবঙ্গের একজন কৃষক';
      const result = await service.extractEntities(text, 'bn');

      expect(result.detectedLanguages).toContain('bn');
      expect(result.entities.location?.state).toBe('পশ্চিমবঙ্গ');
      expect(result.entities.demographics?.occupation).toBe('farmer');
    });

    it('should extract age ranges correctly', async () => {
      const childText = 'I am a school student';
      const youthText = 'I am a young graduate';
      const adultText = 'I am a working professional';
      const seniorText = 'I am a retired person';

      const childResult = await service.extractEntities(childText, 'en');
      const youthResult = await service.extractEntities(youthText, 'en');
      const adultResult = await service.extractEntities(adultText, 'en');
      const seniorResult = await service.extractEntities(seniorText, 'en');

      expect(childResult.entities.demographics?.ageRange).toBe('0-18');
      expect(youthResult.entities.demographics?.ageRange).toBe('18-35');
      expect(adultResult.entities.demographics?.ageRange).toBe('35-60');
      expect(seniorResult.entities.demographics?.ageRange).toBe('60+');
    });

    it('should extract income ranges correctly', async () => {
      const poorText = 'I am poor and below poverty line';
      const middleText = 'I am from middle class family';
      const upperMiddleText = 'I have good income and upper middle class';
      const richText = 'I am wealthy with high income';

      const poorResult = await service.extractEntities(poorText, 'en');
      const middleResult = await service.extractEntities(middleText, 'en');
      const upperMiddleResult = await service.extractEntities(upperMiddleText, 'en');
      const richResult = await service.extractEntities(richText, 'en');

      expect(poorResult.entities.demographics?.incomeRange).toBe('below-2lakh');
      expect(middleResult.entities.demographics?.incomeRange).toBe('2-5lakh');
      expect(upperMiddleResult.entities.demographics?.incomeRange).toBe('5-10lakh');
      expect(richResult.entities.demographics?.incomeRange).toBe('above-10lakh');
    });

    it('should extract social categories correctly', async () => {
      const scText = 'I belong to scheduled caste';
      const stText = 'I am from scheduled tribe';
      const obcText = 'I am from other backward class';
      const ewsText = 'I am from economically weaker section';
      const generalText = 'I am from general category';

      const scResult = await service.extractEntities(scText, 'en');
      const stResult = await service.extractEntities(stText, 'en');
      const obcResult = await service.extractEntities(obcText, 'en');
      const ewsResult = await service.extractEntities(ewsText, 'en');
      const generalResult = await service.extractEntities(generalText, 'en');

      expect(scResult.entities.demographics?.category).toBe('sc');
      expect(stResult.entities.demographics?.category).toBe('st');
      expect(obcResult.entities.demographics?.category).toBe('obc');
      expect(ewsResult.entities.demographics?.category).toBe('ews');
      expect(generalResult.entities.demographics?.category).toBe('general');
    });

    it('should extract occupations correctly', async () => {
      const farmerText = 'I am a farmer doing agriculture';
      const studentText = 'I am a student studying';
      const unemployedText = 'I am unemployed and jobless';
      const selfEmployedText = 'I am self employed with my business';
      const salariedText = 'I am a salaried employee';
      const retiredText = 'I am retired and getting pension';

      const farmerResult = await service.extractEntities(farmerText, 'en');
      const studentResult = await service.extractEntities(studentText, 'en');
      const unemployedResult = await service.extractEntities(unemployedText, 'en');
      const selfEmployedResult = await service.extractEntities(selfEmployedText, 'en');
      const salariedResult = await service.extractEntities(salariedText, 'en');
      const retiredResult = await service.extractEntities(retiredText, 'en');

      expect(farmerResult.entities.demographics?.occupation).toBe('farmer');
      expect(studentResult.entities.demographics?.occupation).toBe('student');
      expect(unemployedResult.entities.demographics?.occupation).toBe('unemployed');
      expect(selfEmployedResult.entities.demographics?.occupation).toBe('self-employed');
      expect(salariedResult.entities.demographics?.occupation).toBe('salaried');
      expect(retiredResult.entities.demographics?.occupation).toBe('retired');
    });

    it('should handle special characters and normalize text', async () => {
      const text = 'I am from Maharashtra!!! And I have Aadhaar@card...';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.location?.state).toBe('maharashtra');
      expect(result.entities.documentTypes).toContain('aadhaar');
    });

    it('should handle case insensitive matching', async () => {
      const text = 'I AM FROM TAMIL NADU AND HAVE PAN CARD';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.location?.state).toBe('tamil nadu');
      expect(result.entities.documentTypes).toContain('pan');
    });

    it('should extract multiple time references', async () => {
      const text = 'Deadline is 15 January 2024, processing takes 2 months, and verification needs 1 week';
      const result = await service.extractEntities(text, 'en');

      expect(result.entities.timeReferences).toBeDefined();
      expect(result.entities.timeReferences?.length).toBeGreaterThan(1);
      expect(result.entities.timeReferences).toContain('15 january 2024');
      expect(result.entities.timeReferences).toContain('2 months');
      expect(result.entities.timeReferences).toContain('1 week');
    });

    it('should handle error cases gracefully', async () => {
      // Test with null/undefined input (should be handled by normalization)
      const result = await service.extractEntities('', 'en');
      
      expect(result.entities).toEqual({});
      expect(result.confidence).toBe(0);
      expect(result.detectedLanguages).toContain('en');
      expect(result.codeSwitchingDetected).toBe(false);
    });
  });
});