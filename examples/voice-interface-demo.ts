/**
 * Voice Interface Orchestration Demo
 * 
 * This example demonstrates the enhanced voice interface orchestration
 * with fallback mechanisms and context preservation across input modalities.
 */

import { createVoiceInterface } from '../src/services/voiceInterface';
import { LanguageCode } from '../src/types';

async function demonstrateVoiceInterfaceOrchestration() {
  console.log('🎤 Voice Interface Orchestration Demo\n');

  // Create voice interface with custom configuration
  const voiceInterface = createVoiceInterface(undefined, undefined, {
    fallbackToText: true,
    preserveContext: true,
    maxFailuresBeforeFallback: 2,
    contextTimeoutMinutes: 30
  });

  const sessionId = 'demo-session-001';
  const language: LanguageCode = 'hi';

  console.log('1. Setting up voice context...');
  voiceInterface.setContext(sessionId, language, 'voice');
  
  let context = voiceInterface.getContext(sessionId);
  console.log(`   ✓ Context created for session ${sessionId}`);
  console.log(`   ✓ Language: ${context?.currentLanguage}`);
  console.log(`   ✓ Input mode: ${context?.inputMode}\n`);

  // Simulate voice input processing
  console.log('2. Processing voice input...');
  try {
    // Create mock audio blob
    const audioData = new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 256));
    const audioBlob = new Blob([audioData], { type: 'audio/wav' });

    const transcription = await voiceInterface.convertSpeechToText(
      audioBlob, 
      language, 
      sessionId
    );
    
    console.log(`   ✓ Voice transcription successful:`);
    console.log(`     Text: "${transcription.text}"`);
    console.log(`     Confidence: ${transcription.confidence}`);
    console.log(`     Language: ${transcription.detectedLanguage}\n`);

  } catch (error) {
    console.log(`   ⚠ Voice input failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Demonstrate fallback mechanism
  console.log('3. Demonstrating fallback mechanism...');
  
  // Simulate multiple voice failures to trigger fallback
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`   Attempt ${i}: Simulating voice failure...`);
      
      // This will fail because we're passing an empty blob
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      await voiceInterface.convertSpeechToText(emptyBlob, language, sessionId);
      
    } catch (error: any) {
      console.log(`   ⚠ Voice failure ${i}: ${error.message}`);
      
      if (error.suggestTextFallback) {
        console.log(`   💡 Fallback suggested! Switching to text input...\n`);
        
        // Switch to text input mode
        const switched = voiceInterface.switchInputMode(sessionId, 'text', 'voice_failure_fallback');
        if (switched) {
          console.log('   ✓ Successfully switched to text input mode');
          
          // Process text input
          const textResult = await voiceInterface.processTextInput(
            'मुझे सरकारी योजनाओं के बारे में जानकारी चाहिए',
            sessionId,
            language
          );
          
          console.log(`   ✓ Text processing successful:`);
          console.log(`     Text: "${textResult.processedText}"`);
          console.log(`     Language: ${textResult.detectedLanguage}`);
          console.log(`     Confidence: ${textResult.confidence}\n`);
        }
        break;
      }
    }
  }

  // Demonstrate context preservation
  console.log('4. Context preservation across modality switches...');
  
  context = voiceInterface.getContext(sessionId);
  if (context) {
    console.log(`   ✓ Context preserved after mode switch:`);
    console.log(`     Current mode: ${context.inputMode}`);
    console.log(`     Total interactions: ${context.totalInteractions}`);
    console.log(`     Failure count: ${context.failureCount}`);
    console.log(`     Conversation history length: ${context.conversationHistory.length}\n`);
  }

  // Demonstrate text-to-speech
  console.log('5. Converting response to speech...');
  try {
    const responseText = 'आपकी जानकारी के लिए, यहाँ कुछ सरकारी योजनाएं हैं जो आपके लिए उपयुक्त हो सकती हैं।';
    
    const audioResponse = await voiceInterface.convertTextToSpeech(
      responseText,
      language,
      {
        language,
        gender: 'female',
        speed: 1.0,
        pitch: 1.0
      }
    );
    
    console.log(`   ✓ TTS conversion successful:`);
    console.log(`     Audio format: ${audioResponse.format}`);
    console.log(`     Duration: ${audioResponse.duration}s`);
    console.log(`     Sample rate: ${audioResponse.sampleRate}Hz`);
    console.log(`     Data size: ${audioResponse.data.length} bytes\n`);
    
  } catch (error) {
    console.log(`   ⚠ TTS failed: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Show service capabilities
  console.log('6. Service capabilities...');
  
  const inputAvailable = await voiceInterface.isVoiceInputAvailable();
  const outputAvailable = await voiceInterface.isVoiceOutputAvailable();
  const inputLanguages = voiceInterface.getSupportedInputLanguages();
  const outputLanguages = await voiceInterface.getSupportedOutputLanguages();
  
  console.log(`   ✓ Voice input available: ${inputAvailable}`);
  console.log(`   ✓ Voice output available: ${outputAvailable}`);
  console.log(`   ✓ Supported input languages: ${inputLanguages.join(', ')}`);
  console.log(`   ✓ Supported output languages: ${outputLanguages.join(', ')}\n`);

  // Show context statistics
  console.log('7. Context statistics...');
  const stats = voiceInterface.getContextStats();
  console.log(`   ✓ Total sessions: ${stats.totalSessions}`);
  console.log(`   ✓ Active sessions: ${stats.activeSessions}`);
  console.log(`   ✓ Average interactions per session: ${stats.averageInteractionsPerSession}`);
  console.log(`   ✓ Voice mode sessions: ${stats.voiceModeSessions}`);
  console.log(`   ✓ Text mode sessions: ${stats.textModeSessions}\n`);

  // Cleanup
  console.log('8. Cleaning up...');
  voiceInterface.clearContext(sessionId);
  console.log(`   ✓ Context cleared for session ${sessionId}`);
  
  const cleanedCount = voiceInterface.cleanupExpiredContexts();
  console.log(`   ✓ Cleaned up ${cleanedCount} expired contexts\n`);

  console.log('🎉 Voice Interface Orchestration Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('• STT and TTS service coordination');
  console.log('• Automatic fallback from voice to text input');
  console.log('• Context preservation across input modality switches');
  console.log('• Session management with failure tracking');
  console.log('• Multilingual support');
  console.log('• Service availability checking');
  console.log('• Context statistics and monitoring');
}

// Run the demo
if (require.main === module) {
  demonstrateVoiceInterfaceOrchestration().catch(console.error);
}

export { demonstrateVoiceInterfaceOrchestration };