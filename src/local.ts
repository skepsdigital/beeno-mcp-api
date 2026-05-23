#!/usr/bin/env node

import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { handler } from './handler.js';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Load .env if present and map BEENO_* vars → x-beeno-* headers for local dev convenience
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

const ENV_HEADER_MAP: Record<string, string> = {
  BEENO_DOMAIN: 'x-beeno-domain',
  BEENO_API_KEY: 'x-beeno-api-key',
  BEENO_API_KEY_NAME: 'x-beeno-api-key-name',
  BEENO_READONLY: 'x-beeno-readonly',
  BEENO_WHATSAPP_API_KEY: 'x-beeno-whatsapp-api-key',
};

function envHeaders(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [envKey, headerKey] of Object.entries(ENV_HEADER_MAP)) {
    const val = process.env[envKey];
    if (val) out[headerKey] = val;
  }
  return out;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const server = http.createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks).toString();

  // Merge env-derived headers (lower priority — request headers override)
  const headers: Record<string, string> = {
    ...envHeaders(),
    ...(req.headers as Record<string, string>),
  };

  const event: APIGatewayProxyEvent = {
    httpMethod: req.method ?? 'POST',
    path: req.url ?? '/mcp',
    body,
    headers,
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    isBase64Encoded: false,
  };

  const result = await handler(event);
  const responseHeaders = (result.headers ?? {}) as Record<string, string>;
  res.writeHead(result.statusCode, responseHeaders);
  res.end(result.body ?? '');
});

server.listen(PORT, () => {
  console.log(`Beeno MCP Server (HTTP) → http://localhost:${PORT}/mcp`);
  console.log(`MCP client config: { "url": "http://localhost:${PORT}/mcp" }`);
  if (process.env.BEENO_DOMAIN) {
    console.log(`  Injecting credentials from .env as headers (local dev mode)`);
  } else {
    console.log(`  No .env found — client must send x-beeno-domain and x-beeno-api-key headers`);
  }
});
