type ModelResponse = {
  model: string;
  created_at: Date;
  response: string;
  done: boolean;
  context: number[];
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
};

const BASE_URL = import.meta.env.VITE_LLM_BASE_URL;

class LLMResponder {
  constructor() {
  }

  static async generate(prompt: string, model = 'llama3.2', stream: boolean = false): Promise<ModelResponse | Error> {
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
}

export default LLMResponder;
