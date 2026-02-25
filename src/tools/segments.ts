import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { paginationSchema } from '../schemas.js';

export function registerSegmentTools(server: McpServer, client: BeenoApiClient): void {

  // 1. List segments
  server.tool(
    'beeno_segments_list',
    'List segments with optional pagination and sorting',
    {
      ...paginationSchema,
      sort: z.string().optional().describe('Sort field (e.g. date_added, date_modified)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)')
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit !== undefined) queryParams.limit = String(params.limit);
        if (params.cursor !== undefined) queryParams.cursor = params.cursor;
        if (params.sort !== undefined) queryParams.sort = params.sort;
        if (params.order !== undefined) queryParams.order = params.order;

        const result = await client.get('/segments', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Create segment
  server.tool(
    'beeno_segments_create',
    'Create a new segment with optional initial contacts',
    {
      name: z.string().describe('Segment name'),
      description: z.string().optional().describe('Segment description'),
      contacts: z.array(z.number()).optional().describe('Array of contact IDs to add initially')
    },
    async (params) => {
      try {
        const body: Record<string, any> = {
          properties: {
            name: params.name,
            description: params.description
          }
        };
        if (params.contacts !== undefined) {
          body.contacts = params.contacts;
        }
        const result = await client.post('/segments', body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. Add single contact to segment
  server.tool(
    'beeno_segments_add_contact',
    'Add a single contact to a segment',
    {
      segmentId: z.string().describe('Segment ID'),
      contactId: z.string().describe('Contact ID to add')
    },
    async (params) => {
      try {
        const result = await client.post(`/segments/${params.segmentId}/add/${params.contactId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 4. Add multiple contacts to segment
  server.tool(
    'beeno_segments_add_contacts',
    'Add multiple contacts to a segment at once',
    {
      segmentId: z.string().describe('Segment ID'),
      contacts: z.array(z.number()).describe('Array of contact IDs to add')
    },
    async (params) => {
      try {
        const result = await client.post(`/segments/${params.segmentId}/add`, { contacts: params.contacts });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
