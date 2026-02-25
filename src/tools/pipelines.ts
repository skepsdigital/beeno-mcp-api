import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';

export function registerPipelineTools(server: McpServer, client: BeenoApiClient): void {

  // 1. List pipelines
  server.tool(
    'beeno_pipelines_list',
    'List all deal pipelines with their stages from Rvops CRM.',
    {},
    async (params) => {
      try {
        const result = await client.get('/deals/pipelines');
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Create a pipeline
  server.tool(
    'beeno_pipelines_create',
    'Create a new deal pipeline with stages in Rvops CRM. Probability must be a multiple of 10 (0-100). Name cannot contain \' " { } / \\',
    {
      name: z.string().describe('Pipeline name. Cannot contain \' " { } / \\'),
      stages: z.array(z.object({
        name: z.string().describe('Stage name'),
        probability: z.string().describe('Win probability as a multiple of 10 (0-100)')
      })).describe('Array of pipeline stages with name and probability')
    },
    async (params) => {
      try {
        const result = await client.post('/deals/pipeline', {
          name: params.name,
          stages: params.stages
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
