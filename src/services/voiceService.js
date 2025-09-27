const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../utils/logger');

class VoiceService {
  constructor() {
    // Google Cloud Speech-to-Text and Text-to-Speech
    this.googleProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.googleKeyFile = process.env.GOOGLE_CLOUD_KEY_FILE;
    
    // Azure Speech Services
    this.azureSpeechKey = process.env.AZURE_SPEECH_KEY;
    this.azureSpeechRegion = process.env.AZURE_SPEECH_REGION;
    
    // Create temp directory for audio processing
    this.tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  // Convert speech to text (STT)
  async convertSpeechToText(audioUrl, language = 'auto') {
    try {
      logger.info(`🎤 Converting speech to text from: ${audioUrl}`);

      // Check if any voice service is configured
      if (!this.azureSpeechKey && !this.googleProjectId) {
        logger.warn('No voice services configured (Azure Speech or Google Cloud needed)');
        throw new Error('Voice processing not configured');
      }

      // Download audio file
      const audioPath = await this.downloadAudioFile(audioUrl);
      
      // Convert to suitable format if needed
      const convertedPath = await this.convertAudioFormat(audioPath);

      // Try different STT providers
      let transcription = null;

      // Try Google Cloud Speech-to-Text first
      if (this.googleProjectId && this.googleKeyFile) {
        try {
          transcription = await this.googleSpeechToText(convertedPath, language);
          if (transcription) {
            logger.info('✅ Google STT successful');
            return transcription;
          }
        } catch (error) {
          logger.warn('Google STT failed:', error.message);
        }
      }

      // Try Azure Speech Services
      if (this.azureSpeechKey && this.azureSpeechRegion) {
        try {
          transcription = await this.azureSpeechToText(convertedPath, language);
          if (transcription) {
            logger.info('✅ Azure STT successful');
            return transcription;
          }
        } catch (error) {
          logger.warn('Azure STT failed:', error.message);
        }
      }

      // Try Web Speech API fallback (for supported formats)
      try {
        transcription = await this.webSpeechToText(convertedPath, language);
        if (transcription) {
          logger.info('✅ Web Speech STT successful');
          return transcription;
        }
      } catch (error) {
        logger.warn('Web Speech STT failed:', error.message);
      }

      throw new Error('All STT providers failed');

    } catch (error) {
      logger.error('Speech-to-text conversion failed:', error);
      throw new Error('Unable to convert speech to text');
    } finally {
      // Cleanup temp files
      this.cleanupTempFiles();
    }
  }

  // Convert text to speech (TTS)
  async convertTextToSpeech(text, language = 'en') {
    try {
      logger.info(`🔊 Converting text to speech: "${text.substring(0, 50)}..."`);

      let audioUrl = null;

      // Try Google Cloud Text-to-Speech first
      if (this.googleProjectId && this.googleKeyFile) {
        try {
          audioUrl = await this.googleTextToSpeech(text, language);
          if (audioUrl) {
            logger.info('✅ Google TTS successful');
            return audioUrl;
          }
        } catch (error) {
          logger.warn('Google TTS failed:', error.message);
        }
      }

      // Try Azure Speech Services
      if (this.azureSpeechKey && this.azureSpeechRegion) {
        try {
          audioUrl = await this.azureTextToSpeech(text, language);
          if (audioUrl) {
            logger.info('✅ Azure TTS successful');
            return audioUrl;
          }
        } catch (error) {
          logger.warn('Azure TTS failed:', error.message);
        }
      }

      // Try Web Speech API fallback
      try {
        audioUrl = await this.webTextToSpeech(text, language);
        if (audioUrl) {
          logger.info('✅ Web Speech TTS successful');
          return audioUrl;
        }
      } catch (error) {
        logger.warn('Web Speech TTS failed:', error.message);
      }

      throw new Error('All TTS providers failed');

    } catch (error) {
      logger.error('Text-to-speech conversion failed:', error);
      throw new Error('Unable to convert text to speech');
    }
  }

  // Google Cloud Speech-to-Text
  async googleSpeechToText(audioPath, language) {
    try {
      if (!this.googleProjectId) {
        throw new Error('Google Cloud not configured');
      }

      // This is a simplified implementation
      // In production, use @google-cloud/speech library
      const audioData = fs.readFileSync(audioPath);
      const base64Audio = audioData.toString('base64');

      const response = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${process.env.GOOGLE_API_KEY}`,
        {
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 16000,
            languageCode: this.getGoogleLanguageCode(language),
            alternativeLanguageCodes: ['en-IN', 'hi-IN', 'en-US']
          },
          audio: {
            content: base64Audio
          }
        }
      );

      const results = response.data.results;
      if (results && results.length > 0) {
        return results[0].alternatives[0].transcript;
      }

      return null;

    } catch (error) {
      logger.error('Google STT error:', error);
      throw error;
    }
  }

  // Google Cloud Text-to-Speech
  async googleTextToSpeech(text, language) {
    try {
      if (!this.googleProjectId) {
        throw new Error('Google Cloud not configured');
      }

      const response = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
        {
          input: { text: text },
          voice: {
            languageCode: this.getGoogleLanguageCode(language),
            name: this.getGoogleVoiceName(language),
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'MP3'
          }
        }
      );

      if (response.data.audioContent) {
        // Save audio file and return URL
        const fileName = `tts_${Date.now()}.mp3`;
        const filePath = path.join(this.tempDir, fileName);
        
        fs.writeFileSync(filePath, response.data.audioContent, 'base64');
        
        // In production, upload to cloud storage and return public URL
        return `file://${filePath}`;
      }

      return null;

    } catch (error) {
      logger.error('Google TTS error:', error);
      throw error;
    }
  }

