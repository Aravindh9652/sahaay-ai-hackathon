/**
 * Jest test setup for Sahaay AI
 */

import { config } from '@/config/environment';

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error'; // Reduce log noise during tests

// Global test timeout
jest.setTimeout(30000);

// Setup for property-based testing
global.propertyTestConfig = {
  numRuns: config.propertyTestIterations,
  verbose: process.env['VERBOSE_TESTS'] === 'true',
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockUserProfile: () => ({
    sessionId: 'test-session-123',
    demographics: {
      ageRange: '18-35' as const,
      incomeRange: 'below-2lakh' as const,
      location: {
        state: 'Karnataka',
        district: 'Bangalore Urban',
        pincode: '560001',
        isRural: false,
      },
      category: 'general' as const,
      occupation: 'student' as const,
    },
    preferences: {
      language: 'en' as const,
      interactionMode: 'mixed' as const,
    },
    conversationHistory: [],
  }),
  
  createMockScheme: () => ({
    id: 'test-scheme-123',
    name: {
      en: 'Test Education Scheme',
      hi: 'परीक्षा शिक्षा योजना',
    },
    description: {
      en: 'A test scheme for educational support',
      hi: 'शैक्षिक सहायता के लिए एक परीक्षा योजना',
    },
    category: 'education' as const,
    eligibilityCriteria: [],
    benefits: [],
    applicationProcess: {
      methods: [],
      estimatedProcessingTime: '30 days',
    },
    requiredDocuments: [],
    contactInformation: [],
    lastUpdated: new Date(),
    source: 'manual_entry' as const,
  }),
  
  createMockConversationContext: () => ({
    sessionId: 'test-session-123',
    currentIntent: 'discover_schemes' as const,
    activeSchemes: [],
    collectedInformation: {},
    conversationState: 'greeting' as const,
    lastInteraction: new Date(),
  }),
};

// Type declarations for global test utilities
declare global {
  // eslint-disable-next-line no-var
  var propertyTestConfig: {
    numRuns: number;
    verbose: boolean;
  };
  
  // eslint-disable-next-line no-var
  var testUtils: {
    createMockUserProfile: () => import('@/types').UserProfile;
    createMockScheme: () => import('@/types').SchemeDetails;
    createMockConversationContext: () => import('@/types').ConversationContext;
  };
}