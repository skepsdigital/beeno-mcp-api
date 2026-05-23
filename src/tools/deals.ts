import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { filterSchema, fetchAllSchema, paginationSchema, sortSchema } from '../schemas.js';

export function registerDealTools(server: McpServer, client: BeenoApiClient, readonly: boolean = false): void {

  // 1. List deals
  server.tool(
    'beeno_deals_list',
    'List deals with optional pagination, sorting and property selection',
    {
      ...paginationSchema,
      ...sortSchema,
      properties: z.string().nullable().describe('Comma-separated list of properties to include'),
      includeAssociations: z.boolean().nullable().describe('Whether to include associated records')
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

        const result = await client.get('/deals', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Read a single deal
  server.tool(
    'beeno_deals_read',
    'Get a single deal by ID',
    {
      dealId: z.string().describe('The deal ID to retrieve')
    },
    async (params) => {
      try {
        const result = await client.get(`/deals/${params.dealId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  if (!readonly) {
    // 3. Create a deal
    server.tool(
      'beeno_deals_create',
      'Create a new deal. Required properties typically include pipeline_id, stage_id, name.',
      {
        properties: z.string().describe('JSON string of deal properties (e.g. {"pipeline_id":"3","stage_id":"15","name":"Deal name"})'),
        associations: z.object({
          products: z.array(z.object({
            id: z.number().describe('Product ID'),
            quantity: z.number().describe('Product quantity'),
            linePrice: z.number().describe('Line price for this product')
          })).nullable().describe('Products to associate with the deal'),
          contacts: z.array(z.number()).nullable().describe('Contact IDs to associate'),
          companies: z.array(z.number()).nullable().describe('Company IDs to associate')
        }).nullable().describe('Associations to create with the deal')
      },
      async (params) => {
        try {
          const body: Record<string, any> = { properties: JSON.parse(params.properties) };
          if (params.associations != null) {
            body.associations = params.associations;
          }
          const result = await client.post('/deals', body);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 4. Update a deal
    server.tool(
      'beeno_deals_update',
      'Update an existing deal by ID',
      {
        dealId: z.string().describe('The deal ID to update'),
        properties: z.string().describe('JSON string of deal properties to update (e.g. {"stage_id":"15","name":"New name"})')
      },
      async (params) => {
        try {
          const result = await client.patch(`/deals/${params.dealId}`, { properties: JSON.parse(params.properties) });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 5. Delete a deal
    server.tool(
      'beeno_deals_delete',
      'Delete a deal by ID',
      {
        dealId: z.string().describe('The deal ID to delete')
      },
      async (params) => {
        try {
          const result = await client.delete(`/deals/${params.dealId}`);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }

  // 6. Search deals
  server.tool(
    'beeno_deals_search',
    'Search deals using filters. Use property "alias" from beeno_properties_list as propertyName. Set fetchAll=true to auto-paginate and return all results.',
    {
      filters: z.array(filterSchema).describe('Array of filter conditions'),
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
          const result = await client.postAllPages('/deals/search', body, params.maxResults ?? undefined);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }

        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;

        const result = await client.post('/deals/search', body, queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  if (!readonly) {
    // 7. Replace products in a deal
    server.tool(
      'beeno_deals_replace_products',
      'Replaces ALL products in the deal. Include existing products to keep them. Deal amount is recalculated automatically.',
      {
        dealId: z.string().describe('The deal ID to replace products for'),
        products: z.array(z.object({
          productId: z.number().nullable().describe('Product ID from library (for library products)'),
          quantity: z.string().describe('Product quantity'),
          linePrice: z.string().describe('Line price for this product'),
          isCustom: z.number().describe('0 for library product, 1 for custom product'),
          name: z.string().nullable().describe('Product name (required when isCustom=1)'),
          sku: z.string().nullable().describe('Product SKU (optional)')
        })).describe('Array of products to set on the deal')
      },
      async (params) => {
        try {
          const result = await client.post(`/deals/products/${params.dealId}`, { products: params.products });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}
