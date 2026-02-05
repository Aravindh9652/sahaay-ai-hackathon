/**
 * Entity Extraction Service for Sahaay AI
 * 
 * Custom NER model for Indian government terminology
 * Extracts location, demographics, scheme names, and other entities
 * Handles code-switching between languages
 */

import { 
  EntitySet, 
  Location, 
  LanguageCode, 
  DocumentType, 
  AgeRange, 
  IncomeRange, 
  SocialCategory, 
  Occupation
} from '@/types';
import { detectLanguage } from '@/utils/multilingual';
import { logger } from '@/utils/logger';

export interface EntityExtractionResult {
  entities: EntitySet;
  confidence: number;
  detectedLanguages: LanguageCode[];
  codeSwitchingDetected: boolean;
}

export class EntityExtractionService {
  private readonly stateNames: Record<LanguageCode, string[]>;
  private readonly schemeKeywords: Record<LanguageCode, Record<string, string[]>>;
  private readonly documentKeywords: Record<LanguageCode, Record<DocumentType, string[]>>;
  private readonly demographicKeywords: Record<LanguageCode, Record<string, string[]>>;

  constructor() {
    this.stateNames = this.initializeStateNames();
    this.schemeKeywords = this.initializeSchemeKeywords();
    this.documentKeywords = this.initializeDocumentKeywords();
    this.demographicKeywords = this.initializeDemographicKeywords();
  }

  /**
   * Extract entities from text with support for code-switching
   */
  async extractEntities(text: string, primaryLanguage?: LanguageCode): Promise<EntityExtractionResult> {
    try {
      const normalizedText = this.normalizeText(text);
      const detectedLanguages = this.detectLanguagesInText(normalizedText);
      const codeSwitchingDetected = detectedLanguages.length > 1;
      
      logger.info('Extracting entities', { 
        textLength: text.length, 
        detectedLanguages, 
        codeSwitchingDetected 
      });

      const entities: EntitySet = {};
      let totalConfidence = 0;
      let entityCount = 0;

      // Extract location entities
      const locationResult = this.extractLocationEntities(normalizedText, detectedLanguages);
      if (locationResult.location) {
        entities.location = locationResult.location;
        totalConfidence += locationResult.confidence;
        entityCount++;
      }

      // Extract scheme names
      const schemeResult = this.extractSchemeNames(normalizedText, detectedLanguages);
      if (schemeResult.schemes.length > 0) {
        entities.schemeNames = schemeResult.schemes;
        totalConfidence += schemeResult.confidence;
        entityCount++;
      }

      // Extract demographic information
      const demographicResult = this.extractDemographics(normalizedText, detectedLanguages);
      if (Object.keys(demographicResult.demographics).length > 0) {
        entities.demographics = demographicResult.demographics;
        totalConfidence += demographicResult.confidence;
        entityCount++;
      }

      // Extract document types
      const documentResult = this.extractDocumentTypes(normalizedText, detectedLanguages);
      if (documentResult.documents.length > 0) {
        entities.documentTypes = documentResult.documents;
        totalConfidence += documentResult.confidence;
        entityCount++;
      }

      // Extract time references
      const timeResult = this.extractTimeReferences(normalizedText, detectedLanguages);
      if (timeResult.timeRefs.length > 0) {
        entities.timeReferences = timeResult.timeRefs;
        totalConfidence += timeResult.confidence;
        entityCount++;
      }

      const overallConfidence = entityCount > 0 ? totalConfidence / entityCount : 0;

      return {
        entities,
        confidence: overallConfidence,
        detectedLanguages,
        codeSwitchingDetected
      };
    } catch (error) {
      logger.error('Entity extraction failed', { error, text: text.substring(0, 100) });
      return {
        entities: {},
        confidence: 0,
        detectedLanguages: [primaryLanguage || 'en'],
        codeSwitchingDetected: false
      };
    }
  }

  /**
   * Detect multiple languages in text for code-switching handling
   */
  private detectLanguagesInText(text: string): LanguageCode[] {
    const languages = new Set<LanguageCode>();
    const words = text.split(/\s+/);
    
    // Check each word/phrase for language indicators
    for (const word of words) {
      const detectedLang = detectLanguage(word);
      languages.add(detectedLang);
    }

    // Also check the overall text
    const overallLang = detectLanguage(text);
    languages.add(overallLang);

    return Array.from(languages);
  }

