/**
 * Type declarations for test utilities
 */

import { UserProfile, SchemeDetails, ConversationContext } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var propertyTestConfig: {
    numRuns: number;
    verbose: boolean;
  };
  
  // eslint-disable-next-line no-var
  var testUtils: {
    createMockUserProfile: () => UserProfile;
    createMockScheme: () => SchemeDetails;
    createMockConversationContext: () => ConversationContext;
  };
}