  // Azure Speech-to-Text
  async azureSpeechToText(audioPath, language) {
    try {
      if (!this.azureSpeechKey) {
        throw new Error('Azure Speech not configured');
      }

      const audioData = fs.readFileSync(audioPath);

      const response = await axios.post(
        `https://${this.azureSpeechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`,
        audioData,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureSpeechKey,
            'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000'
          },
          params: {
            language: this.getAzureLanguageCode(language),
            format: 'detailed'
          }
        }
      );

      if (response.data.RecognitionStatus === 'Success') {
        return response.data.DisplayText;
      }

      return null;

    } catch (error) {
      logger.error('Azure STT error:', error);
      throw error;
    }
  }

  // Azure Text-to-Speech
  async azureTextToSpeech(text, language) {
    try {
      if (!this.azureSpeechKey) {
        throw new Error('Azure Speech not configured');
      }

      const ssml = this.buildSSML(text, language);

      const response = await axios.post(
        `https://${this.azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        ssml,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.azureSpeechKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          responseType: 'arraybuffer'
        }
      );

      if (response.data) {
        const fileName = `tts_${Date.now()}.mp3`;
        const filePath = path.join(this.tempDir, fileName);
        
        fs.writeFileSync(filePath, response.data);
        
        // In production, upload to cloud storage and return public URL
        return `file://${filePath}`;
      }

      return null;

    } catch (error) {
      logger.error('Azure TTS error:', error);
      throw error;
    }
  }

  // Web Speech API fallback (simplified)
  async webSpeechToText(audioPath, language) {
    // This would need to be implemented with a web interface
    // For now, return null to indicate not available
    return null;
  }

  // Web Speech API TTS fallback
  async webTextToSpeech(text, language) {
    // This would need to be implemented with a web interface
    // For now, return null to indicate not available
    return null;
  }

  // Download audio file from URL
  async downloadAudioFile(audioUrl) {
    try {
      const response = await axios.get(audioUrl, { responseType: 'stream' });
      const fileName = `audio_${Date.now()}.ogg`;
      const filePath = path.join(this.tempDir, fileName);
      
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });

    } catch (error) {
      logger.error('Audio download failed:', error);
      throw error;
    }
  }

  // Convert audio to suitable format
  async convertAudioFormat(inputPath) {
    return new Promise((resolve, reject) => {
      const outputPath = inputPath.replace(/\.[^/.]+$/, '.wav');
      
      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
    });
  }

  // Get Google language code
  getGoogleLanguageCode(language) {
    const codes = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'hinglish': 'en-IN'
    };
    return codes[language] || 'en-IN';
  }

  // Get Google voice name
  getGoogleVoiceName(language) {
    const voices = {
      'en': 'en-IN-Wavenet-A',
      'hi': 'hi-IN-Wavenet-A',
      'hinglish': 'en-IN-Wavenet-A'
    };
    return voices[language] || 'en-IN-Wavenet-A';
  }

  // Get Azure language code
  getAzureLanguageCode(language) {
    const codes = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'hinglish': 'en-IN'
    };
    return codes[language] || 'en-IN';
  }

  // Build SSML for Azure TTS
  buildSSML(text, language) {
    const voice = language === 'hi' ? 'hi-IN-SwaraNeural' : 'en-IN-NeerjaNeural';
    
    return `<speak version='1.0' xmlns='https://www.w3.org/2001/10/synthesis' xml:lang='${this.getAzureLanguageCode(language)}'>
      <voice name='${voice}'>
        <prosody rate='0.9' pitch='medium'>
          ${text}
        </prosody>
      </voice>
    </speak>`;
  }

  // Cleanup temporary files
  cleanupTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          logger.debug(`Cleaned up temp file: ${file}`);
        }
      });
    } catch (error) {
      logger.warn('Temp file cleanup failed:', error);
    }
  }

  // Check if voice services are available
  isSTTAvailable() {
    return !!(this.googleProjectId || this.azureSpeechKey);
  }

  isTTSAvailable() {
    return !!(this.googleProjectId || this.azureSpeechKey);
  }
}

module.exports = new VoiceService();