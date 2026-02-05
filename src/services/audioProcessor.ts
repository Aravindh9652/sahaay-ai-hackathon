/**
 * Audio Processing Service for Sahaay AI
 * 
 * Handles audio compression, format conversion, and bandwidth optimization
 * for low-bandwidth environments.
 */

import { CompressionLevel, AudioFormat } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Audio processing configuration
 */
interface AudioProcessorConfig {
  enableCompression: boolean;
  defaultFormat: AudioFormat;
  maxFileSize: number; // in bytes
  targetBitrate: number; // in kbps
  sampleRate: number; // in Hz
}

/**
 * Audio compression settings for different quality levels
 */
const COMPRESSION_SETTINGS: Record<CompressionLevel, {
  bitrate: number;
  sampleRate: number;
  quality: number;
}> = {
  1: { bitrate: 8, sampleRate: 8000, quality: 0.1 },   // Lowest quality, highest compression
  2: { bitrate: 16, sampleRate: 8000, quality: 0.2 },
  3: { bitrate: 24, sampleRate: 11025, quality: 0.3 },
  4: { bitrate: 32, sampleRate: 16000, quality: 0.4 },
  5: { bitrate: 48, sampleRate: 16000, quality: 0.5 }, // Balanced
  6: { bitrate: 64, sampleRate: 22050, quality: 0.6 },
  7: { bitrate: 96, sampleRate: 22050, quality: 0.7 },
  8: { bitrate: 128, sampleRate: 44100, quality: 0.8 },
  9: { bitrate: 192, sampleRate: 44100, quality: 0.9 },
  10: { bitrate: 320, sampleRate: 44100, quality: 1.0 } // Highest quality, lowest compression
};

/**
 * Audio processor service implementation
 */
export class AudioProcessor {
  private config: AudioProcessorConfig;

  constructor(config: Partial<AudioProcessorConfig> = {}) {
    this.config = {
      enableCompression: true,
      defaultFormat: 'webm',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      targetBitrate: 64, // 64 kbps for good quality with low bandwidth
      sampleRate: 16000, // 16kHz for speech recognition
      ...config
    };
  }

  /**
   * Compress audio blob for bandwidth optimization
   */
  async compressAudio(audioBlob: Blob, quality: CompressionLevel): Promise<Blob> {
    if (!this.config.enableCompression) {
      return audioBlob;
    }

    try {
      logger.info(`Compressing audio with quality level: ${quality}`);
      
      const settings = COMPRESSION_SETTINGS[quality];
      
      // Check if compression is needed
      if (audioBlob.size <= this.getTargetSize(quality)) {
        logger.info('Audio already within target size, skipping compression');
        return audioBlob;
      }

      // Convert blob to audio buffer
      const audioBuffer = await this.blobToArrayBuffer(audioBlob);
      
      // Perform compression (in a real implementation, this would use Web Audio API or similar)
      const compressedBuffer = await this.performCompression(audioBuffer, settings);
      
      // Convert back to blob
      const compressedBlob = new Blob([compressedBuffer], { 
        type: this.getAudioMimeType(this.config.defaultFormat) 
      });
      
      const compressionRatio = (1 - compressedBlob.size / audioBlob.size) * 100;
      logger.info(`Audio compressed by ${compressionRatio.toFixed(1)}% (${audioBlob.size} -> ${compressedBlob.size} bytes)`);
      
      return compressedBlob;
      
    } catch (error) {
      logger.error('Audio compression failed:', error);
      return audioBlob; // Return original on failure
    }
  }

  /**
   * Convert audio format for compatibility
   */
  async convertFormat(audioBlob: Blob, targetFormat: AudioFormat): Promise<Blob> {
    try {
      logger.info(`Converting audio to format: ${targetFormat}`);
      
      // In a real implementation, this would use audio conversion libraries
      // For now, we'll simulate format conversion
      const audioBuffer = await this.blobToArrayBuffer(audioBlob);
      
      // Simulate format conversion
      const convertedBlob = new Blob([audioBuffer], { 
        type: this.getAudioMimeType(targetFormat) 
      });
      
      logger.info(`Audio format converted to ${targetFormat}`);
      return convertedBlob;
      
    } catch (error) {
      logger.error('Audio format conversion failed:', error);
      return audioBlob;
    }
  }

  /**
   * Optimize audio for speech recognition
   */
  async optimizeForSTT(audioBlob: Blob): Promise<Blob> {
    try {
      logger.info('Optimizing audio for speech recognition...');
      
      // Use medium compression for STT (balance between quality and size)
      const compressed = await this.compressAudio(audioBlob, 5);
      
      // Convert to optimal format for STT
      const optimized = await this.convertFormat(compressed, 'webm');
      
      logger.info('Audio optimized for STT');
      return optimized;
      
    } catch (error) {
      logger.error('STT audio optimization failed:', error);
      return audioBlob;
    }
  }

