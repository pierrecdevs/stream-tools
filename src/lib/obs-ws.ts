import EventSystem from './event-system';
import CryptoJS from 'crypto-js';
import { v4 as uuid, UUIDTypes } from 'uuid';

export interface OBSWebSocketEvents {
  'obsws-scene-switched': [object];
  'obsws-privacy-toggled': [boolean];
  'obsws-open': [Event];
  'obsws-message': [MessageEvent];
  'obsws-error': [Event];
  'obsws-close': [CloseEvent];
  'obsws-auth-required': [any];
  'obsws-authenticated': [];
  'obsws-scene-list': [any];
}

class OBSWebSocket extends EventSystem<OBSWebSocketEvents> {
  ws!: WebSocket;

  constructor() {
    super();
  }

  connect(address: string) {
    try {
      this.ws = new WebSocket(address);
      this.ws.onopen = this.onOpen.bind(this);
      this.ws.onmessage = this.onMessage.bind(this);
      this.ws.onerror = this.onError.bind(this);
      this.ws.onclose = this.onClose.bind(this)
    } catch (ex) {
      console.warn('Error Connecting', ex);
    }
  }

  send(op: number, data: any,) {
    try {
      const packet = {
        op,
        d: data,
      };

      if (op > 5) {
        data['requestId'] = uuid();
      }


      console.log('Sending', packet);
      this.ws.send(JSON.stringify(packet));
    } catch (ex) {
      console.warn('Error sending', ex);
    }
  }

  authenticate(password: string, challenge: string, salt: string) {
    try {
      const base64_secret = CryptoJS
        .enc
        .Base64
        .stringify(CryptoJS.SHA256(password + salt));

      const authentication = CryptoJS
        .enc
        .Base64
        .stringify(CryptoJS.SHA256(base64_secret + challenge));

      const payload = {
        rpcVersion: 1,
        authentication,
        eventSubscriptions: 33
      };

      console.log('Authenticating', payload);
      return this.send(1, payload);
    } catch (ex) {
      console.warn('Error Auth', ex);
    }
  }

  sendCaption(caption: string) {
    this.send(6, {
      'requestType': 'SendStreamCaption',
      'requestData': {
        'captionText': caption,
      }
    });
  }

  setCurrentProgramSceneByName(name: string) {
    this.send(6, {
      'requestType': 'SetCurrentProgramScene',
      'requestData': {
        'sceneName': name,
      },
    });

  }
  setCurrentProgramSceneByUuid(uuid: UUIDTypes | string) {
    this.send(6, {
      'requestType': 'SetCurrentProgramScene',
      'requestData': {
        'sceneUuid': uuid,
      }
    });
  }

  getSceneList() {
    this.send(6, {
      'requestType': 'GetSceneList',
    });
  }

  onOpen(event: Event) {
    this.emit('obsws-open', event);
  }

  onMessage(event: MessageEvent) {
    const { data } = event;
    const { d }: any = JSON.parse(data);

    if ('authentication' in d) {
      this.emit('obsws-auth-required', d.authentication);
    } else if ('negotiatedRpcVersion' in d) {
      this.emit('obsws-authenticated');
    } else if ('requestType' in d) {
      const { requestType } = d;
      switch (requestType) {
        case 'GetSceneList':
          this.emit('obsws-scene-list', d);
          break;
        case 'GetSceneItemList':
          break;
        case 'GetSceneItemId':
          break;
        case 'GetCurrentProgramScene':
          break;
      }
    } else {
      this.emit('obsws-message', event);
    }
  }

  onError(event: Event) {
    console.warn('error', event);
    this.emit('obsws-error', event);
  }

  onClose(event: CloseEvent) {
    this.emit('obsws-close', event);
  }
}

export default OBSWebSocket;
