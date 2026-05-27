import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';

export function registerNoteTools(server: McpServer, client: BeenoApiClient, readonly: boolean = false): void {

  // 1. List notes
  server.tool(
    'beeno_notes_list',
    'List all notes associated with a deal or contact in Beeno CRM.',
    {
      fromObject: z.enum(['deal', 'contact']).describe('The type of object to list notes from'),
      fromObjectId: z.string().describe('The ID of the deal or contact')
    },
    async (params) => {
      try {
        const result = await client.get(`/notes/${params.fromObject}/${params.fromObjectId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  if (!readonly) {
    // 2. Create a note
    server.tool(
      'beeno_notes_create',
      'Create a new note on a deal or contact in Beeno CRM.',
      {
        fromObject: z.enum(['deal', 'contact']).describe('The type of object to attach the note to'),
        fromObjectId: z.string().describe('The ID of the deal or contact'),
        text: z.string().describe('The note text content'),
        noteType: z.enum(['general', 'email', 'call', 'meeting', 'whatsapp']).describe('The type of note'),
        files: z.array(z.object({
          link: z.string().describe('URL of the file'),
          name: z.string().nullish().describe('Display name of the file')
        })).nullish().describe('Optional array of file attachments')
      },
      async (params) => {
        try {
          const properties: Record<string, any> = {
            text: params.text,
            type: params.noteType
          };
          if (params.files != null) properties.files = params.files;

          const result = await client.post(`/notes/${params.fromObject}/${params.fromObjectId}`, { properties });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 3. Delete a note
    server.tool(
      'beeno_notes_delete',
      'Permanently delete a note from Beeno CRM. This action cannot be undone.',
      {
        noteId: z.string().describe('The ID of the note to delete')
      },
      async (params) => {
        try {
          const result = await client.delete(`/notes/${params.noteId}`);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}
