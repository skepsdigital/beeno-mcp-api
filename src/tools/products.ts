import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { filterSchema, fetchAllSchema, paginationSchema, sortSchema } from '../schemas.js';

export function registerProductTools(server: McpServer, client: BeenoApiClient): void {

  // 1. List products
  server.tool(
    'beeno_products_list',
    'List products from Beeno CRM with pagination and sorting support.',
    {
      ...paginationSchema,
      ...sortSchema
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit !== undefined) queryParams.limit = String(params.limit);
        if (params.cursor !== undefined) queryParams.cursor = params.cursor;
        if (params.sort !== undefined) queryParams.sort = params.sort;
        if (params.order !== undefined) queryParams.order = params.order;

        const result = await client.get('/products', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Read a single product
  server.tool(
    'beeno_products_read',
    'Read a single product by ID from Beeno CRM, returning all properties.',
    {
      productId: z.string().describe('The ID of the product to read')
    },
    async (params) => {
      try {
        const result = await client.get(`/products/${params.productId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 3. Create a product
  server.tool(
    'beeno_products_create',
    'Create a new product in Beeno CRM. Available properties: name, price, sku, frequency, unit_cost, url, months_term, description.',
    {
      properties: z.record(z.any()).describe('Product properties as key-value pairs')
    },
    async (params) => {
      try {
        const result = await client.post('/products', { properties: params.properties });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 4. Update a product
  server.tool(
    'beeno_products_update',
    'Update an existing product in Beeno CRM. Only provided properties will be updated.',
    {
      productId: z.string().describe('The ID of the product to update'),
      properties: z.record(z.any()).describe('Product properties to update as key-value pairs')
    },
    async (params) => {
      try {
        const result = await client.patch(`/products/${params.productId}`, { properties: params.properties });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 5. Delete a product
  server.tool(
    'beeno_products_delete',
    'Permanently delete a product from Beeno CRM. This action cannot be undone.',
    {
      productId: z.string().describe('The ID of the product to delete')
    },
    async (params) => {
      try {
        const result = await client.delete(`/products/${params.productId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 6. Search products
  server.tool(
    'beeno_products_search',
    'Search products in Beeno CRM using filters. Filterable properties: id, name, price, sku, frequency, unit_cost, url, months_term, description, updatedAt. Set fetchAll=true to auto-paginate.',
    {
      filters: z.array(filterSchema).describe('Array of filter conditions to apply'),
      ...paginationSchema,
      sort: sortSchema.sort,
      order: sortSchema.order,
      ...fetchAllSchema
    },
    async (params) => {
      try {
        const body: Record<string, any> = { filters: params.filters };
        if (params.sort !== undefined) body.sort = params.sort;
        if (params.order !== undefined) body.order = params.order;

        if (params.fetchAll) {
          const result = await client.postAllPages('/products/search', body, params.maxResults);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }

        if (params.limit !== undefined) body.limit = params.limit;
        if (params.cursor !== undefined) body.cursor = params.cursor;

        const result = await client.post('/products/search', body);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
