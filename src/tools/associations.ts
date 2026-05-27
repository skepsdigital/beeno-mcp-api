import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';

export function registerAssociationTools(server: McpServer, client: BeenoApiClient): void {

  // 1. Create association
  server.tool(
    'beeno_associations_create',
    'Create association between objects. Cannot associate same object types. For deal->product associations, provide data with quantity and linePrice.',
    {
      fromObject: z.enum(['deal', 'contact', 'company']).describe('Source object type'),
      fromObjectId: z.string().describe('Source object ID'),
      toObject: z.enum(['deal', 'contact', 'company', 'product']).describe('Target object type'),
      toObjectId: z.string().describe('Target object ID'),
      data: z.object({
        quantity: z.number().nullish().describe('Product quantity (for deal->product)'),
        linePrice: z.string().nullish().describe('Line price (for deal->product)'),
        forceUpdateAmount: z.boolean().nullish().describe('Force update deal amount (for deal->product)')
      }).nullish().describe('Additional data for the association (used for deal->product)')
    },
    async (params) => {
      try {
        const result = await client.post(
          `/associations/${params.fromObject}/${params.fromObjectId}/${params.toObject}/${params.toObjectId}`,
          params.data != null ? { data: params.data } : undefined
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Delete association
  server.tool(
    'beeno_associations_delete',
    'Delete an association between two objects',
    {
      fromObject: z.enum(['deal', 'contact', 'company']).describe('Source object type'),
      fromObjectId: z.string().describe('Source object ID'),
      toObject: z.enum(['deal', 'contact', 'company']).describe('Target object type'),
      toObjectId: z.string().describe('Target object ID')
    },
    async (params) => {
      try {
        const result = await client.delete(
          `/associations/${params.fromObject}/${params.fromObjectId}/${params.toObject}/${params.toObjectId}`
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
