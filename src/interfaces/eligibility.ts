/**
 * Eligibility assessment interfaces for Sahaay AI
 */

import { 
  EligibilityResult, 
  Question, 
  SchemeDetails, 
  UserProfile, 
  LanguageCode 
} from '@/types';

/**
 * Eligibility assessment engine interface
 */
export interface EligibilityEngine {
  /**
   * Assess user eligibility for a specific scheme
   */
  assessEligibility(scheme: SchemeDetails, userProfile: UserProfile): Promise<EligibilityResult>;
  
  /**
   * Generate questions to collect missing eligibility information
   */
  generateQuestions(scheme: SchemeDetails, knownInfo: UserProfile): Promise<Question[]>;
  
  /**
   * Explain eligibility decision in user's language
   */
  explainEligibility(result: EligibilityResult, language: LanguageCode): Promise<string>;
  
  /**
   * Suggest alternative schemes when user is ineligible
   */
  suggestAlternatives(scheme: SchemeDetails, userProfile: UserProfile): Promise<SchemeDetails[]>;
}

/**
 * Eligibility rule engine interface
 */
export interface EligibilityRuleEngine {
  /**
   * Evaluate eligibility rules against user profile
   */
  evaluateRules(rules: EligibilityRule[], userProfile: UserProfile): Promise<RuleEvaluationResult>;
  
  /**
   * Check if all mandatory criteria are satisfied
   */
  checkMandatoryCriteria(scheme: SchemeDetails, userProfile: UserProfile): Promise<boolean>;
}

export interface EligibilityRule {
  id: string;
  condition: string;
  type: 'age' | 'income' | 'location' | 'category' | 'occupation' | 'custom';
  operator: 'equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains';
  value: string | number | string[];
  isMandatory: boolean;
}

export interface RuleEvaluationResult {
  passed: boolean;
  failedRules: EligibilityRule[];
  passedRules: EligibilityRule[];
  missingInformation: string[];
}