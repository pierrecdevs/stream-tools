import EventSystem from "./event-system";


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

      if (!this.tts.speaking) {
        this.utterance.text = text
        this.tts.speak(this.utterance);
      }


    } catch (ex) {
      const error = ex as Error
      throw new Error(`speak failed: ${error.message}`);
    }
  }

  stop() {

  }

  // --- Events --
  onStart(event: SpeechSynthesisEvent) {
    this.emit('tts-start', event);
  }

  onEnd(event: SpeechSynthesisEvent) {
    this.emit('tts-end', event);
  }

  onError(event: SpeechSynthesisErrorEvent) {
    this.emit('tts-error', event);
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
