/**
 * Multilingual text handling utilities for Sahaay AI
 */

import { MultilingualText, LanguageCode } from '@/types';
import { config } from '@/config/environment';

/**
 * Get text in specified language with fallback to English
 */
export const getLocalizedText = (
  text: MultilingualText, 
  language: LanguageCode
): string => {
  // Return text in requested language if available
  if (text[language]) {
    return text[language];
  }
  
  // Fallback to English
  if (text.en) {
    return text.en;
  }
  
  // Last resort: return first available text
  const firstAvailable = Object.values(text)[0];
  return firstAvailable || '';
};

/**
 * Create multilingual text object with English as base
 */
export const createMultilingualText = (
  englishText: string,
  translations?: Partial<Record<LanguageCode, string>>
): MultilingualText => {
  const result: MultilingualText = { en: englishText };
  
  if (translations) {
    Object.entries(translations).forEach(([lang, text]) => {
      if (text && isValidLanguageCode(lang)) {
        result[lang] = text;
      }
    });
  }
  
  return result;
};

/**
 * Detect language from text content (basic implementation)
 */
export const detectLanguage = (text: string): LanguageCode => {
  // Simple language detection based on character patterns
  // In production, this would use a proper language detection library
  
  // Check for Devanagari script (Hindi)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }
  
  // Check for Tamil script
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }
  
  // Check for Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te';
  }
  
  // Check for Bengali script
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn';
  }
  
  // Default to English
  return 'en';
};

/**
 * Check if language code is valid and supported
 */
export const isValidLanguageCode = (code: string): code is LanguageCode => {
  return config.supportedLanguages.includes(code as LanguageCode);
};

/**
 * Get language name in local language
 */
export const getLanguageName = (code: LanguageCode, displayLanguage: LanguageCode): string => {
  const languageNames: Record<LanguageCode, MultilingualText> = {
    en: {
      en: 'English',
      hi: 'अंग्रेजी',
      ta: 'ஆங்கிலம்',
      te: 'ఆంగ్లం',
      bn: 'ইংরেজি',
    },
    hi: {
      en: 'Hindi',
      hi: 'हिन्दी',
      ta: 'இந்தி',
      te: 'హిందీ',
      bn: 'হিন্দি',
    },
    ta: {
      en: 'Tamil',
      hi: 'तमिल',
      ta: 'தமிழ்',
      te: 'తమిళ్',
      bn: 'তামিল',
    },
    te: {
      en: 'Telugu',
      hi: 'तेलुगु',
      ta: 'தெலுங்கு',
      te: 'తెలుగు',
      bn: 'তেলুগু',
    },
    bn: {
      en: 'Bengali',
      hi: 'बंगाली',
      ta: 'வங்காளி',
      te: 'బెంగాలీ',
      bn: 'বাংলা',
    },
  };
  
  return getLocalizedText(languageNames[code], displayLanguage);
};

/**
 * Format text for voice output (remove special characters, expand abbreviations)
 */
