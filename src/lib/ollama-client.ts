export type GenerativeResponse = Partial<ChatResponse> & {
  response: string;
};

export type ChatResponse = {
  model: string;
  created_at: Date;
  message: {
    role: OllamaRole,
    content: string;
    images: string;
  }
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
};

export enum OllamaRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
};

const BASE_URL = import.meta.env.VITE_LLM_BASE_URL;

class OllamaClient {
  constructor() {
  }

  static async generate(prompt: string, model = 'llama3.2', stream: boolean = false): Promise<GenerativeResponse | Error> {
    try {
      const payload = {
        model,
        prompt: prompt.trim(),
        stream
      };
      const response = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json; charset="utf-8";'
        },
        body: JSON.stringify(payload),

      });

      if (response.ok) {
        return await response.json();
      } else {
        return Promise.reject(response);
      }

    } catch (ex: unknown) {
      return Promise.reject(ex);
    }
  }

  static async chat(role: OllamaRole, content: string, model = 'llama3.2'): Promise<ChatResponse | Error> {
    try {
      const payload = {
        model,
        messages: [{
          role,
          content: content.trim(),
        }],
        stream: false,
      };

      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json; charset="utf-8";'
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      } else {
        return Promise.reject(response);
      }

    } catch (ex: unknown) {
      return Promise.reject(ex);
    }
  }

  static async getModels(): Promise<any | Error> {
    try {
      const response = await fetch(`${BASE_URL}/api/tags`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json; charset="utf-8";',
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        return Promise.reject(response);
      }
    } catch (ex: unknown) {
      return Promise.reject(ex);
    }
  }
}

export default OllamaClient;
