import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { BeenoApiClient } from './client.js';
import { LambdaTransport } from './lambda-transport.js';
import { RequestValidator } from './request-validator.js';
import { generateSessionId, isValidSessionId } from './session.js';
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
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed',
    };
  }

  if (!event.body) {
    return { statusCode: 400, body: 'Bad Request: empty body' };
  }

  const validation = RequestValidator.validate(event.headers as Record<string, string | undefined>);
  if (!validation.valid) {
    return {
      statusCode: validation.statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: validation.error }),
    };
  }

  const { domain, apiKey, readonly, apiKeyName, whatsappApiKey } = validation;

  // Validate session ID format if provided (future: look up in DynamoDB)
  const incomingSessionId = event.headers['mcp-session-id'];
  if (incomingSessionId && !isValidSessionId(incomingSessionId)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid Mcp-Session-Id format (expected UUID v4)' }),
    };
  }

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

  const isInitialize = 'method' in body && (body as { method: string }).method === 'initialize';

  const { server, transport } = buildMcpServer(domain, apiKey, readonly, apiKeyName, whatsappApiKey);
  await server.connect(transport);

  try {
    const response = await transport.handleRequest(body);

    const responseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isInitialize) {
      // Return a new session ID on initialize (future: persist in DynamoDB)
      responseHeaders['Mcp-Session-Id'] = generateSessionId();
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
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
