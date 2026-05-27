import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';

export function registerCommunicationTools(server: McpServer, client: BeenoApiClient): void {

  // 1. Send WhatsApp template message
  server.tool(
    'beeno_whatsapp_send_template',
    'BETA. Send a WhatsApp template message. Requires RVOPS_WHATSAPP_API_KEY env var.',
    {
      templateId: z.string().describe('Beeno template ID'),
      variables: z.array(z.string()).nullish().describe('Template variable values in order'),
      numberTo: z.string().describe('Recipient WhatsApp number'),
      numberFrom: z.string().describe('Sender WhatsApp number'),
      insertEvent: z.boolean().nullish().describe('Whether to log this message to the contact timeline'),
      ctaVariable: z.string().nullish().describe('CTA button URL variable')
    },
    async (params) => {
      try {
        const result = await client.postWhatsApp(params.templateId, {
          variables: params.variables,
          number_to: params.numberTo,
          number_from: params.numberFrom,
          insert_event: params.insertEvent,
          ctaVariable: params.ctaVariable
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
