type ValidationOk = {
  valid: true;
  domain: string;
  apiKey: string;
  readonly: boolean;
  apiKeyName: string;
  whatsappApiKey?: string;
  allowedTools?: string[];
};

type ValidationError = {
  valid: false;
  statusCode: number;
  error: string;
};

export type ValidationResult = ValidationOk | ValidationError;

export class RequestValidator {
  static validate(headers: Record<string, string | undefined>): ValidationResult {
    const domain = headers['x-beeno-domain'];
    const apiKey = headers['x-beeno-api-key'];

    if (!domain && !apiKey) {
      return {
        valid: false,
        statusCode: 401,
        error: 'Missing required headers: x-beeno-domain and x-beeno-api-key',
      };
    }

    if (!domain) {
      return {
        valid: false,
        statusCode: 401,
        error: 'Missing required header: x-beeno-domain (Beeno tenant URL)',
      };
    }

    if (!apiKey) {
      return {
        valid: false,
        statusCode: 401,
        error: 'Missing required header: x-beeno-api-key (Beeno API key)',
      };
    }

    const toolsHeader = headers['x-beeno-tools'];
    const allowedTools = toolsHeader
      ? toolsHeader.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;

    return {
      valid: true,
      domain,
      apiKey,
      readonly: headers['x-beeno-readonly'] !== 'false',
      apiKeyName: headers['x-beeno-api-key-name'] ?? 'ELOZ-APIKEY',
      whatsappApiKey: headers['x-beeno-whatsapp-api-key'],
      allowedTools,
    };
  }
}
