/**
 * Government scheme discovery and management interfaces
 */

import { 
  SchemeDetails, 
  SchemeMatch, 
  ProcessedQuery, 
  UserProfile, 
  SchemeCategory, 
  Location 
} from '@/types';

/**
 * Scheme discovery engine interface
 */
export interface SchemeDiscoveryEngine {
  /**
   * Find relevant schemes based on user query and profile
   */
  findRelevantSchemes(query: ProcessedQuery, userProfile: UserProfile): Promise<SchemeMatch[]>;
  
  /**
   * Search for a specific scheme by name
   */
  searchSchemeByName(schemeName: string, language: string): Promise<SchemeDetails | null>;
  
  /**
   * Get schemes by category and location
   */
  getSchemesByCategory(category: SchemeCategory, location: Location): Promise<SchemeDetails[]>;
  
  /**
   * Rank schemes by relevance to user profile
   */
  rankSchemesByRelevance(schemes: SchemeDetails[], userProfile: UserProfile): SchemeMatch[];
}

/**
 * Scheme data repository interface
 */
export interface SchemeRepository {
  /**
   * Get scheme by ID
   */
  getSchemeById(id: string): Promise<SchemeDetails | null>;
  
  /**
   * Search schemes by text query
   */
  searchSchemes(query: string, filters?: SchemeSearchFilters): Promise<SchemeDetails[]>;
  
  /**
   * Get schemes by category
   */
  getSchemesByCategory(category: SchemeCategory): Promise<SchemeDetails[]>;
  
  /**
   * Update scheme data
   */
  updateScheme(scheme: SchemeDetails): Promise<void>;
  
  /**
   * Get all schemes for a location
   */
  getSchemesByLocation(location: Location): Promise<SchemeDetails[]>;
}

export interface SchemeSearchFilters {
  categories?: SchemeCategory[];
  location?: Location;
  eligibilityFilters?: Record<string, unknown>;
  lastUpdatedAfter?: Date;
}