import http from 'http';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from '../src/handler.js';

const DOMAIN = process.env.BEENO_DOMAIN ?? '';
const API_KEY = process.env.BEENO_API_KEY ?? '';
const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

if (!DOMAIN || !API_KEY) {
  throw new Error('BEENO_DOMAIN and BEENO_API_KEY must be set to run tests');
}

// ─── server setup ────────────────────────────────────────────────────────────

let server: http.Server;

beforeAll(() =>
  new Promise<void>(resolve => {
    server = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);

      const event: APIGatewayProxyEventV2 = {
        version: '2.0',
        routeKey: `${req.method} /mcp`,
        rawPath: req.url ?? '/mcp',
        rawQueryString: '',
        body: Buffer.concat(chunks).toString(),
        headers: req.headers as Record<string, string>,
        isBase64Encoded: false,
        requestContext: {
          http: { method: req.method ?? 'POST', path: req.url ?? '/mcp', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: '' },
        } as APIGatewayProxyEventV2['requestContext'],
      };

      const result = await handler(event);
      const statusCode = typeof result === 'object' && 'statusCode' in result ? (result as { statusCode: number }).statusCode : 200;
      const headers = typeof result === 'object' && 'headers' in result ? (result as { headers: Record<string, string> }).headers : {};
      const body = typeof result === 'object' && 'body' in result ? (result as { body: string }).body : '';
      res.writeHead(statusCode, headers as Record<string, string>);
      res.end(body ?? '');
    });
    server.listen(PORT, resolve);
  })
);

afterAll(() => new Promise<void>((resolve, reject) => server.close(e => (e ? reject(e) : resolve()))));

// ─── helpers ─────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-beeno-domain': DOMAIN,
    'x-beeno-api-key': API_KEY,
  };
}

async function mcp(method: string, params: Record<string, unknown> = {}, authenticated = true) {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: authenticated ? authHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const body = res.status === 202 ? null : await res.json();
  return { status: res.status, body };
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  return mcp('tools/call', { name, arguments: args });
}

function parseToolResult(body: Record<string, unknown>): unknown {
  const result = body.result as { content: Array<{ text: string }> };
  return JSON.parse(result.content[0].text);
}

async function mcpWithHeaders(
  method: string,
  params: Record<string, unknown>,
  extraHeaders: Record<string, string>,
) {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { ...authHeaders(), ...extraHeaders },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return { status: res.status, body: await res.json(), headers: res.headers };
}

// ─── shared state between tests ──────────────────────────────────────────────

let contactId: string;
let dealId: string | null;
let sessionId: string;

// ─── tests ───────────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('retorna 401 sem headers de credenciais', async () => {
    const { status } = await mcp('tools/list', {}, false);
    expect(status).toBe(401);
  });

  it('retorna 202 para notificações (sem id)', async () => {
    const res = await fetch(`${BASE}/mcp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
    });
    expect(res.status).toBe(202);
  });
});

describe('Protocolo MCP', () => {
  it('initialize — retorna protocolVersion, serverInfo e Mcp-Session-Id UUID v4', async () => {
    const { status, body, headers } = await mcpWithHeaders('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'jest', version: '1.0' },
    }, {});
    expect(status).toBe(200);
    const result = (body as { result: { protocolVersion: string; serverInfo: { name: string } } }).result;
    expect(result.protocolVersion).toBe('2024-11-05');
    expect(result.serverInfo.name).toMatch(/beeno/);
    sessionId = headers.get('mcp-session-id') ?? '';
    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('request com Mcp-Session-Id válido — aceita e processa', async () => {
    const { status } = await mcpWithHeaders('tools/list', {}, { 'Mcp-Session-Id': sessionId });
    expect(status).toBe(200);
  });

  it('request com Mcp-Session-Id inválido — retorna 400', async () => {
    const { status } = await mcpWithHeaders('tools/list', {}, { 'Mcp-Session-Id': 'nao-e-um-uuid' });
    expect(status).toBe(400);
  });

  it('tools/list — retorna 21 tools no modo readonly', async () => {
    const { status, body } = await mcp('tools/list');
    expect(status).toBe(200);
    const tools = (body as { result: { tools: unknown[] } }).result.tools;
    expect(tools.length).toBe(21);
  });
});

describe('Contacts', () => {
  it('beeno_contacts_list — retorna resultados paginados', async () => {
    const { status, body } = await callTool('beeno_contacts_list', { limit: 5 });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { total: number; results: Array<{ id: number }> };
    expect(data.total).toBeGreaterThan(0);
    expect(data.results.length).toBeGreaterThan(0);
    contactId = String(data.results[0].id);
  });

  it('beeno_contacts_read — retorna contato pelo ID', async () => {
    const { status, body } = await callTool('beeno_contacts_read', { contactId });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { id: number };
    expect(String(data.id)).toBe(contactId);
  });

  it('beeno_contacts_search — filtra por email', async () => {
    const { status, body } = await callTool('beeno_contacts_search', {
      filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: 'volkswagen' }],
      limit: 5,
    });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { total: number };
    expect(data.total).toBeGreaterThanOrEqual(0);
  });
});

describe('Deals', () => {
  it('beeno_deals_list — retorna lista (pode ser vazia)', async () => {
    const { status, body } = await callTool('beeno_deals_list', { limit: 5 });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { total: number; results: Array<{ id: number }> };
    expect(typeof data.total).toBe('number');
    dealId = data.results[0] ? String(data.results[0].id) : null;
  });

  it('beeno_deals_read — retorna deal pelo ID (se existir)', async () => {
    if (!dealId) return;
    const { status, body } = await callTool('beeno_deals_read', { dealId });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { id: number };
    expect(String(data.id)).toBe(dealId);
  });
});

describe('Companies', () => {
  it('beeno_companies_list — retorna lista', async () => {
    const { status, body } = await callTool('beeno_companies_list', { limit: 5 });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { total: number };
    expect(typeof data.total).toBe('number');
  });
});

describe('Pipelines', () => {
  it('beeno_pipelines_list — retorna pipelines', async () => {
    const { status, body } = await callTool('beeno_pipelines_list', {});
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { results: unknown[] };
    expect(data.results.length).toBeGreaterThan(0);
  });
});

describe('Tasks', () => {
  it('beeno_tasks_list — retorna lista', async () => {
    const { status, body } = await callTool('beeno_tasks_list', { limit: 5 });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { total: number };
    expect(typeof data.total).toBe('number');
  });
});

describe('Notes', () => {
  it('beeno_notes_list — retorna notas do contato', async () => {
    const { status, body } = await callTool('beeno_notes_list', {
      fromObject: 'contact',
      fromObjectId: contactId,
    });
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Forms', () => {
  it('beeno_forms_list — retorna lista', async () => {
    const { status, body } = await callTool('beeno_forms_list', {});
    expect(status).toBe(200);
    const data = parseToolResult(body as Record<string, unknown>) as { results: unknown[] };
    expect(Array.isArray(data.results)).toBe(true);
  });
});
