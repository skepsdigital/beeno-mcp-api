import { BeenoConfig } from './types.js';

export class BeenoApiClient {
  private baseUrl: string;
  private apiKey: string;
  private apiKeyName: string;
  private whatsappApiKey?: string;

  constructor(config: BeenoConfig) {
    this.baseUrl = config.domain.replace(/\/$/, '') + '/api/v1';
    this.apiKey = config.apiKey;
    this.apiKeyName = config.apiKeyName;
    this.whatsappApiKey = config.whatsappApiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      [this.apiKeyName]: this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }
    return url.toString();
  }

  private async handleResponse(response: Response, endpoint: string): Promise<any> {
    const text = await response.text();

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorBody = JSON.parse(text);
        errorMessage = errorBody.message || errorBody.error || JSON.stringify(errorBody);
      } catch {
        errorMessage = text || `HTTP ${response.status}`;
      }
      throw new Error(`API Error (${response.status}) on ${endpoint}: ${errorMessage}`);
    }

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async get(path: string, params?: Record<string, string>): Promise<any> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response, `GET ${path}`);
  }

  async post(path: string, body?: any): Promise<any> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    return this.handleResponse(response, `POST ${path}`);
  }

  async patch(path: string, body: any): Promise<any> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response, `PATCH ${path}`);
  }

  async delete(path: string): Promise<any> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response, `DELETE ${path}`);
  }

  async postAllPages(path: string, body: any): Promise<any> {
    let allResults: any[] = [];
    let cursor: string | null = null;
    let total = 0;

    do {
      const pageBody = { ...body };
      if (cursor) pageBody.cursor = cursor;

      const data = await this.post(path, pageBody);
      total = data.total || total;

      if (data.results) {
        allResults = allResults.concat(data.results);
      }

      cursor = data.cursor?.next || null;
    } while (cursor);

    return { total, results: allResults, fetched: allResults.length };
  }

  async getAllPages(path: string, params?: Record<string, string>): Promise<any> {
    let allResults: any[] = [];
    let cursor: string | null = null;
    let total = 0;

    do {
      const pageParams = { ...params };
      if (cursor) pageParams.cursor = cursor;

      const data = await this.get(path, pageParams);
      total = data.total || total;

      if (data.results) {
        allResults = allResults.concat(data.results);
      }

      cursor = data.cursor?.next || null;
    } while (cursor);

    return { total, results: allResults, fetched: allResults.length };
  }

  async postWhatsApp(templateId: string, body: any): Promise<any> {
    if (!this.whatsappApiKey) {
      throw new Error('BEENO_WHATSAPP_API_KEY environment variable is required for WhatsApp operations');
    }
    const url = `https://server.spread.chat/api/template/send/${templateId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': this.whatsappApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    return this.handleResponse(response, `POST WhatsApp template/${templateId}`);
  }
}
