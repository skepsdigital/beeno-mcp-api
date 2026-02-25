import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { filterSchema, fetchAllSchema, paginationSchema, sortSchema } from '../schemas.js';

export function registerContactTools(server: McpServer, client: BeenoApiClient): void {

  // 1. List contacts
  server.tool(
    'beeno_contacts_list',
    'List contacts from Beeno CRM with optional filtering by campaign, segment, and pagination support.',
    {
      ...paginationSchema,
      campaignId: z.string().optional().describe('Filter by campaign ID'),
      segmentId: z.string().optional().describe('Filter by segment ID'),
      properties: z.string().optional().describe('Comma-separated list of property names to include in the response'),
      ...sortSchema,
      includeAssociations: z.boolean().optional().describe('Include associated deals and companies')
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit !== undefined) queryParams.limit = String(params.limit);
        if (params.cursor !== undefined) queryParams.cursor = params.cursor;
        if (params.campaignId !== undefined) queryParams.campaignId = params.campaignId;
        if (params.segmentId !== undefined) queryParams.segmentId = params.segmentId;
        if (params.properties !== undefined) queryParams.properties = params.properties;
        if (params.sort !== undefined) queryParams.sort = params.sort;
        if (params.order !== undefined) queryParams.order = params.order;
        if (params.includeAssociations !== undefined) queryParams.includeAssociations = String(params.includeAssociations);

        const result = await client.get('/contacts', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Read a single contact
  server.tool(
    'beeno_contacts_read',
    'Read a single contact by ID from Beeno CRM, returning all properties and associations.',
    {
      contactId: z.string().describe('The ID of the contact to read')
    },
    async (params) => {
      try {
        const result = await client.get(`/contacts/${params.contactId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. Create a contact
  server.tool(
    'beeno_contacts_create',
    'Create a new contact in Beeno CRM. Property value formats: MultiSelect fields expect an array, Date/DateTime fields expect "YYYY-MM-DD HH:mm" format, all other fields expect a string value.',
    {
      properties: z.record(z.any()).describe('Contact properties as key-value pairs'),
      associations: z.object({
        deals: z.array(z.number()).optional().describe('Array of deal IDs to associate'),
        companies: z.array(z.number()).optional().describe('Array of company IDs to associate')
      }).optional().describe('Optional associations to link to the new contact')
    },
    async (params) => {
      try {
        const body: Record<string, any> = { properties: params.properties };
        if (params.associations !== undefined) body.associations = params.associations;

        const result = await client.post('/contacts', body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 4. Update a contact
  server.tool(
    'beeno_contacts_update',
    'Update an existing contact in Beeno CRM. Only provided properties will be updated. Set a property value to null to clear it.',
    {
      contactId: z.string().describe('The ID of the contact to update'),
      properties: z.record(z.any()).describe('Contact properties to update as key-value pairs')
    },
    async (params) => {
      try {
        const result = await client.patch(`/contacts/${params.contactId}`, { properties: params.properties });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 5. Delete a contact
  server.tool(
    'beeno_contacts_delete',
    'Permanently delete a contact from Beeno CRM. This action cannot be undone.',
    {
      contactId: z.string().describe('The ID of the contact to delete')
    },
    async (params) => {
      try {
        const result = await client.delete(`/contacts/${params.contactId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 6. Search contacts
  server.tool(
    'beeno_contacts_search',
    'Search contacts in Beeno CRM using filters. Use "value" for single-value operators (EQ, NEQ, GT, LT, etc.) and "values" array for IN/NOT_IN. Conditions are AND. Use property "alias" from beeno_properties_list as propertyName. Set fetchAll=true to auto-paginate and return all results.',
    {
      filters: z.array(filterSchema).describe('Array of filter conditions to apply'),
      properties: z.array(z.string()).optional().describe('List of property alias names to include in results'),
      ...paginationSchema,
      sort: sortSchema.sort,
      order: sortSchema.order,
      ...fetchAllSchema
    },
    async (params) => {
      try {
        const body: Record<string, any> = { filters: params.filters };
        if (params.properties !== undefined) body.properties = params.properties;
        if (params.sort !== undefined) body.sort = params.sort;
        if (params.order !== undefined) body.order = params.order;

        if (params.fetchAll) {
          const result = await client.postAllPages('/contacts/search', body, params.maxResults);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }

        const queryParams: Record<string, string> = {};
        if (params.limit !== undefined) queryParams.limit = String(params.limit);
        if (params.cursor !== undefined) queryParams.cursor = params.cursor;

        const result = await client.post('/contacts/search', body, queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
