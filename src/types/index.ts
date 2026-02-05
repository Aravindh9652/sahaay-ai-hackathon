/**
 * Core type definitions for Sahaay AI
 */

// Language and localization types
export type LanguageCode = 'en' | 'hi' | 'ta' | 'te' | 'bn';

export interface MultilingualText {
  [key: string]: string;
  en: string; // English is always required as fallback
}

// User profile and demographics
export interface UserProfile {
  sessionId: string;
  demographics: {
    ageRange?: AgeRange;
    incomeRange?: IncomeRange;
    location?: Location;
    category?: SocialCategory;
    occupation?: Occupation;
  };
  preferences: {
    language: LanguageCode;
    interactionMode: InteractionMode;
  };
  conversationHistory: ConversationTurn[];
}

export type AgeRange = '0-18' | '18-35' | '35-60' | '60+';
export type IncomeRange = 'below-2lakh' | '2-5lakh' | '5-10lakh' | 'above-10lakh';
export type SocialCategory = 'general' | 'obc' | 'sc' | 'st' | 'ews';
export type Occupation = 'farmer' | 'student' | 'unemployed' | 'self-employed' | 'salaried' | 'retired';
export type InteractionMode = 'voice' | 'text' | 'mixed';

export interface Location {
  state: string;
  district?: string;
  pincode?: string;
  isRural?: boolean;
}

// Conversation and context management
export interface ConversationContext {
  sessionId: string;
  currentIntent: IntentType;
  activeSchemes: string[];
  collectedInformation: Partial<UserProfile>;
  conversationState: ConversationState;
  lastInteraction: Date;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  userInput: string;
  systemResponse: string;
  intent: IntentType;
  language: LanguageCode;
  inputMode: 'voice' | 'text';
}

export type ConversationState = 
  | 'greeting'
  | 'collecting_info'
  | 'scheme_discovery'
  | 'eligibility_check'
  | 'document_review'
  | 'action_planning'
  | 'completed';

// Intent recognition and NLP
export type IntentType =
  | 'discover_schemes'
  | 'check_eligibility'
  | 'get_documents'
  | 'get_process'
  | 'search_scheme'
  | 'get_help'
  | 'greeting'
  | 'goodbye';

export interface ProcessedQuery {
  intent: IntentType;
  entities: EntitySet;
  confidence: number;
  language: LanguageCode;
  normalizedText: string;
}

export interface EntitySet {
  location?: Location;
  schemeNames?: string[];
  demographics?: Partial<UserProfile['demographics']>;
  documentTypes?: DocumentType[];
  timeReferences?: string[];
}

// Government schemes and services
export interface SchemeDetails {
  id: string;
  name: MultilingualText;
  description: MultilingualText;
  category: SchemeCategory;
  eligibilityCriteria: EligibilityCriterion[];
  benefits: Benefit[];
  applicationProcess: ApplicationProcess;
  requiredDocuments: DocumentRequirement[];
  contactInformation: ContactInfo[];
  lastUpdated: Date;
  source: DataSource;
}

export type SchemeCategory =
  | 'agriculture'
  | 'education'
  | 'healthcare'
  | 'employment'
  | 'housing'
  | 'social_welfare'
  | 'financial_inclusion'
  | 'digital_services';

export interface EligibilityCriterion {
  id: string;
  type: 'age' | 'income' | 'location' | 'category' | 'occupation' | 'custom';
  condition: string;
  value: string | number | string[];
  description: MultilingualText;
  isMandatory: boolean;
}

export interface Benefit {
  type: 'financial' | 'service' | 'subsidy' | 'training' | 'other';
  description: MultilingualText;
  amount?: number;
  frequency?: 'one-time' | 'monthly' | 'yearly';
}

export interface ApplicationProcess {
  methods: ApplicationMethod[];
  estimatedProcessingTime: string;
  deadlines?: Deadline[];
  fees?: Fee[];
}