export const formatForVoice = (text: string, language: LanguageCode): string => {
  let formatted = text;
  
  // Common abbreviations and their expansions
  const abbreviations: Record<LanguageCode, Record<string, string>> = {
    en: {
      'Dr.': 'Doctor',
      'Mr.': 'Mister',
      'Mrs.': 'Missus',
      'Ms.': 'Miss',
      'Ltd.': 'Limited',
      'Pvt.': 'Private',
      'Govt.': 'Government',
      'Dept.': 'Department',
      'Rs.': 'Rupees',
      '₹': 'Rupees',
      '%': 'percent',
      '&': 'and',
    },
    hi: {
      'डॉ.': 'डॉक्टर',
      'श्री': 'श्री',
      'श्रीमती': 'श्रीमती',
      'सरकार': 'सरकार',
      'रु.': 'रुपये',
      '₹': 'रुपये',
      '%': 'प्रतिशत',
    },
    ta: {
      'டாக்டர்': 'டாக்டர்',
      'திரு': 'திரு',
      'திருமதி': 'திருமதி',
      'அரசு': 'அரசு',
      '₹': 'ரூபாய்',
      '%': 'சதவீதம்',
    },
    te: {
      'డాక్టర్': 'డాక్టర్',
      'శ్రీ': 'శ్రీ',
      'శ్రీమతి': 'శ్రీమతి',
      'ప్రభుత్వం': 'ప్రభుత్వం',
      '₹': 'రూపాయలు',
      '%': 'శాతం',
    },
    bn: {
      'ডাক্তার': 'ডাক্তার',
      'শ্রী': 'শ্রী',
      'শ্রীমতী': 'শ্রীমতী',
      'সরকার': 'সরকার',
      '₹': 'টাকা',
      '%': 'শতাংশ',
    },
  };
  
  // Replace abbreviations
  const langAbbreviations = abbreviations[language] || abbreviations.en;
  Object.entries(langAbbreviations).forEach(([abbrev, expansion]) => {
    // Simple string replacement for abbreviations with periods
    if (abbrev.includes('.')) {
      formatted = formatted.replace(new RegExp(abbrev.replace(/\./g, '\\.'), 'gi'), expansion);
    } else {
      formatted = formatted.replace(new RegExp(`\\b${abbrev}\\b`, 'gi'), expansion);
    }
  });
  
  // Remove or replace special characters
  formatted = formatted
    .replace(/[()[\]{}]/g, '') // Remove brackets
    .replace(/[.,;:!?]+/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  return formatted;
};

/**
 * Simplify technical jargon for better understanding
 */
export const simplifyJargon = (text: string, language: LanguageCode): string => {
  const jargonReplacements: Record<LanguageCode, Record<string, string>> = {
    en: {
      'application': 'form',
      'eligibility criteria': 'requirements',
      'documentation': 'papers',
      'verification': 'checking',
      'processing': 'handling',
      'beneficiary': 'person who gets help',
      'subsidy': 'money help',
      'scheme': 'program',
      'portal': 'website',
    },
    hi: {
      'आवेदन': 'फॉर्म',
      'पात्रता मानदंड': 'आवश्यकताएं',
      'दस्तावेज': 'कागजात',
      'सत्यापन': 'जांच',
      'प्रसंस्करण': 'काम',
      'लाभार्थी': 'लाभ पाने वाला',
      'सब्सिडी': 'आर्थिक सहायता',
      'योजना': 'कार्यक्रम',
    },
    ta: {
      'விண்ணப்பம்': 'படிவம்',
      'தகுதி': 'தேவைகள்',
      'ஆவணங்கள்': 'காகிதங்கள்',
      'சரிபார்ப்பு': 'பரிசோதனை',
      'செயலாக்கம்': 'வேலை',
      'பயனாளி': 'உதவி பெறுபவர்',
      'மானியம்': 'பண உதவி',
      'திட்டம்': 'நிகழ்ச்சி',
    },
    te: {
      'దరఖాస్తు': 'ఫారం',
      'అర్హత': 'అవసరాలు',
      'పత్రాలు': 'కాగితాలు',
      'ధృవీకరణ': 'తనిఖీ',
      'ప్రాసెసింగ్': 'పని',
      'లబ్ధిదారుడు': 'సహాయం పొందేవాడు',
      'సబ్సిడీ': 'డబ్బు సహాయం',
      'పథకం': 'కార్యక్రమం',
    },
    bn: {
      'আবেদন': 'ফর্ম',
      'যোগ্যতা': 'প্রয়োজনীয়তা',
      'নথি': 'কাগজপত্র',
      'যাচাইকরণ': 'পরীক্ষা',
      'প্রক্রিয়াকরণ': 'কাজ',
      'সুবিধাভোগী': 'সাহায্য পাওয়া ব্যক্তি',
      'ভর্তুকি': 'টাকার সাহায্য',
      'প্রকল্প': 'কর্মসূচি',
    },
  };
  
  let simplified = text;
  const replacements = jargonReplacements[language] || jargonReplacements.en;
  
  Object.entries(replacements).forEach(([jargon, simple]) => {
    const regex = new RegExp(`\\b${jargon}\\b`, 'gi');
    simplified = simplified.replace(regex, simple);
  });
  
  return simplified;
};