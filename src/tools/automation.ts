import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';

export function registerAutomationTools(server: McpServer, client: BeenoApiClient): void {

  // 1. Add contacts to automation flow
  server.tool(
    'beeno_automation_add_contacts',
    'Add contacts to an active automation flow. The flow must be active.',
    {
      leads: z.array(z.string()).describe('Array of contact IDs to add to the automation'),
      campaign: z.string().describe('Automation flow ID')
    },
    async (params) => {
      try {
        const result = await client.post('/contacts/add-to-campaign', {
          leads: params.leads,
          campaign: params.campaign
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
