import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { paginationSchema } from '../schemas.js';

export function registerFormTools(server: McpServer, client: BeenoApiClient): void {

  // 1. List forms
  server.tool(
    'beeno_forms_list',
    'List forms with optional pagination',
    {
      ...paginationSchema
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;

        const result = await client.get('/forms', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Read a single form
  server.tool(
    'beeno_forms_read',
    'Get a single form by ID',
    {
      formId: z.string().describe('The form ID to retrieve')
    },
    async (params) => {
      try {
        const result = await client.get(`/forms/${params.formId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
