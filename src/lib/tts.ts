import EventSystem from './event-system';


interface TTSEvents {
  'tts-start': [SpeechSynthesisEvent];
  'tts-end': [SpeechSynthesisEvent];
  'tts-error': [SpeechSynthesisErrorEvent];
  'tts-resume': [SpeechSynthesisEvent];
  'tts-pause': [SpeechSynthesisEvent];
  'tts-voice-changed': [Event];
}
class TTS extends EventSystem<TTSEvents> {
  private tts!: SpeechSynthesis;
  private utterance!: SpeechSynthesisUtterance;
  private speechQueue: Set<string> = new Set();
  private isSpeaking: boolean = false;

  constructor() {
    super();

    this.tts = window.speechSynthesis;
    this.tts.onvoiceschanged = this.onVoiceChanged.bind(this);
    this.utterance = new SpeechSynthesisUtterance();
    this.utterance.onstart = this.onStart.bind(this);
    this.utterance.onend = this.onEnd.bind(this);
    this.utterance.onerror = this.onError.bind(this);
    this.utterance.onpause = this.onPause.bind(this);
    this.utterance.onresume = this.onResume.bind(this);
  }

  speak(text: string) {
    try {
      if (!this.tts || !this.utterance) {
        throw new Error('Your browser does not support TTS');
      }

      if (!this.speechQueue.has(text)) {
        this.speechQueue.add(text)
      }

      if (!this.isSpeaking) {
        this.processQueue();
      }
    } catch (ex) {
      const error = ex as Error
      throw new Error(`speak failed: ${error.message}`);
    }
  }

  private processQueue() {
    if (this.speechQueue.size === 0) {
      this.isSpeaking = false;
      return;
    }

    const nextText = Array.from(this.speechQueue).shift()!;
    this.speechQueue.delete(nextText);

    this.utterance.text = nextText;
    this.isSpeaking = true;
    this.tts.speak(this.utterance);
  }

  stop() {
    if (this.tts.speaking) {
      this.tts.cancel();
    }

    this.speechQueue.clear();
    this.isSpeaking = false;
  }

  // --- Events --
  onStart(event: SpeechSynthesisEvent) {
    this.emit('tts-start', event);
  }

  onEnd(event: SpeechSynthesisEvent) {
    this.isSpeaking = false;
    this.emit('tts-end', event);
    this.processQueue();
  }

  onError(event: SpeechSynthesisErrorEvent) {
    this.isSpeaking = false;
    this.emit('tts-error', event);
    this.processQueue();
  }

  onPause(event: SpeechSynthesisEvent) {
    this.emit('tts-pause', event);
  }
  onResume(event: SpeechSynthesisEvent) {
    this.emit('tts-resume', event);
  }

  onVoiceChanged(event: Event) {
    this.emit('tts-voice-changed', event);
  }
}


export default TTS;
