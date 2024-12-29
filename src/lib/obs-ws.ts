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
  'obsws-scene-item-list': [any];
  'obsws-scene-item-id': [any];
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
    try {
      this.send(6, {
        'requestType': 'SetCurrentProgramScene',
        'requestData': {
          'sceneName': name,
        },
      });
      this.getSceneItemListByName(name);
    } catch (ex) {
      const err = ex as Error;
      throw new Error(`setCurrentProgramSceneByName failled: ${err.message}`);
    }
  }

  setCurrentProgramSceneByUuid(uuid: UUIDTypes | string) {
    try {
      this.send(6, {
        'requestType': 'SetCurrentProgramScene',
        'requestData': {
          'sceneUuid': uuid,
        }
      });

      this.getSceneItemListByUuid(uuid);

    } catch (ex) {
      const err = ex as Error;
      throw new Error(`setCurrentProgramSceneByUuid failed: ${err.message}`);
    }
  }

  setSceneItemEnabled(sceneName: string, sceneItemId: number, sceneItemEnabled: boolean) {
    try {
      this.send(6, {
        'requestType': 'SetSceneItemEnabled',
        'requestData': {
          sceneName,
          sceneItemId,
          sceneItemEnabled
        }
      });

    } catch (ex) {
      const err = ex as Error;
      throw new Error(`setSceneItemEnabled failed: ${err.message}`);
    }
  }

  getSceneList() {
    try {
      this.send(6, {
        'requestType': 'GetSceneList',
      });
    } catch (ex) {
      const err = ex as Error
      throw new Error(`getSceneList failed: ${err.message}`);
    }
  }

  getSceneItemListByName(sceneName: string) {
    try {
      this.send(6, {
        'requestType': 'GetSceneItemList',
        'requestData': {
          'sceneName': sceneName,
        }
      });
    } catch (ex) {
      const error = ex as Error;
      throw new Error(`getSceneItemListByName failed: ${error.message}`);
    }

  }

  getSceneItemListByUuid(sceneUuid: UUIDTypes | string) {
    try {
      this.send(6, {
        'requestType': 'GetSceneItemList',
        'requestData': {
          'sceneUuid': sceneUuid,
        }
      });
    } catch (ex) {
      const error = ex as Error;
      throw new Error(`getSceneItemListByUuid failed: ${error.message}`);
    }
  }

  getSceneItemId(sceneName: string, sourceName: string) {
    try {
      this.send(6, {
        'requestType': 'GetSceneItemId',
        'requestData': {
          sceneName,
          sourceName
        }
      });
    } catch (ex) {
      const error = ex as Error;
      throw new Error(`getSceneItemId failed: ${error.message}`);
    }
  }


  // --- EVENTS ---
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
          this.emit('obsws-scene-item-list', d);
          break;
        case 'GetCurrentProgramScene':
          break;
        case 'GetSceneItemId':
          this.emit('obsws-scene-item-id', d);
          break;
        case 'SetCurrentProgramScene':
          break;
        case 'SendStreamCaption':
          break;
        default:
          this.emit('obsws-message', event);
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
