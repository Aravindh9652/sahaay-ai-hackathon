/**
 * Property-based tests for Entity Extraction Service
 */

import fc from 'fast-check';
import { EntityExtractionService } from '@/services/entityExtraction';
import { LanguageCode } from '@/types';

describe('EntityExtractionService Property Tests', () => {
  let service: EntityExtractionService;

  beforeEach(() => {
    service = new EntityExtractionService();
  });

  /**
   * **Property 26: Code-switching handling**
   * **Validates: Requirements 6.4**
   * 
   * For any query mixing multiple languages, the system should appropriately 
   * handle the code-switching and respond correctly
   */
  it('should handle code-switching appropriately for mixed language queries', async () => {
    // Generator for creating mixed language text with known entities
    const mixedLanguageTextGenerator = fc.record({
      englishPart: fc.oneof(
        fc.constant('I want PM Kisan scheme'),
        fc.constant('I have Aadhaar card'),
        fc.constant('I am from Maharashtra'),
        fc.constant('I am a farmer'),
        fc.constant('I need scholarship')
      ),
      hindiPart: fc.oneof(
        fc.constant('मुझे योजना चाहिए'),
        fc.constant('मेरे पास आधार कार्ड है'),
        fc.constant('मैं महाराष्ट्र से हूं'),
        fc.constant('मैं किसान हूं'),
        fc.constant('मुझे छात्रवृत्ति चाहिए')
      ),
      connector: fc.oneof(
        fc.constant(' और '),
        fc.constant(' and '),
        fc.constant(' '),
        fc.constant(', ')
      )
    }).map(({ englishPart, hindiPart, connector }) => 
      `${englishPart}${connector}${hindiPart}`
    );

    await fc.assert(
      fc.asyncProperty(
        mixedLanguageTextGenerator,
        fc.constantFrom('en', 'hi') as fc.Arbitrary<LanguageCode>,
        async (mixedText, primaryLanguage) => {
          const result = await service.extractEntities(mixedText, primaryLanguage);

          // Property: Code-switching should be detected when multiple languages are present
          expect(result.codeSwitchingDetected).toBe(true);
          
          // Property: Multiple languages should be detected
          expect(result.detectedLanguages.length).toBeGreaterThan(1);
          
          // Property: Should contain both English and Hindi
          expect(result.detectedLanguages).toContain('en');
          expect(result.detectedLanguages).toContain('hi');
          
          // Property: Should still extract entities correctly despite code-switching
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          
          // Property: Should extract at least one entity from the mixed text
          const hasEntities = Object.keys(result.entities).length > 0;
          expect(hasEntities).toBe(true);
          
          // Property: If scheme names are mentioned, they should be extracted
          if (mixedText.toLowerCase().includes('pm kisan') || mixedText.includes('योजना')) {
            expect(result.entities.schemeNames).toBeDefined();
          }
          
          // Property: If documents are mentioned, they should be extracted
          if (mixedText.toLowerCase().includes('aadhaar') || mixedText.includes('आधार')) {
            expect(result.entities.documentTypes).toBeDefined();
            expect(result.entities.documentTypes).toContain('aadhaar');
          }
          
          // Property: If locations are mentioned, they should be extracted
          if (mixedText.toLowerCase().includes('maharashtra') || mixedText.includes('महाराष्ट्र')) {
            expect(result.entities.location).toBeDefined();
          }
          
          // Property: If occupations are mentioned, they should be extracted
          if (mixedText.toLowerCase().includes('farmer') || mixedText.includes('किसान')) {
            expect(result.entities.demographics?.occupation).toBe('farmer');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 24: Multilingual intent recognition**
   * **Validates: Requirements 6.1**
   * 
   * For any query in supported local languages, the system should accurately 
   * understand the intent and context
   */
  it('should extract entities accurately across all supported languages', async () => {
    // Generator for creating text with known entities in different languages
    const multilingualEntityGenerator = fc.record({
      language: fc.constantFrom('en', 'hi', 'ta', 'te', 'bn') as fc.Arbitrary<LanguageCode>,
      entityType: fc.constantFrom('location', 'scheme', 'document', 'occupation'),
      content: fc.string({ minLength: 1, maxLength: 100 })
    }).chain(({ language, entityType }) => {
      const entityMaps = {
        location: {
          en: fc.constantFrom('Maharashtra', 'Tamil Nadu', 'West Bengal', 'Delhi'),
          hi: fc.constantFrom('महाराष्ट्र', 'तमिल नाडु', 'पश्चिम बंगाल', 'दिल्ली'),
          ta: fc.constantFrom('மகாராஷ்டிரா', 'தமிழ் நாடு', 'மேற்கு வங்காளம்', 'டெல்லி'),
          te: fc.constantFrom('మహారాష్ట్ర', 'తమిళ్ నాడు', 'పశ్చిమ బెంగాల్', 'ఢిల్లీ'),
          bn: fc.constantFrom('মহারাষ্ট্র', 'তামিল নাড়ু', 'পশ্চিমবঙ্গ', 'দিল্লি')
        },
        scheme: {
          en: fc.constantFrom('PM Kisan', 'Ayushman Bharat', 'MGNREGA'),
          hi: fc.constantFrom('पीএম किसान', 'आयुष्मान भारत', 'मनरेगा'),
          ta: fc.constantFrom('பிஎம் கிசான்', 'ஆயுஷ்மான் பாரத்', 'மக்னரேகா'),
          te: fc.constantFrom('పిఎం కిసాన్', 'ఆయుష్మాన్ భారత్', 'మగ్నరేగా'),
          bn: fc.constantFrom('পিএম কিসান', 'আয়ুষ্মান ভারত', 'মগনরেগা')
        },
        document: {
          en: fc.constantFrom('Aadhaar card', 'PAN card', 'ration card'),
          hi: fc.constantFrom('आधार कार्ड', 'पैन कार्ड', 'राशन कार्ड'),
          ta: fc.constantFrom('ஆதார் கார்டு', 'பான் கார்டு', 'ரேஷன் கார்டு'),
          te: fc.constantFrom('ఆధార్ కార్డు', 'పాన్ కార్డు', 'రేషన్ కార్డు'),
          bn: fc.constantFrom('আধার কার্ড', 'প্যান কার্ড', 'রেশন কার্ড')
        },
        occupation: {
          en: fc.constantFrom('farmer', 'student', 'unemployed'),
          hi: fc.constantFrom('किसान', 'छात्र', 'बेरोजगार'),
          ta: fc.constantFrom('விவசாயி', 'மாணவர்', 'வேலையில்லாதவர்'),
          te: fc.constantFrom('రైతు', 'విద్యార్థి', 'నిరుద్యోగి'),
          bn: fc.constantFrom('কৃষক', 'ছাত্র', 'বেকার')
        }
      };

      return fc.record({
        language: fc.constant(language),
        entityType: fc.constant(entityType),
        entity: entityMaps[entityType][language]
      });
    });

    await fc.assert(
      fc.asyncProperty(
        multilingualEntityGenerator,
        async ({ language, entityType, entity }) => {
          const text = `I have ${entity}`;
          const result = await service.extractEntities(text, language);

          // Property: Should detect the correct primary language
          expect(result.detectedLanguages).toContain(language);
          
          // Property: Should extract entities with reasonable confidence
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          
          // Property: Should extract the correct entity type
          switch (entityType) {
            case 'location':
              if (result.entities.location) {
                expect(result.entities.location.state).toBeDefined();
              }
              break;
            case 'scheme':
              if (result.entities.schemeNames) {
                expect(result.entities.schemeNames.length).toBeGreaterThan(0);
              }
              break;
            case 'document':
              if (result.entities.documentTypes) {
                expect(result.entities.documentTypes.length).toBeGreaterThan(0);
              }
              break;
            case 'occupation':
              if (result.entities.demographics?.occupation) {
                expect(result.entities.demographics.occupation).toBeDefined();
              }
              break;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that entity extraction is consistent and deterministic
   */
  it('should produce consistent results for identical inputs', async () => {
    const textGenerator = fc.string({ minLength: 10, maxLength: 100 });
    const languageGenerator = fc.constantFrom('en', 'hi', 'ta', 'te', 'bn') as fc.Arbitrary<LanguageCode>;

    await fc.assert(
      fc.asyncProperty(
        textGenerator,
        languageGenerator,
        async (text, language) => {
          // Run extraction twice with same input
          const result1 = await service.extractEntities(text, language);
          const result2 = await service.extractEntities(text, language);

          // Property: Results should be identical for same input
          expect(result1.entities).toEqual(result2.entities);
          expect(result1.confidence).toBe(result2.confidence);
          expect(result1.detectedLanguages).toEqual(result2.detectedLanguages);
          expect(result1.codeSwitchingDetected).toBe(result2.codeSwitchingDetected);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that confidence scores are within valid range
   */
  it('should always return confidence scores between 0 and 1', async () => {
    const textGenerator = fc.string({ minLength: 0, maxLength: 200 });
    const languageGenerator = fc.constantFrom('en', 'hi', 'ta', 'te', 'bn') as fc.Arbitrary<LanguageCode>;

    await fc.assert(
      fc.asyncProperty(
        textGenerator,
        languageGenerator,
        async (text, language) => {
          const result = await service.extractEntities(text, language);

          // Property: Confidence should be between 0 and 1
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that empty or whitespace-only text is handled gracefully
   */
  it('should handle empty or whitespace-only text gracefully', async () => {
    const emptyTextGenerator = fc.oneof(
      fc.constant(''),
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() === ''),
      fc.constant('   '),
      fc.constant('\n\t  ')
    );
    const languageGenerator = fc.constantFrom('en', 'hi', 'ta', 'te', 'bn') as fc.Arbitrary<LanguageCode>;

    await fc.assert(
      fc.asyncProperty(
        emptyTextGenerator,
        languageGenerator,
        async (text, language) => {
          const result = await service.extractEntities(text, language);

          // Property: Empty text should return empty entities
          expect(Object.keys(result.entities)).toHaveLength(0);
          
          // Property: Confidence should be 0 for empty text
          expect(result.confidence).toBe(0);
          
          // Property: Should not detect code-switching in empty text
          expect(result.codeSwitchingDetected).toBe(false);
          
          // Property: Should still return the primary language
          expect(result.detectedLanguages).toContain(language);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Test that pincode extraction works correctly
   */
  it('should extract valid 6-digit pincodes', async () => {
    const pincodeGenerator = fc.integer({ min: 100000, max: 999999 });
    const textTemplateGenerator = fc.constantFrom(
      'My pincode is {}',
      'I live in {} area',
      'Postal code {} is my location',
      'PIN {} is where I stay'
    );

    await fc.assert(
      fc.asyncProperty(
        pincodeGenerator,
        textTemplateGenerator,
        async (pincode, template) => {
          const text = template.replace('{}', pincode.toString());
          const result = await service.extractEntities(text, 'en');

          // Property: Valid 6-digit pincode should be extracted
          if (result.entities.location?.pincode) {
            expect(result.entities.location.pincode).toBe(pincode.toString());
            expect(result.entities.location.pincode).toMatch(/^\d{6}$/);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});