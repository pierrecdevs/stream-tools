import EventSystem from './event-system';

export interface IrcEvents {
  'irc-connected': [Event];
  'irc-data': [MessageEvent];
  'irc-error': [Event];
  'irc-close': [CloseEvent];
  // CUSTOM EVENTS
  'irc-motd': [MessageEvent];
  'irc-message': [{ nick: string, channel: string, message: string }];
  'irc-channel-join': [{ nick: string, channel: string }];
  'irc-ping': [{ pong: string }];
}

const CHAT_URL = 'wss://irc-ws.chat.twitch.tv:443';

class IrcLite extends EventSystem<IrcEvents> {
  private ws!: WebSocket;
  protected username: string = '';
  protected realname: string = '';
  protected hostname: string = '';
  protected servername: string = '';
  protected password: string = '';

  constructor() {
    super();
  }

  connect(
    username: string,
    realname: string = '',
    hostname: string = '',
    password: string = '',
  ) {
    this.username = username;
    this.realname = realname ?? username;
    this.hostname = hostname ?? `${username}@${username}`;
    this.password = password ?? '';

    this.ws = new WebSocket(CHAT_URL);
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onError.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
  }

  setNick(newUsername: string) {
    try {
      this.username = newUsername;
      this.ws.send(`NICK ${this.username}\r\n`);
    } catch (ex) {
      console.warn('setNick failed', ex);
    }
  }

  sendChannelMessage(channel: string, message: string) {
    try {
      this.ws.send(`PRIVMSG ${channel} :${message}\r\n`);
    } catch (ex) {
      console.warn('sendChannelMessage failed', ex);
    }
  }

  sendCAP(capability: string) {
    try {
      this.ws.send(`CAP REQ :${capability}\r\n`);
    } catch (ex) {
      console.warn('sendCAP failed', ex);
    }
  }

  joinChannel(channel: string) {
    try {
      console.log('Joining channel', channel);
      this.ws.send(`JOIN ${channel}\r\n`);
    } catch (ex) {
      console.warn('joinChannel failed', ex);
    }
  }

  partChannel(channel: string) {
    try {
      this.ws.send(`PART ${channel}\r\n`);
    } catch (ex) {
      console.warn('partChannel failed', ex);
    }
  }

  sendPing(pong: string) {
    try {
      this.ws.send(`PING :${pong}\r\n`);
    } catch (ex) {
      console.warn('sendPing failed', ex);
    }
  }

  sendPong(ping: string) {
    try {
      this.ws.send(`PONG :${ping}\r\n`);
      console.log('Sending PONG', ping);
    } catch (ex) {
      console.warn('sendPong failed', ex);
    }
  }

  sendQuit(message: string = 'IRCLite') {
    try {
      this.ws.send(`QUIT :${message}\r\n`);
    } catch (ex) {
      console.warn('sendQuit failed', ex);
    }
  }

  // --- Events --- //
  onOpen(e: Event) {
    let command = '';
    try {

      if (this.password.trim()) {
        command = `PASS ${this.password}\r\n`;
        this.ws.send(command);
      }

      command = `NICK ${this.username}\r\n`
      this.ws.send(command);

      command = `USER ${this.username} ${this.hostname} ${this.username} ${this.realname}\r\n`
      this.ws.send(command)


      this.emit('irc-connected', e);
      // TODO: look into possibly clearing the password
      // will comment now in case we want a "reconnect" option.
      // this.password = null;
    } catch (ex) {
      console.warn('Initial Connection failed. Last Command Sent', command);
    }
  }

  onClose(e: CloseEvent) {
    this.emit('irc-close', e);
  }

  onError(e: Event) {
    this.emit('irc-error', e);
  }
  onMessage(e: MessageEvent) {
    const data = e.data;
    const payloadPtrn = /:(?<nick>[^!]+)!(?<user>[^@]+)@(?<host>[^\s]+)\s(?<command>[^\s]+)\s(?<channel>[^\s]*)\s?:?(?<message>.*)/

    const match = data.match(payloadPtrn);


    const {
      nick = null,
      user = null,
      host = null,
      command = null,
      channel = null,
      message = null,
    } = match?.groups || {};


    if ('PING' === data.substring(0, 4)) {
      const pong = data.substring(6);
      this.sendPong(pong);
      this.emit('irc-ping', pong);
    } else if (!command) {
      this.emit('irc-data', data);
    } else {
      switch (command) {
        case 'PRIVMSG':
          this.emit('irc-message', { nick, channel, message });
          break;
        case 'JOIN':
          this.emit('irc-channel-join', { nick, channel });
      }
      console.log('payloadMatches', data.match(payloadPtrn));
    }

  }
}

export default IrcLite;
