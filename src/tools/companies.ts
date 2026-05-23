import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { filterSchema, fetchAllSchema, paginationSchema, sortSchema } from '../schemas.js';

export function registerCompanyTools(server: McpServer, client: BeenoApiClient, readonly: boolean = false): void {

  // 1. List companies
  server.tool(
    'beeno_companies_list',
    'List companies with optional pagination, sorting, and property selection',
    {
      ...paginationSchema,
      ...sortSchema,
      properties: z.string().nullable().describe('Comma-separated list of property names to include'),
      includeAssociations: z.boolean().nullable().describe('Include associated contacts and deals')
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;
        if (params.sort != null) queryParams.sort = params.sort;
        if (params.order != null) queryParams.order = params.order;
        if (params.properties != null) queryParams.properties = params.properties;
        if (params.includeAssociations != null) queryParams.includeAssociations = String(params.includeAssociations);

        const result = await client.get('/companies', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Read a single company
  server.tool(
    'beeno_companies_read',
    'Get a single company by ID with all its properties',
    {
      companyId: z.string().describe('The company ID to retrieve')
    },
    async (params) => {
      try {
        const result = await client.get(`/companies/${params.companyId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  if (!readonly) {
    // 3. Create a company
    server.tool(
      'beeno_companies_create',
      'Create a new company with properties and optional associations',
      {
        properties: z.string().describe('JSON string of company properties (e.g. {"name":"Acme","domain":"acme.com"})'),
        associations: z.object({
          contacts: z.array(z.number()).nullable().describe('Array of contact IDs to associate'),
          deals: z.array(z.number()).nullable().describe('Array of deal IDs to associate')
        }).nullable().describe('Optional associations to link on creation')
      },
      async (params) => {
        try {
          const body: Record<string, any> = { properties: JSON.parse(params.properties) };
          if (params.associations != null) body.associations = params.associations;

          const result = await client.post('/companies', body);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 4. Update a company
    server.tool(
      'beeno_companies_update',
      'Update an existing company\'s properties',
      {
        companyId: z.string().describe('The company ID to update'),
        properties: z.string().describe('JSON string of company properties to update (e.g. {"name":"Acme","domain":"acme.com"})')
      },
      async (params) => {
        try {
          const result = await client.patch(`/companies/${params.companyId}`, { properties: JSON.parse(params.properties) });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 5. Delete a company
    server.tool(
      'beeno_companies_delete',
      'Delete a company by ID',
      {
        companyId: z.string().describe('The company ID to delete')
      },
      async (params) => {
        try {
          const result = await client.delete(`/companies/${params.companyId}`);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }

  // 6. Search companies
  server.tool(
    'beeno_companies_search',
    'Search companies using filters. Use property "alias" from beeno_properties_list as propertyName. Set fetchAll=true to auto-paginate and return all results.',
    {
      filters: z.array(filterSchema).describe('Array of filter conditions to apply'),
      properties: z.array(z.string()).nullable().describe('Property alias names to include in results'),
      ...paginationSchema,
      ...sortSchema,
      ...fetchAllSchema
    },
    async (params) => {
      try {
        const body: Record<string, any> = { filters: params.filters };
        if (params.properties != null) body.properties = params.properties;
        if (params.sort != null) body.sort = params.sort;
        if (params.order != null) body.order = params.order;

        if (params.fetchAll) {
          const result = await client.postAllPages('/companies/search', body, params.maxResults ?? undefined);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }

        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;

        const result = await client.post('/companies/search', body, queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
