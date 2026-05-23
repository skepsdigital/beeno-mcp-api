import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { filterSchema, fetchAllSchema, paginationSchema, sortSchema } from '../schemas.js';

export function registerContactTools(server: McpServer, client: BeenoApiClient, readonly: boolean = false): void {

  // 1. List contacts
  server.tool(
    'beeno_contacts_list',
    'List contacts from Beeno CRM with optional filtering by campaign, segment, and pagination support.',
    {
      ...paginationSchema,
      campaignId: z.string().nullable().describe('Filter by campaign ID'),
      segmentId: z.string().nullable().describe('Filter by segment ID'),
      properties: z.string().nullable().describe('Comma-separated list of property names to include in the response'),
      ...sortSchema,
      includeAssociations: z.boolean().nullable().describe('Include associated deals and companies')
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;
        if (params.campaignId != null) queryParams.campaignId = params.campaignId;
        if (params.segmentId != null) queryParams.segmentId = params.segmentId;
        if (params.properties != null) queryParams.properties = params.properties;
        if (params.sort != null) queryParams.sort = params.sort;
        if (params.order != null) queryParams.order = params.order;
        if (params.includeAssociations != null) queryParams.includeAssociations = String(params.includeAssociations);

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

  if (!readonly) {
    // 3. Create a contact
    server.tool(
      'beeno_contacts_create',
      'Create a new contact in Beeno CRM. Property value formats: MultiSelect fields expect an array, Date/DateTime fields expect "YYYY-MM-DD HH:mm" format, all other fields expect a string value.',
      {
        properties: z.string().describe('JSON string of contact properties (e.g. {"first_name":"John","email":"john@example.com"})'),
        associations: z.object({
          deals: z.array(z.number()).nullable().describe('Array of deal IDs to associate'),
          companies: z.array(z.number()).nullable().describe('Array of company IDs to associate')
        }).nullable().describe('Optional associations to link to the new contact')
      },
      async (params) => {
        try {
          const body: Record<string, any> = { properties: JSON.parse(params.properties) };
          if (params.associations != null) body.associations = params.associations;

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
        properties: z.string().describe('JSON string of contact properties to update (e.g. {"first_name":"John","phone":"5511999"})')
      },
      async (params) => {
        try {
          const result = await client.patch(`/contacts/${params.contactId}`, { properties: JSON.parse(params.properties) });
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
  }

  // 6. Search contacts
  server.tool(
    'beeno_contacts_search',
    'Search contacts in Beeno CRM using filters. Use "value" for single-value operators (EQ, NEQ, GT, LT, etc.) and "values" array for IN/NOT_IN. Conditions are AND. Use property "alias" from beeno_properties_list as propertyName. Set fetchAll=true to auto-paginate and return all results.',
    {
      filters: z.array(filterSchema).describe('Array of filter conditions to apply'),
      properties: z.array(z.string()).nullable().describe('List of property alias names to include in results'),
      ...paginationSchema,
      sort: sortSchema.sort,
      order: sortSchema.order,
      ...fetchAllSchema
    },
    async (params) => {
      try {
        const body: Record<string, any> = { filters: params.filters };
        if (params.properties != null) body.properties = params.properties;
        if (params.sort != null) body.sort = params.sort;
        if (params.order != null) body.order = params.order;

        if (params.fetchAll) {
          const result = await client.postAllPages('/contacts/search', body, params.maxResults ?? undefined);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }

        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;

        const result = await client.post('/contacts/search', body, queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