  /**
   * Optimize audio for low bandwidth transmission
   */
  async optimizeForBandwidth(audioBlob: Blob, networkQuality: 'poor' | 'fair' | 'good'): Promise<Blob> {
    try {
      logger.info(`Optimizing audio for ${networkQuality} network quality`);
      
      // Choose compression level based on network quality
      const compressionLevel = {
        'poor': 2 as CompressionLevel,  // High compression for poor networks
        'fair': 4 as CompressionLevel,  // Medium compression for fair networks
        'good': 6 as CompressionLevel   // Light compression for good networks
      }[networkQuality];
      
      const optimized = await this.compressAudio(audioBlob, compressionLevel);
      
      logger.info(`Audio optimized for ${networkQuality} bandwidth`);
      return optimized;
      
    } catch (error) {
      logger.error('Bandwidth optimization failed:', error);
      return audioBlob;
    }
  }

  /**
   * Validate audio blob for processing
   */
  validateAudio(audioBlob: Blob): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size
    if (audioBlob.size > this.config.maxFileSize) {
      errors.push(`Audio file too large: ${audioBlob.size} bytes (max: ${this.config.maxFileSize})`);
    }
    
    // Check minimum size
    if (audioBlob.size < 1024) { // 1KB minimum
      errors.push('Audio file too small, may be empty or corrupted');
    }
    
    // Check MIME type
    if (!this.isSupportedAudioType(audioBlob.type)) {
      errors.push(`Unsupported audio type: ${audioBlob.type}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get audio duration estimate
   */
  async getAudioDuration(audioBlob: Blob): Promise<number> {
    try {
      // In a real implementation, this would analyze the audio file
      // For now, estimate based on file size and assumed bitrate
      const estimatedDuration = (audioBlob.size * 8) / (this.config.targetBitrate * 1000);
      return Math.max(0.1, estimatedDuration); // Minimum 0.1 seconds
    } catch (error) {
      logger.error('Duration estimation failed:', error);
      return 1.0; // Default 1 second
    }
  }

  private async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  private async performCompression(
    audioBuffer: ArrayBuffer, 
    settings: { bitrate: number; sampleRate: number; quality: number }
  ): Promise<ArrayBuffer> {
    // In a real implementation, this would use Web Audio API or audio processing libraries
    // to actually compress the audio data
    
    // For simulation, we'll reduce the buffer size proportionally
    const compressionRatio = settings.quality;
    const targetSize = Math.floor(audioBuffer.byteLength * compressionRatio);
    
    // Create a new buffer with reduced size (simulating compression)
    const compressedBuffer = new ArrayBuffer(targetSize);
    const sourceView = new Uint8Array(audioBuffer);
    const targetView = new Uint8Array(compressedBuffer);
    
    // Simple downsampling simulation
    const step = sourceView.length / targetView.length;
    for (let i = 0; i < targetView.length; i++) {
      const sourceIndex = Math.floor(i * step);
      targetView[i] = sourceView[sourceIndex] || 0;
    }
    
    return compressedBuffer;
  }

  private getTargetSize(quality: CompressionLevel): number {
    // Calculate target size based on quality level
    const settings = COMPRESSION_SETTINGS[quality];
    // Assume 10 seconds of audio as baseline
    return (settings.bitrate * 1000 * 10) / 8; // Convert kbps to bytes for 10 seconds
  }

  private getAudioMimeType(format: AudioFormat): string {
    const mimeTypes: Record<AudioFormat, string> = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm'
    };
    
    return mimeTypes[format] || 'audio/webm';
  }

  private isSupportedAudioType(mimeType: string): boolean {
    const supportedTypes = [
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/webm',
      'audio/x-wav',
      'audio/x-mpeg'
    ];
    
    return supportedTypes.includes(mimeType) || mimeType.startsWith('audio/');
  }
}

/**
 * Factory function to create audio processor
 */
export function createAudioProcessor(config?: Partial<AudioProcessorConfig>): AudioProcessor {
  return new AudioProcessor(config);
}

/**
 * Utility functions for audio processing
 */
export const AudioUtils = {
  /**
   * Detect network quality based on connection info
   */
  detectNetworkQuality(): 'poor' | 'fair' | 'good' {
    // In a real implementation, this would check navigator.connection
    // For now, simulate network detection
    const random = Math.random();
    if (random < 0.3) return 'poor';
    if (random < 0.7) return 'fair';
    return 'good';
  },

  /**
   * Get recommended compression level for current network
   */
  getRecommendedCompressionLevel(): CompressionLevel {
    const networkQuality = AudioUtils.detectNetworkQuality();
    
    switch (networkQuality) {
      case 'poor': return 2;
      case 'fair': return 4;
      case 'good': return 6;
      default: return 5;
    }
  },

  /**
   * Check if audio compression is beneficial
   */
  shouldCompressAudio(audioSize: number, networkQuality: 'poor' | 'fair' | 'good'): boolean {
    const thresholds = {
      'poor': 100 * 1024,   // 100KB
      'fair': 500 * 1024,   // 500KB
      'good': 1024 * 1024   // 1MB
    };
    
    return audioSize > thresholds[networkQuality];
  }
};