export interface ApplicationMethod {
  type: 'online' | 'offline' | 'hybrid';
  description: MultilingualText;
  url?: string;
  officeLocations?: OfficeInfo[];
  steps: ActionStep[];
}

export interface Deadline {
  type: 'application' | 'document_submission' | 'verification';
  date?: Date;
  description: MultilingualText;
  isRecurring: boolean;
}

export interface Fee {
  type: 'application' | 'processing' | 'certificate';
  amount: number;
  description: MultilingualText;
  exemptions?: string[];
}

// Document management
export interface DocumentRequirement {
  documentType: DocumentType;
  isMandatory: boolean;
  purpose: MultilingualText;
  alternatives: DocumentType[];
  format: DocumentFormat;
  specifications?: DocumentSpecification[];
}

export type DocumentType =
  | 'aadhaar'
  | 'pan'
  | 'voter_id'
  | 'driving_license'
  | 'passport'
  | 'birth_certificate'
  | 'income_certificate'
  | 'caste_certificate'
  | 'domicile_certificate'
  | 'bank_passbook'
  | 'ration_card'
  | 'property_documents'
  | 'educational_certificates'
  | 'employment_proof'
  | 'disability_certificate'
  | 'other';

export type DocumentFormat = 'original' | 'certified_copy' | 'self_attested' | 'digital';

export interface DocumentSpecification {
  requirement: string;
  description: MultilingualText;
}

// Action guidance and next steps
export interface ActionPlan {
  steps: ActionStep[];
  estimatedDuration: string;
  deadlines: Deadline[];
  alternativePaths: ActionStep[][];
}

export interface ActionStep {
  id: string;
  order: number;
  title: MultilingualText;
  description: MultilingualText;
  type: 'visit_office' | 'online_form' | 'document_preparation' | 'payment' | 'verification';
  estimatedTime?: string;
  requirements?: string[];
  officeInfo?: OfficeInfo;
  url?: string;
}

export interface OfficeInfo {
  name: MultilingualText;
  address: MultilingualText;
  timings: string;
  contactNumber?: string;
  email?: string;
  services: string[];
}

export interface ContactInfo {
  type: 'helpline' | 'office' | 'website' | 'email';
  value: string;
  description: MultilingualText;
  availability?: string;
}

// Voice processing types
export interface TranscriptionResult {
  text: string;
  confidence: number;
  detectedLanguage: LanguageCode;
  alternatives?: string[];
}

export interface AudioBlob {
  data: Buffer;
  format: AudioFormat;
  duration: number;
  sampleRate: number;
}

export type AudioFormat = 'wav' | 'mp3' | 'ogg' | 'webm';
export type CompressionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface VoiceProfile {
  language: LanguageCode;
  gender: 'male' | 'female' | 'neutral';
  speed: number; // 0.5 to 2.0
  pitch: number; // 0.5 to 2.0
}

// Eligibility assessment
export interface EligibilityResult {
  isEligible: boolean;
  confidence: number;
  missingRequirements: Requirement[];
  satisfiedCriteria: Criterion[];
  explanation: MultilingualText;
}

export interface Requirement {
  id: string;
  description: MultilingualText;
  type: 'document' | 'demographic' | 'verification';
  severity: 'mandatory' | 'recommended';
}

export interface Criterion {
  id: string;
  description: MultilingualText;
  value: string;
}

export interface Question {
  id: string;
  text: MultilingualText;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number' | 'date';
  options?: string[];
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern';
  value?: string | number;
  message: MultilingualText;
}

// Scheme discovery and matching
export interface SchemeMatch {
  scheme: SchemeDetails;
  relevanceScore: number;
  eligibilityLikelihood: number;
  matchingCriteria: string[];
}

// Data sources and external APIs
export type DataSource = 'api_setu' | 'state_portal' | 'central_portal' | 'manual_entry';

// Time and processing estimates
export interface TimeEstimate {
  minimum: string;
  maximum: string;
  average: string;
  factors: string[];
}

// Error and validation types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: MultilingualText;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: MultilingualText;
  code: string;
}