import EventSystem from './event-system';

export interface IrcEvents {
  'irc-connected': [Event];
  'irc-data': [MessageEvent];
  'irc-error': [Event];
  'irc-close': [CloseEvent];
  'irc-ping': [any];
  // CUSTOM EVENTS
  'irc-motd': [MessageEvent];
  'irc-message': [MessageEvent];
}

const CHAT_URL = 'wss://irc-ws.chat.twitch.tv:443';

class IrcLite extends EventSystem<IrcEvents> {
  private ws!: WebSocket;
  protected nick: string = '';
  protected name: string = '';
  protected email: string = '';
  protected password: string = '';

  constructor() {
    super();
  }

  connect(
    nick: string,
    name: string = '',
    email: string = '',
    password: string = '',
  ) {
    this.nick = nick;
    this.name = name ?? nick;
    this.email = email ?? `${nick}@${nick}`;
    this.password = password ?? '';
    this.ws = new WebSocket(CHAT_URL);
    this.ws.onopen = this.onOpen.bind(this);
    this.ws.onclose = this.onClose.bind(this);
    this.ws.onerror = this.onError.bind(this);
    this.ws.onmessage = this.onMessage.bind(this);
  }

  setNick(nick: string) {
    try {
      this.nick = nick;
      this.ws.send(`NICK ${nick}\r\n`);
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
    } catch (ex) { }
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

  ping(pong: string) {
    try {
      this.ws.send(`PING :${pong}\r\n`);
    } catch (ex) { }
  }

  pong(ping: string) {
    try {
      this.ws.send(`PONG :${ping}\r\n`);
      console.log('Sending PONG', ping);
    } catch (ex) { }
  }

  onOpen(e: Event) {
    try {
      this.emit('irc-connected', e);

      if (this.password.trim()) {
        this.ws.send(`PASS ${this.password}\r\n`);
      }

      this.ws.send(`NICK ${this.nick}\r\n`);


      // TODO: look into possibly clearing the password
      // will comment now in case we want a "reconnect" option.
      // this.password = null;
    } catch (ex) { }
  }

  onClose(e: CloseEvent) {
    this.emit('irc-close', e);
  }

  onError(e: Event) {
    this.emit('irc-error', e);
  }
  onMessage(e: MessageEvent) {
    const data = e.data;
    this.emit('irc-data', data);

    if (data.substr(0, 4).toUpperCase() === 'PING') {
      this.pong(data.substr(6));
    }
    console.log('IRCDATA', data);
  }
}

export default IrcLite;
