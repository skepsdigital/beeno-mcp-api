#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BeenoApiClient } from './client.js';
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

const domain = process.env.BEENO_DOMAIN;
const apiKey = process.env.BEENO_API_KEY;
const readonly = process.env.BEENO_READONLY !== 'false';

if (!domain || !apiKey) {
  console.error('Error: BEENO_DOMAIN and BEENO_API_KEY environment variables are required');
  process.exit(1);
}

const client = new BeenoApiClient({
  domain,
  apiKey,
  apiKeyName: process.env.BEENO_API_KEY_NAME || 'ELOZ-APIKEY',
  whatsappApiKey: process.env.BEENO_WHATSAPP_API_KEY
});

const server = new McpServer({
  name: readonly ? 'beeno-crm-readonly' : 'beeno-crm',
  version: '1.0.0'
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

const transport = new StdioServerTransport();
await server.connect(transport);
