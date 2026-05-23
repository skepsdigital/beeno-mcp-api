import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { BeenoApiClient } from './client.js';
import { LambdaTransport } from './lambda-transport.js';
import { registerContactTools } from './tools/contacts.js';
import { registerDealTools } from './tools/deals.js';
import { registerCompanyTools } from './tools/companies.js';
import { registerPipelineTools } from './tools/pipelines.js';
import { registerProductTools } from './tools/products.js';
import { registerNoteTools } from './tools/notes.js';
import { registerTaskTools } from './tools/tasks.js';
import { registerAssociationTools } from './tools/associations.js';
import { registerPropertyTools } from './tools/properties.js';
import { registerSegmentTools } from './tools/segments.js';
import { registerAutomationTools } from './tools/automation.js';
import { registerFormTools } from './tools/forms.js';
import { registerCommunicationTools } from './tools/communications.js';

function h(headers: Record<string, string | undefined>, key: string): string | undefined {
  return headers[key.toLowerCase()] ?? headers[key];
}

function buildMcpServer(
  domain: string,
  apiKey: string,
  readonly: boolean,
  apiKeyName: string,
  whatsappApiKey?: string,
): { server: McpServer; transport: LambdaTransport } {
  const client = new BeenoApiClient({
    domain,
    apiKey,
    apiKeyName,
    whatsappApiKey,
  });

  const server = new McpServer({
    name: readonly ? 'beeno-crm-readonly' : 'beeno-crm',
    version: '1.0.0',
  });

  registerContactTools(server, client, readonly);
  registerDealTools(server, client, readonly);
  registerCompanyTools(server, client, readonly);
  registerPipelineTools(server, client, readonly);
  registerProductTools(server, client, readonly);
  registerNoteTools(server, client, readonly);
  registerTaskTools(server, client, readonly);
  registerPropertyTools(server, client, readonly);
  registerSegmentTools(server, client, readonly);
  registerFormTools(server, client);

  if (!readonly) {
    registerAssociationTools(server, client);
    registerAutomationTools(server, client);
    registerCommunicationTools(server, client);
  }

  const transport = new LambdaTransport();
  return { server, transport };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed',
    };
  }

  if (!event.body) {
    return { statusCode: 400, body: 'Bad Request: empty body' };
  }

  const hdrs = event.headers as Record<string, string | undefined>;
  const domain = h(hdrs, 'x-beeno-domain');
  const apiKey = h(hdrs, 'x-beeno-api-key');
  if (!domain || !apiKey) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required headers: x-beeno-domain, x-beeno-api-key' }),
    };
  }
  const readonly = h(hdrs, 'x-beeno-readonly') !== 'false';
  const apiKeyName = h(hdrs, 'x-beeno-api-key-name') ?? 'ELOZ-APIKEY';
  const whatsappApiKey = h(hdrs, 'x-beeno-whatsapp-api-key');

  let body: JSONRPCMessage;
  try {
    body = JSON.parse(event.body) as JSONRPCMessage;
  } catch {
    return { statusCode: 400, body: 'Bad Request: invalid JSON' };
  }

  // Notifications (no id) don't expect a response
  if (!('id' in body)) {
    return { statusCode: 202, body: '' };
  }

  const { server, transport } = buildMcpServer(domain, apiKey, readonly, apiKeyName, whatsappApiKey);
  await server.connect(transport);

  try {
    const response = await transport.handleRequest(body);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (err) {
    console.error('MCP handler error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await server.close();
  }
};
