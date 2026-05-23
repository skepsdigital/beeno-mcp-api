import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { BeenoApiClient } from './client.js';
import { LambdaTransport } from './lambda-transport.js';
import { RequestValidator } from './request-validator.js';
import { generateSessionId, isValidSessionId } from './session.js';

function log(level: 'INFO' | 'ERROR', trace: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), trace, ...data }));
}

// Removes $schema and fixes free-form objects (z.record) that incorrectly get
// additionalProperties:false from the MCP SDK — OpenAI strict mode rejects them.
function fixToolSchema(schema: unknown): unknown {
  if (typeof schema !== 'object' || schema === null) return schema;
  if (Array.isArray(schema)) return schema.map(fixToolSchema);

  const obj = { ...schema } as Record<string, unknown>;

  delete obj['$schema'];

  // Free-form object: type=object, additionalProperties=false, no properties defined
  if (obj['type'] === 'object' && obj['additionalProperties'] === false && !('properties' in obj)) {
    delete obj['additionalProperties'];
  }

  // OpenAI strict mode doesn't accept type arrays — convert ["X","null"] to anyOf
  if (Array.isArray(obj['type'])) {
    const types = obj['type'] as string[];
    const nonNull = types.filter(t => t !== 'null');
    delete obj['type'];
    obj['anyOf'] = [...nonNull.map(t => ({ type: t })), { type: 'null' }];
  }

  for (const key of Object.keys(obj)) {
    obj[key] = fixToolSchema(obj[key]);
  }

  return obj;
}
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

  const { domain, apiKey, readonly, apiKeyName, whatsappApiKey, allowedTools } = validation;

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
  const rpcMethod = 'method' in body ? (body as { method: string }).method : 'unknown';
  const clientInfo = isInitialize
    ? ((body as { params?: { clientInfo?: { name?: string } } }).params?.clientInfo ?? {})
    : null;
  const clientName = clientInfo ? (clientInfo.name ?? 'unknown') : 'unknown';
  const sessionId = incomingSessionId ?? 'new';
  const trace = `${sessionId}|${clientName}`;

  log('INFO', trace, { event: 'request', method: rpcMethod, body });

  const { server, transport } = buildMcpServer(domain, apiKey, readonly, apiKeyName, whatsappApiKey);
  await server.connect(transport);

  try {
    let response = await transport.handleRequest(body);

    if (rpcMethod === 'tools/list') {
      const r = response as { result?: { tools?: Array<{ name: string; inputSchema?: unknown }> } };
      if (r?.result?.tools) {
        if (allowedTools && allowedTools.length > 0) {
          r.result.tools = r.result.tools.filter(t => allowedTools.includes(t.name));
        }
        r.result.tools = r.result.tools.map(t => ({
          ...t,
          inputSchema: fixToolSchema(t.inputSchema),
        }));
      }
    }

    const responseHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isInitialize) {
      responseHeaders['Mcp-Session-Id'] = generateSessionId();
    }

    log('INFO', trace, { event: 'response', method: rpcMethod, statusCode: 200, body: response });

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify(response),
    };
  } catch (err) {
    log('ERROR', trace, { event: 'error', method: rpcMethod, error: String(err) });
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await server.close();
  }
};