  /**
   * Extract location entities (states, districts, pincodes)
   */
  private extractLocationEntities(text: string, languages: LanguageCode[]): {
    location?: Location;
    confidence: number;
  } {
    const location: Partial<Location> = {};
    let confidence = 0;
    let matches = 0;

    // Extract state names
    for (const lang of languages) {
      const stateNames = this.stateNames[lang] || [];
      for (const stateName of stateNames) {
        const regex = new RegExp(`\\b${this.escapeRegex(stateName)}\\b`, 'gi');
        if (regex.test(text)) {
          location.state = stateName;
          confidence += 0.9;
          matches++;
          break;
        }
      }
      if (location.state) break;
    }

    // Extract pincode
    const pincodeMatch = text.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      location.pincode = pincodeMatch[0];
      confidence += 0.8;
      matches++;
    }

    // Extract rural/urban indicators
    const ruralKeywords = ['गांव', 'village', 'rural', 'ग्रामीण', 'கிராமம்', 'గ్రామం', 'গ্রাম'];
    const urbanKeywords = ['शहर', 'city', 'urban', 'शहरी', 'நகரம்', 'నగరం', 'শহর'];
    
    for (const keyword of ruralKeywords) {
      if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
        location.isRural = true;
        confidence += 0.6;
        matches++;
        break;
      }
    }
    
    if (!location.isRural) {
      for (const keyword of urbanKeywords) {
        if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
          location.isRural = false;
          confidence += 0.6;
          matches++;
          break;
        }
      }
    }

    return {
      location: matches > 0 ? location as Location : undefined,
      confidence: matches > 0 ? confidence / matches : 0
    };
  }

  /**
   * Extract government scheme names
   */
  private extractSchemeNames(text: string, languages: LanguageCode[]): {
    schemes: string[];
    confidence: number;
  } {
    const schemes = new Set<string>();
    let confidence = 0;

    for (const lang of languages) {
      const schemeKeywords = this.schemeKeywords[lang] || {};
      
      for (const [category, keywords] of Object.entries(schemeKeywords)) {
        for (const keyword of keywords) {
          const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
          const matches = text.match(regex);
          if (matches) {
            schemes.add(keyword);
            confidence += 0.8;
          }
        }
      }
    }

    return {
      schemes: Array.from(schemes),
      confidence: schemes.size > 0 ? confidence / schemes.size : 0
    };
  }

  /**
   * Extract demographic information
   */
  private extractDemographics(text: string, languages: LanguageCode[]): {
    demographics: Partial<{
      ageRange?: AgeRange;
      incomeRange?: IncomeRange;
      category?: SocialCategory;
      occupation?: Occupation;
    }>;
    confidence: number;
  } {
    const demographics: any = {};
    let confidence = 0;
    let matches = 0;

    for (const lang of languages) {
      const keywords = this.demographicKeywords[lang] || {};

      // Extract age range
      if (!demographics.ageRange) {
        for (const [ageRange, ageKeywords] of Object.entries(keywords.age || {})) {
          for (const keyword of ageKeywords) {
            if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
              demographics.ageRange = ageRange as AgeRange;
              confidence += 0.7;
              matches++;
              break;
            }
          }
          if (demographics.ageRange) break;
        }
      }

      // Extract income range
      if (!demographics.incomeRange) {
        for (const [incomeRange, incomeKeywords] of Object.entries(keywords.income || {})) {
          for (const keyword of incomeKeywords) {
            if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
              demographics.incomeRange = incomeRange as IncomeRange;
              confidence += 0.7;
              matches++;
              break;
            }
          }
          if (demographics.incomeRange) break;
        }
      }

      // Extract social category
      if (!demographics.category) {
        for (const [category, categoryKeywords] of Object.entries(keywords.category || {})) {
          for (const keyword of categoryKeywords) {
            if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
              demographics.category = category as SocialCategory;
              confidence += 0.8;
              matches++;
              break;
            }
          }
          if (demographics.category) break;
        }
      }

      // Extract occupation
      if (!demographics.occupation) {
        for (const [occupation, occupationKeywords] of Object.entries(keywords.occupation || {})) {
          for (const keyword of occupationKeywords) {
            if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
              demographics.occupation = occupation as Occupation;
              confidence += 0.7;
              matches++;
              break;
            }
          }
          if (demographics.occupation) break;
        }
      }
    }

    return {
      demographics,
      confidence: matches > 0 ? confidence / matches : 0
    };
  }

  /**
   * Extract document types mentioned in text
   */
  private extractDocumentTypes(text: string, languages: LanguageCode[]): {
    documents: DocumentType[];
    confidence: number;
  } {
    const documents = new Set<DocumentType>();
    let confidence = 0;

    for (const lang of languages) {
      const docKeywords = this.documentKeywords[lang] || {};
      
      for (const [docType, keywords] of Object.entries(docKeywords)) {
        for (const keyword of keywords) {
          if (new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi').test(text)) {
            documents.add(docType as DocumentType);
            confidence += 0.8;
            break;
          }
        }
      }
    }

    return {
      documents: Array.from(documents),
      confidence: documents.size > 0 ? confidence / documents.size : 0
    };
  }

  /**
   * Extract time references (deadlines, durations, etc.)
   */
  private extractTimeReferences(text: string, languages: LanguageCode[]): {
    timeRefs: string[];
    confidence: number;
  } {
    const timeRefs = new Set<string>();
    let confidence = 0;

    // Date patterns
    const datePatterns = [
      /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g, // DD/MM/YYYY, DD-MM-YYYY
      /\b\d{1,2}\s+(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)\s+\d{4}\b/gi, // Hindi months
      /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, // English months
    ];

    // Duration patterns
    const durationPatterns = [
      /\b\d+\s*(दिन|महीना|साल|day|month|year|week|सप्ताह)s?\b/gi,
      /\b(एक|दो|तीन|चार|पांच|छह|सात|आठ|नौ|दस)\s*(दिन|महीना|साल|सप्ताह)\b/gi,
    ];

    // Apply date patterns
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          timeRefs.add(match.trim());
          confidence += 0.9;
        });
      }
    }

    // Apply duration patterns
    for (const pattern of durationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          timeRefs.add(match.trim());
          confidence += 0.7;
        });
      }
    }

    return {
      timeRefs: Array.from(timeRefs),
      confidence: timeRefs.size > 0 ? confidence / timeRefs.size : 0
    };
  }

  /**
   * Normalize text for better entity extraction
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/g, ' ') // Keep alphanumeric and Indian scripts
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Initialize state names in multiple languages
   */
  private initializeStateNames(): Record<LanguageCode, string[]> {
    return {
      en: [
        'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
        'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand',
        'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur',
        'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab',
        'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
        'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'mumbai'
      ],
      hi: [
        'आंध्र प्रदेश', 'अरुणाचल प्रदेश', 'असम', 'बिहार', 'छत्तीसगढ़',
        'गोवा', 'गुजरात', 'हरियाणा', 'हिमाचल प्रदेश', 'झारखंड',
        'कर्नाटक', 'केरल', 'मध्य प्रदेश', 'महाराष्ट्र', 'मणिपुर',
        'मेघालय', 'मिजोरम', 'नागालैंड', 'ओडिशा', 'पंजाब',
        'राजस्थान', 'सिक्किम', 'तमिल नाडु', 'तेलंगाना', 'त्रिपुरा',
        'उत्तर प्रदेश', 'उत्तराखंड', 'पश्चिम बंगाल', 'दिल्ली', 'मुंबई'
      ],
      ta: [
        'ஆந்திர பிரதேசம்', 'அருணாச்சல பிரதேசம்', 'அசாம்', 'பீகார்', 'சத்தீஸ்கர்',
        'கோவா', 'குஜராத்', 'ஹரியானா', 'இமாச்சல பிரதேசம்', 'ஜார்க்கண்ட்',
        'கர்நாடகா', 'கேரளா', 'மத்திய பிரதேசம்', 'மகாராஷ்டிரா', 'மணிப்பூர்',
        'மேகாலயா', 'மிசோரம்', 'நாகாலாந்து', 'ஒடிசா', 'பஞ்சாப்',
        'ராஜஸ்தான்', 'சிக்கிம்', 'தமிழ் நாடு', 'தெலங்கானா', 'திரிபுரா',
        'உத்தர பிரதேசம்', 'உத்தராகண்ட்', 'மேற்கு வங்காளம்', 'டெல்லி', 'மும்பை'
      ],
      te: [
        'ఆంధ్ర ప్రదేశ్', 'అరుణాచల్ ప్రదేశ్', 'అస్సాం', 'బీహార్', 'ఛత్తీస్‌గఢ్',
        'గోవా', 'గుజరాత్', 'హర్యానా', 'హిమాచల్ ప్రదేశ్', 'జార్ఖండ్',
        'కర్ణాటక', 'కేరళ', 'మధ్య ప్రదేశ్', 'మహారాష్ట్ర', 'మణిపూర్',
        'మేఘాలయ', 'మిజోరం', 'నాగాలాండ్', 'ఒడిశా', 'పంజాబ్',
        'రాజస్థాన్', 'సిక్కిం', 'తమిళ్ నాడు', 'తెలంగాణ', 'త్రిపుర',
        'ఉత్తర ప్రదేశ్', 'ఉత్తరాఖండ్', 'పశ్చిమ బెంగాల్', 'ఢిల్లీ', 'ముంబై'
      ],
      bn: [
        'অন্ধ্র প্রদেশ', 'অরুণাচল প্রদেশ', 'আসাম', 'বিহার', 'ছত্তিশগড়',
        'গোয়া', 'গুজরাট', 'হরিয়ানা', 'হিমাচল প্রদেশ', 'ঝাড়খণ্ড',
        'কর্ণাটক', 'কেরালা', 'মধ্য প্রদেশ', 'মহারাষ্ট্র', 'মণিপুর',
        'মেঘালয়', 'মিজোরাম', 'নাগাল্যান্ড', 'ওড়িশা', 'পাঞ্জাব',
        'রাজস্থান', 'সিকিম', 'তামিল নাড়ু', 'তেলেঙ্গানা', 'ত্রিপুরা',
        'উত্তর প্রদেশ', 'উত্তরাখণ্ড', 'পশ্চিমবঙ্গ', 'দিল্লি', 'মুম্বাই'
      ]
    };
  }

  /**
   * Initialize scheme keywords by category and language
   */
  private initializeSchemeKeywords(): Record<LanguageCode, Record<string, string[]>> {
    return {
      en: {
        agriculture: ['pm kisan', 'crop insurance', 'kisan credit card', 'msp', 'minimum support price', 'fasal bima'],
        education: ['scholarship', 'mid day meal', 'sarva shiksha abhiyan', 'beti bachao beti padhao', 'digital india'],
        healthcare: ['ayushman bharat', 'pmjay', 'janani suraksha yojana', 'mission indradhanush', 'swachh bharat'],
        employment: ['mgnrega', 'skill india', 'mudra loan', 'startup india', 'make in india', 'pmegp'],
        housing: ['pmay', 'pradhan mantri awas yojana', 'housing for all', 'indira awas yojana'],
        social_welfare: ['pension scheme', 'widow pension', 'disability pension', 'old age pension', 'atal pension'],
        financial_inclusion: ['jan dhan yojana', 'mudra yojana', 'stand up india', 'pradhan mantri suraksha bima']
      },
      hi: {
        agriculture: ['पीएम किसान', 'फसल बीमा', 'किसान क्रेडिट कार्ड', 'न्यूनतम समर्थन मूल्य', 'फसल बीमा योजना'],
        education: ['छात्रवृत्ति', 'मिड डे मील', 'सर्व शिक्षा अभियान', 'बेटी बचाओ बेटी पढ़ाओ', 'डिजिटल इंडिया'],
        healthcare: ['आयुष्मान भारत', 'जननी सुरक्षा योजना', 'मिशन इंद्रधनुष', 'स्वच्छ भारत'],
        employment: ['मनरेगा', 'स्किल इंडिया', 'मुद्रा लोन', 'स्टार्टअप इंडिया', 'मेक इन इंडिया'],
        housing: ['प्रधानमंत्री आवास योजना', 'सबके लिए आवास', 'इंदिरा आवास योजना'],
        social_welfare: ['पेंशन योजना', 'विधवा पेंशन', 'विकलांगता पेंशन', 'वृद्धावस्था पेंशन'],
        financial_inclusion: ['जन धन योजना', 'मुद्रा योजना', 'स्टैंड अप इंडिया']
      },
      ta: {
        agriculture: ['பிஎம் கிசான்', 'பயிர் காப்பீடு', 'கிசான் கிரெடிட் கார்டு', 'குறைந்தபட்ச ஆதரவு விலை'],
        education: ['உதவித்தொகை', 'மிட் டே மீல்', 'சர்வ சிக்ஷா அபியான்', 'பெட்டி பச்சாவோ பெட்டி படாவோ'],
        healthcare: ['ஆயுஷ்மான் பாரத்', 'ஜனனி சுரக்ஷா யோஜனா', 'மிஷன் இந்திரதனுஷ்'],
        employment: ['மக்னரேகா', 'ஸ்கில் இந்தியா', 'முத்ரா லோன்', 'ஸ்டார்ட்அப் இந்தியா'],
        housing: ['பிரதான் மந்திரி ஆவாஸ் யோஜனா', 'எல்லோருக்கும் வீடு'],
        social_welfare: ['ஓய்வூதிய திட்டம்', 'விதவை ஓய்வூதியம்', 'முதியோர் ஓய்வூதியம்'],
        financial_inclusion: ['ஜன் தன் யோஜனா', 'முத்ரா யோஜனா']
      },
      te: {
        agriculture: ['పిఎం కిసాన్', 'పంట బీమా', 'కిసాన్ క్రెడిట్ కార్డ్', 'కనీస మద్దతు ధర'],
        education: ['స్కాలర్‌షిప్', 'మిడ్ డే మీల్', 'సర్వ శిక్షా అభియాన్', 'బెట్టి బచావో బెట్టి పధావో'],
        healthcare: ['ఆయుష్మాన్ భారత్', 'జననీ సురక్షా యోజన', 'మిషన్ ఇంద్రధనుష్'],
        employment: ['మగ్నరేగా', 'స్కిల్ ఇండియా', 'ముద్రా లోన్', 'స్టార్టప్ ఇండియా'],
        housing: ['ప్రధాన మంత్రి ఆవాస్ యోజన', 'అందరికీ గృహాలు'],
        social_welfare: ['పెన్షన్ పథకం', 'వితంతువు పెన్షన్', 'వృద్ధాప్య పెన్షన్'],
        financial_inclusion: ['జన్ ధన్ యోజన', 'ముద్రా యోజన']
      },
      bn: {
        agriculture: ['পিএম কিসান', 'ফসল বীমা', 'কিসান ক্রেডিট কার্ড', 'ন্যূনতম সহায়ক মূল্য'],
        education: ['বৃত্তি', 'মিড ডে মিল', 'সর্ব শিক্ষা অভিযান', 'বেটি বাচাও বেটি পড়াও'],
        healthcare: ['আয়ুষ্মান ভারত', 'জননী সুরক্ষা যোজনা', 'মিশন ইন্দ্রধনুষ'],
        employment: ['মগনরেগা', 'স্কিল ইন্ডিয়া', 'মুদ্রা লোন', 'স্টার্টআপ ইন্ডিয়া'],
        housing: ['প্রধানমন্ত্রী আবাস যোজনা', 'সবার জন্য আবাস'],
        social_welfare: ['পেনশন স্কিম', 'বিধবা পেনশন', 'বার্ধক্য পেনশন'],
        financial_inclusion: ['জন ধন যোজনা', 'মুদ্রা যোজনা']
      }
    };
  }

  /**
   * Initialize document type keywords
   */
  private initializeDocumentKeywords(): Record<LanguageCode, Record<DocumentType, string[]>> {
    return {
      en: {
        aadhaar: ['aadhaar', 'aadhar', 'uid', 'unique id'],
        pan: ['pan card', 'pan', 'permanent account number'],
        voter_id: ['voter id', 'election card', 'epic'],
        driving_license: ['driving license', 'dl', 'license'],
        passport: ['passport'],
        birth_certificate: ['birth certificate', 'birth proof'],
        income_certificate: ['income certificate', 'income proof'],
        caste_certificate: ['caste certificate', 'sc certificate', 'st certificate', 'obc certificate'],
        domicile_certificate: ['domicile certificate', 'residence proof'],
        bank_passbook: ['bank passbook', 'bank statement', 'account details'],
        ration_card: ['ration card', 'bpl card', 'apl card'],
        property_documents: ['property papers', 'land documents', 'property deed'],
        educational_certificates: ['degree certificate', 'marksheet', 'educational qualification'],
        employment_proof: ['employment certificate', 'salary certificate', 'job proof'],
        disability_certificate: ['disability certificate', 'handicap certificate'],
        other: ['document', 'certificate', 'proof']
      },
      hi: {
        aadhaar: ['आधार', 'आधार कार्ड', 'यूआईडी'],
        pan: ['पैन कार्ड', 'पैन', 'स्थायी खाता संख्या'],
        voter_id: ['वोटर आईडी', 'मतदाता पहचान पत्र', 'चुनाव कार्ड'],
        driving_license: ['ड्राइविंग लाइसेंस', 'चालक लाइसेंस'],
        passport: ['पासपोर्ट'],
        birth_certificate: ['जन्म प्रमाण पत्र', 'जन्म प्रमाण'],
        income_certificate: ['आय प्रमाण पत्र', 'आय प्रमाण'],
        caste_certificate: ['जाति प्रमाण पत्र', 'एससी प्रमाण पत्र', 'एसटी प्रमाण पत्र', 'ओबीसी प्रमाण पत्र'],
        domicile_certificate: ['निवास प्रमाण पत्र', 'मूल निवासी प्रमाण पत्र'],
        bank_passbook: ['बैंक पासबुक', 'बैंक स्टेटमेंट', 'खाता विवरण'],
        ration_card: ['राशन कार्ड', 'बीपीएल कार्ड', 'एपीएल कार्ड'],
        property_documents: ['संपत्ति के कागजात', 'भूमि दस्तावेज', 'संपत्ति दस्तावेज'],
        educational_certificates: ['शिक्षा प्रमाण पत्र', 'डिग्री', 'मार्कशीट'],
        employment_proof: ['रोजगार प्रमाण पत्र', 'वेतन प्रमाण पत्र', 'नौकरी प्रमाण'],
        disability_certificate: ['विकलांगता प्रमाण पत्र', 'दिव्यांग प्रमाण पत्र'],
        other: ['दस्तावेज', 'प्रमाण पत्र', 'प्रमाण']
      },
      ta: {
        aadhaar: ['ஆதார்', 'ஆதார் கார்டு', 'யூஐடி'],
        pan: ['பான் கார்டு', 'பான்', 'நிரந்தர கணக்கு எண்'],
        voter_id: ['வாக்காளர் அடையாள அட்டை', 'தேர்தல் அட்டை'],
        driving_license: ['ஓட்டுநர் உரிமம்', 'டிஎல்'],
        passport: ['பாஸ்போர்ட்'],
        birth_certificate: ['பிறப்பு சான்றிதழ்', 'பிறப்பு ஆதாரம்'],
        income_certificate: ['வருமான சான்றிதழ்', 'வருமான ஆதாரம்'],
        caste_certificate: ['சாதி சான்றிதழ்', 'எஸ்சி சான்றிதழ்', 'எஸ்டி சான்றிதழ்'],
        domicile_certificate: ['வதிவிட சான்றிதழ்', 'குடியிருப்பு ஆதாரம்'],
        bank_passbook: ['வங்கி பாஸ்புக்', 'வங்கி அறிக்கை'],
        ration_card: ['ரேஷன் கார்டு', 'பிபிஎல் கார்டு'],
        property_documents: ['சொத்து ஆவணங்கள்', 'நில ஆவணங்கள்'],
        educational_certificates: ['கல்வி சான்றிதழ்கள்', 'பட்டம்', 'மதிப்பெண் பட்டியல்'],
        employment_proof: ['வேலை சான்றிதழ்', 'சம்பள சான்றிதழ்'],
        disability_certificate: ['மாற்றுத்திறன் சான்றிதழ்'],
        other: ['ஆவணம்', 'சான்றிதழ்', 'ஆதாரம்']
      },
      te: {
        aadhaar: ['ఆధార్', 'ఆధార్ కార్డు', 'యూఐడి'],
        pan: ['పాన్ కార్డు', 'పాన్', 'శాశ్వత ఖాతా సంఖ్య'],
        voter_id: ['ఓటర్ ఐడి', 'ఎన్నికల కార్డు'],
        driving_license: ['డ్రైవింగ్ లైసెన్స్', 'డిఎల్'],
        passport: ['పాస్‌పోర్ట్'],
        birth_certificate: ['జనన ధృవీకరణ పత్రం', 'జనన ప్రమాణం'],
        income_certificate: ['ఆదాయ ధృవీకరణ పత్రం', 'ఆదాయ ప్రమాణం'],
        caste_certificate: ['కుల ధృవీకరణ పత్రం', 'ఎస్సి ధృవీకరణ పత్రం'],
        domicile_certificate: ['నివాస ధృవీకరణ పత్రం', 'నివాస ప్రమాణం'],
        bank_passbook: ['బ్యాంక్ పాస్‌బుక్', 'బ్యాంక్ స్టేట్‌మెంట్'],
        ration_card: ['రేషన్ కార్డు', 'బిపిఎల్ కార్డు'],
        property_documents: ['ఆస్తి పత్రాలు', 'భూమి పత్రాలు'],
        educational_certificates: ['విద్యా ధృవీకరణ పత్రాలు', 'డిగ్రీ', 'మార్క్‌షీట్'],
        employment_proof: ['ఉద్యోగ ధృవీకరణ పత్రం', 'జీతం ధృవీకరణ పత్రం'],
        disability_certificate: ['వైకల్య ధృవీకరణ పత్రం'],
        other: ['పత్రం', 'ధృవీకరణ పత్రం', 'ప్రమాణం']
      },
      bn: {
        aadhaar: ['আধার', 'আধার কার্ড', 'ইউআইডি'],
        pan: ['প্যান কার্ড', 'প্যান', 'স্থায়ী অ্যাকাউন্ট নম্বর'],
        voter_id: ['ভোটার আইডি', 'নির্বাচনী কার্ড'],
        driving_license: ['ড্রাইভিং লাইসেন্স', 'ডিএল'],
        passport: ['পাসপোর্ট'],
        birth_certificate: ['জন্ম সনদ', 'জন্ম প্রমাণ'],
        income_certificate: ['আয় সনদ', 'আয় প্রমাণ'],
        caste_certificate: ['জাতি সনদ', 'এসসি সনদ', 'এসটি সনদ'],
        domicile_certificate: ['বাসস্থান সনদ', 'নিবাস প্রমাণ'],
        bank_passbook: ['ব্যাংক পাসবুক', 'ব্যাংক স্টেটমেন্ট'],
        ration_card: ['রেশন কার্ড', 'বিপিএল কার্ড'],
        property_documents: ['সম্পত্তির কাগজপত্র', 'জমির দলিল'],
        educational_certificates: ['শিক্ষাগত সনদ', 'ডিগ্রি', 'মার্কশিট'],
        employment_proof: ['চাকরির সনদ', 'বেতন সনদ'],
        disability_certificate: ['প্রতিবন্ধী সনদ'],
        other: ['দলিল', 'সনদ', 'প্রমাণ']
      }
    };
  }

  /**
   * Initialize demographic keywords
   */
  private initializeDemographicKeywords(): Record<LanguageCode, Record<string, Record<string, string[]>>> {
    return {
      en: {
        age: {
          '0-18': ['child', 'minor', 'student', 'school', 'teenager'],
          '18-35': ['young', 'youth', 'college', 'graduate', 'fresh'],
          '35-60': ['middle age', 'adult', 'working', 'professional'],
          '60+': ['senior', 'elderly', 'old', 'retired', 'pension']
        },
        income: {
          'below-2lakh': ['poor', 'bpl', 'low income', 'below poverty'],
          '2-5lakh': ['middle class', 'moderate income'],
          '5-10lakh': ['upper middle class', 'good income'],
          'above-10lakh': ['high income', 'rich', 'wealthy']
        },
        category: {
          'sc': ['scheduled caste', 'sc', 'dalit'],
          'st': ['scheduled tribe', 'st', 'tribal', 'adivasi'],
          'obc': ['other backward class', 'obc', 'backward'],
          'ews': ['economically weaker section', 'ews'],
          'general': ['general', 'open', 'unreserved']
        },
        occupation: {
          'farmer': ['farmer', 'agriculture', 'farming', 'cultivator'],
          'student': ['student', 'studying', 'education'],
          'unemployed': ['unemployed', 'jobless', 'no job'],
          'self-employed': ['self employed', 'business', 'entrepreneur'],
          'salaried': ['salaried', 'job', 'employee', 'working'],
          'retired': ['retired', 'pension', 'former']
        }
      },
      hi: {
        age: {
          '0-18': ['बच्चा', 'नाबालिग', 'छात्र', 'स्कूल', 'किशोर'],
          '18-35': ['युवा', 'जवान', 'कॉलेज', 'स्नातक'],
          '35-60': ['मध्यम आयु', 'वयस्क', 'काम करने वाला'],
          '60+': ['बुजुर्ग', 'बूढ़ा', 'सेवानिवृत्त', 'पेंशन']
        },
        income: {
          'below-2lakh': ['गरीब', 'बीपीएल', 'कम आय', 'गरीबी रेखा के नीचे'],
          '2-5lakh': ['मध्यम वर्गीय', 'मध्यम आय'],
          '5-10lakh': ['उच्च मध्यम वर्गीय', 'अच्छी आय'],
          'above-10lakh': ['उच्च आय', 'अमीर', 'धनी']
        },
        category: {
          'sc': ['अनुसूचित जाति', 'एससी', 'दलित'],
          'st': ['अनुसूचित जनजाति', 'एसटी', 'आदिवासी'],
          'obc': ['अन्य पिछड़ा वर्ग', 'ओबीसी', 'पिछड़ा'],
          'ews': ['आर्थिक रूप से कमजोर वर्ग', 'ईडब्ल्यूएस'],
          'general': ['सामान्य', 'खुला', 'अनारक्षित']
        },
        occupation: {
          'farmer': ['किसान', 'कृषि', 'खेती', 'कृषक'],
          'student': ['छात्र', 'पढ़ाई', 'शिक्षा'],
          'unemployed': ['बेरोजगार', 'नौकरी नहीं'],
          'self-employed': ['स्वरोजगार', 'व्यापार', 'उद्यमी'],
          'salaried': ['वेतनभोगी', 'नौकरी', 'कर्मचारी'],
          'retired': ['सेवानिवृत्त', 'पेंशन', 'पूर्व']
        }
      },
      ta: {
        age: {
          '0-18': ['குழந்தை', 'மைனர்', 'மாணவர்', 'பள்ளி'],
          '18-35': ['இளைஞர்', 'युवा', 'கல்லூரி'],
          '35-60': ['நடுத்தர வயது', 'வயது வந்தோர்'],
          '60+': ['முதியோர்', 'வயதானவர்', 'ஓய்வு பெற்றவர்']
        },
        income: {
          'below-2lakh': ['ஏழை', 'பிபிஎல்', 'குறைந்த வருமானம்'],
          '2-5lakh': ['நடுத்தர வர்க்கம்'],
          '5-10lakh': ['உயர் நடுத்தர வர்க்கம்'],
          'above-10lakh': ['அதிக வருமானம்', 'பணக்காரர்']
        },
        category: {
          'sc': ['பட்டியல் சாதி', 'எஸ்சி'],
          'st': ['பட்டியல் பழங்குடி', 'எஸ்டி'],
          'obc': ['பிற பிற்படுத்தப்பட்ட வகுப்பு', 'ஓபிசி'],
          'ews': ['பொருளாதார ரீதியாக பலவீனமான பிரிவு'],
          'general': ['பொது', 'திறந்த']
        },
        occupation: {
          'farmer': ['விவசாயி', 'வேளாண்மை', 'பயிர்'],
          'student': ['மாணவர்', 'படிப்பு'],
          'unemployed': ['வேலையில்லாதவர்'],
          'self-employed': ['சுயதொழில்', 'வணிகம்'],
          'salaried': ['சம்பளம்', 'வேலை'],
          'retired': ['ஓய்வு பெற்ற', 'பென்ஷன்']
        }
      },
      te: {
        age: {
          '0-18': ['పిల్లవాడు', 'మైనర్', 'విద్యార్థి', 'పాఠశాల'],
          '18-35': ['యువకుడు', 'యువత', 'కాలేజీ'],
          '35-60': ['మధ్య వయస్సు', 'పెద్దవాడు'],
          '60+': ['వృద్ధుడు', 'పెద్దవాడు', 'పదవీ విరమణ']
        },
        income: {
          'below-2lakh': ['పేదవాడు', 'బిపిఎల్', 'తక్కువ ఆదాయం'],
          '2-5lakh': ['మధ్యతరగతి'],
          '5-10lakh': ['ఉన్నత మధ్యతరగతి'],
          'above-10lakh': ['అధిక ఆదాయం', 'ధనవంతుడు']
        },
        category: {
          'sc': ['షెడ్యూల్డ్ కాస్ట్', 'ఎస్సి'],
          'st': ['షెడ్యూల్డ్ ట్రైబ్', 'ఎస్టి'],
          'obc': ['ఇతర వెనుకబడిన తరగతులు', 'ఓబిసి'],
          'ews': ['ఆర్థికంగా బలహీన వర్గం'],
          'general': ['సాధారణ', 'ఓపెన్']
        },
        occupation: {
          'farmer': ['రైతు', 'వ్యవసాయం', 'సాగు'],
          'student': ['విద్యార్థి', 'చదువు'],
          'unemployed': ['నిరుద్యోగి'],
          'self-employed': ['స్వయం ఉపాధి', 'వ్యాపారం'],
          'salaried': ['జీతం', 'ఉద్యోగం'],
          'retired': ['పదవీ విరమణ', 'పెన్షన్']
        }
      },
      bn: {
        age: {
          '0-18': ['শিশু', 'মাইনর', 'ছাত্র', 'স্কুল'],
          '18-35': ['যুবক', 'তরুণ', 'কলেজ'],
          '35-60': ['মধ্য বয়স্ক', 'প্রাপ্তবয়স্ক'],
          '60+': ['বয়স্ক', 'বৃদ্ধ', 'অবসরপ্রাপ্ত']
        },
        income: {
          'below-2lakh': ['গরিব', 'বিপিএল', 'কম আয়'],
          '2-5lakh': ['মধ্যবিত্ত'],
          '5-10lakh': ['উচ্চ মধ্যবিত্ত'],
          'above-10lakh': ['উচ্চ আয়', 'ধনী']
        },
        category: {
          'sc': ['তফসিলি জাতি', 'এসসি'],
          'st': ['তফসিলি উপজাতি', 'এসটি'],
          'obc': ['অন্যান্য অনগ্রসর শ্রেণী', 'ওবিসি'],
          'ews': ['অর্থনৈতিকভাবে দুর্বল অংশ'],
          'general': ['সাধারণ', 'খোলা']
        },
        occupation: {
          'farmer': ['কৃষক', 'কৃষি', 'চাষ'],
          'student': ['ছাত্র', 'পড়াশোনা'],
          'unemployed': ['বেকার'],
          'self-employed': ['স্ব-নিযুক্ত', 'ব্যবসা'],
          'salaried': ['বেতনভুক্ত', 'চাকরি'],
          'retired': ['অবসরপ্রাপ্ত', 'পেনশন']
        }
      }
    };
  }
}

// Export singleton instance
export const entityExtractionService = new EntityExtractionService();