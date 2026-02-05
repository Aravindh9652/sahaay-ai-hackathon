/**
 * Action guidance interfaces for Sahaay AI
 */

import { 
  ActionPlan, 
  OfficeInfo, 
  ApplicationMethod, 
  TimeEstimate, 
  SchemeDetails, 
  Location 
} from '@/types';

/**
 * Action guide generator interface
 */
export interface ActionGuideGenerator {
  /**
   * Generate step-by-step action plan for scheme application
   */
  generateActionPlan(scheme: SchemeDetails, userLocation: Location): Promise<ActionPlan>;
  
  /**
   * Get office information for scheme applications
   */
  getOfficeInformation(scheme: SchemeDetails, location: Location): Promise<OfficeInfo[]>;
  
  /**
   * Get available application methods (online/offline)
   */
  getApplicationMethods(scheme: SchemeDetails): Promise<ApplicationMethod[]>;
  
  /**
   * Estimate processing time for scheme application
   */
  estimateProcessingTime(scheme: SchemeDetails, method: ApplicationMethod): Promise<TimeEstimate>;
}

/**
 * Office information service interface
 */
export interface OfficeInformationService {
  /**
   * Find nearest offices for a scheme
   */
  findNearestOffices(schemeId: string, location: Location): Promise<OfficeInfo[]>;
  
  /**
   * Get office details by ID
   */
  getOfficeById(officeId: string): Promise<OfficeInfo | null>;
  
  /**
   * Get offices by district
   */
  getOfficesByDistrict(district: string, state: string): Promise<OfficeInfo[]>;
}