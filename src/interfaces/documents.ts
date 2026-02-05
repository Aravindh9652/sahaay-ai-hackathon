/**
 * Document management interfaces for Sahaay AI
 */

import { 
  DocumentRequirement, 
  DocumentType, 
  SchemeDetails, 
  ValidationResult, 
  LanguageCode 
} from '@/types';

/**
 * Document checker service interface
 */
export interface DocumentChecker {
  /**
   * Get complete list of required documents for a scheme
   */
  getRequiredDocuments(scheme: SchemeDetails): Promise<DocumentRequirement[]>;
  
  /**
   * Explain the purpose of a specific document in simple terms
   */
  explainDocumentPurpose(document: DocumentType, language: LanguageCode): Promise<string>;
  
  /**
   * Get alternative documents that can be used instead
   */
  getDocumentAlternatives(document: DocumentType): Promise<DocumentType[]>;
  
  /**
   * Validate if user has all required documents
   */
  validateDocumentCompleteness(
    documents: DocumentType[], 
    scheme: SchemeDetails
  ): Promise<ValidationResult>;
}

/**
 * Document repository interface
 */
export interface DocumentRepository {
  /**
   * Get document information by type
   */
  getDocumentInfo(documentType: DocumentType): Promise<DocumentInfo | null>;
  
  /**
   * Get all document types
   */
  getAllDocumentTypes(): Promise<DocumentType[]>;
  
  /**
   * Get documents required for specific scheme categories
   */
  getDocumentsByCategory(category: string): Promise<DocumentType[]>;
}

export interface DocumentInfo {
  type: DocumentType;
  name: Record<LanguageCode, string>;
  description: Record<LanguageCode, string>;
  purpose: Record<LanguageCode, string>;
  alternatives: DocumentType[];
  issuingAuthority: Record<LanguageCode, string>;
  validityPeriod?: string;
  commonFormats: string[];
}