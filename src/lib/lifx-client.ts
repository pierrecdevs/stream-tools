import { LifxBulb, LifxBulbState } from "../interfaces/LifxBulb";

class LifxClient {
  protected BASE_URL = import.meta.env.VITE_LIFX_API_URL;
  protected API_VERSION = import.meta.env.VITE_LIFX_API_VERSION;

  constructor(private token: string) {
    this.token = token;
  }

  buildURL(): string {
    return `${this.BASE_URL}/${this.API_VERSION}`;
  }

  async request(method: string, path: string, data: any | null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${this.token}`,
        },
      };

      if ('get' !== method.toLowerCase()) {
        options['body'] = JSON.stringify(data);
      }

      const response = await fetch(`${this.buildURL()}/${path}`, options);
      return await response.json();
    } catch (ex) {
      const error = ex as Error;

      console.warn(`Lifx request failed: ${error.message}`);
    }
  }

  async listLights(): Promise<LifxBulb[] | null> {
    try {
      return await this.request('GET', 'lights/all', null);
    } catch (ex) {
      console.warn(`listLights failed: ${(ex as Error).message} `);
      return null;
    }
  }

  async randomLight(): LifxBulb | null {
    try {
      const lights = await this.listLights();

      return (lights && lights.length > 0)
        ? lights[Math.floor(Math.random() * (lights.length - 1))]
        : null;
    } catch (ex) {
      return null;
    }
  }

  async setState(light: LifxBulb, state: LifxBulbState) {
    try {
      const response = await this.request('PUT', `lights/${light.id}/state`, state);
      return await response;
    } catch (ex) { }
  }

  randomColor(): string {
    return `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, 0)}`.toString();
  }
}

export default LifxClient;
