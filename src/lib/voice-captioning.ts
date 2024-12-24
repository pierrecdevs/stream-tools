import EventSystem from './event-system';

interface VoiceCaptioningEvents {
  'vc-start': [];
  'vc-end': [];
  'vc-error': [SpeechRecognitionErrorEvent];
  'vc-result': [string[]];
}

class VoiceCaptioning extends EventSystem<VoiceCaptioningEvents> {
  private speechRecognition: SpeechRecognition | undefined;
  private isTranscribing: boolean = false;

  constructor() {
    super();
  }

  initialize() {
    this.speechRecognition = new (window['SpeechRecognition'] || window['webkitSpeechRecognition'])();
    this.speechRecognition.interimResults = true;
    this.speechRecognition.continuous = true;

    this.speechRecognition.onend = this.onEnd.bind(this);
    this.speechRecognition.onerror = this.onError.bind(this);
    this.speechRecognition.onstart = this.onStart.bind(this);
    this.speechRecognition.onresult = this.onResult.bind(this);
  }

  start() {
    this.isTranscribing = true;
    this.speechRecognition?.start();
  }

  stop() {
    this.isTranscribing = false;
    this.speechRecognition?.stop();
  }

  // overridable
  // Internal Events
  onStart(event: Event) {
    console.log('OnStart', event);
    this.emit('vc-start');
  }

  onEnd(event: Event) {
    if (this.isTranscribing) {
      console.log('OnEnd restarting...');
      this.speechRecognition?.start();
    }
    this.emit('vc-end');
    console.log('OnEnd', event);
  }

  onError(event: SpeechRecognitionErrorEvent) {
    this.emit('vc-error', event)
    console.log('OnError', event);
  }

  onResult(event: SpeechRecognitionEvent) {
    console.log('OnResult', event);

    const transcripts: string[] = [];
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const { transcript } = event.results[i][0];
      if (event.results[i].isFinal) {
        transcripts.push(transcript);
      }
    }

    this.emit('vc-result', transcripts);
  }
}

export default VoiceCaptioning;
