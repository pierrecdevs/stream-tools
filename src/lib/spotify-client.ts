import { throws } from 'assert';

//import { Buffer } from 'node:buffer';
export type SpotifyConfig = {
  base_url: string;
  version: string;
  client_id: string;
  scope: string;
  client_secret: string;
  redirect_uri: string;
  oauth_token?: string;
};

class SpotifyClient {
  private config!: SpotifyConfig;
  private token!: string;

  constructor(config: SpotifyConfig) {
    this.config = config;
    this.config.oauth_token = '';
    this.token = this.config.oauth_token ? this.config.oauth_token : '';
  }

  private async api(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: any,
    headers?: {},
  ) {
    try {
      if (!this.token || this.token === '') {
        throw new Error('No token provided');
      }

      const url = `${this.config.base_url}/${this.config.version}/${path.charAt(0) === '/' ? path.substring(1) : path}`;
      const response = await fetch(url, {
        method,
        body: JSON.stringify(body),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.token.trim()}`,
          ...headers,
        },
      });

      return await response.json();
    } catch (ex: unknown) {
      const error = ex as Error;
      throw error;
    }
  }

  public openAuthorizationUrl() {
    try {
      const authorizationUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${this.config.client_id}&scope=${this.config.scope}&redirect_uri=${this.config.redirect_uri}`;
      const authWin = window.open(authorizationUrl, 'spotify-auth');

      setTimeout(() => {
        authWin?.focus();
      }, 3000);
    } catch (ex) {
      const error = ex as Error;
      throw error;
    }
  }

  public async getAccessToken(code: string) {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(
              `${this.config.client_id}:${this.config.client_secret}`,
            ).toString('base64'),
        },

        body: new URLSearchParams({
          grant_type: 'authorization_code',
          redirect_uri: this.config.redirect_uri,
          code,
        }),
      });

      const { ok, status } = response;
      if (ok && 200 === status) {
        const json = await response.json();
        this.token = json.access_token;
        return Promise.resolve(json);
      }
    } catch (ex) {
      throw ex as Error;
    }
  }

  public async getProfile(): Propmise<any> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      const profile = await this.api('GET', '/me');
      return profile;
    } catch (ex) {
      const error = ex as Error;
      return Promise.reject(error.message);
    }
  }

  public async getCurrentSong(): Promise<any> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      const song = await this.api('GET', '/me/player/currently-playing');
      const { item } = song;
      const { artists, name, external_urls } = item;

      return Promise.resolve({
        artists,
        track: name,
        url: external_urls.spotify,
      });
    } catch (ex) {
      const error = ex as Error;
      return Promise.reject(error.message);
    }
  }

  public async playNextSong(): Promise<boolean | string> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      const response = await this.api('POST', '/me/player/next');
      const { status } = response;
      if (204 === status) {
        return Promise.resolve(true);
      }
      return Promise.resolve(status);
    } catch (ex) {
      const error = ex as Error;
      console.warn(error.message);
      return Promise.reject(error.message);
    }
  }

  public async playPreviousSong(): Promise<boolean | string> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      const response = await this.api('POST', '/me/player/previous');
      const { status } = response;
      if (204 === status) {
        return Promise.resolve(true);
      }
      return Promise.resolve(status);
    } catch (ex) {
      const error = ex as Error;
      console.warn(error.message);
      return Promise.reject(error.message);
    }
  }

  public async pauseMusic(): Promise<boolean | string> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      const response = await this.api('PUT', '/me/player/pause');
      const { status } = response;
      if (204 === status) {
        return Promise.resolve(true);
      }
      return Promise.resolve(status);
    } catch (ex) {
      const error = ex as Error;
      console.warn(error.message);
      return Promise.reject(error.message);
    }
  }

  public async resumeMusic(): Promise<boolean | string> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      const response = await this.api('PUT', '/me/player/play');
      const { status } = response;
      if (204 === status) {
        return Promise.resolve(true);
      }
      return Promise.resolve(status);
    } catch (ex) {
      const error = ex as Error;
      console.warn(error.message);
      return Promise.reject(error.message);
    }
  }

  public async playSong(artist: string, song: string): Promise<string> {
    try {
      if (!this.token || this.token.trim() === '') {
        throw new Error('Need an access token');
      }

      let response = await this.api(
        'GET',
        `search?q=${encodeURIComponent(song)}&artist=${encodeURIComponent(artist)}&type=track&limit=1`,
      );
      const { ok, status } = response;

      const { tracks } = response;
      const { items } = tracks;
      response = this.api('PUT', '/me/player/play', {
        uris: [items[0].uri],
      });
      return Promise.resolve(items[0].external_urls);
    } catch (ex) {
      const error = ex as Error;
      console.warn(error.message);
      return Promise.reject(error.message);
    }
  }

  public setToken(token: string) {
    this.token = token;
  }
}

export default SpotifyClient;
