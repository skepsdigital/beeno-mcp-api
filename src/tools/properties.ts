import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';

export function registerPropertyTools(server: McpServer, client: BeenoApiClient, readonly: boolean = false): void {

  // 1. List properties for an object type
  server.tool(
    'beeno_properties_list',
    'List all properties for a given object type. Each property has an "alias" field which is the internal name to use in filters/search (propertyName). The "label" is the display name.',
    {
      objectType: z.enum(['deal', 'contact', 'company']).describe('Object type to list properties for'),
      filter: z.string().optional().describe('Filter properties by alias or label (substring, case-insensitive)'),
      includeOptions: z.boolean().optional().describe('Include full options array for select/multiselect properties (default: false)')
    },
    async (params) => {
      try {
        const result = await client.get(`/properties/${params.objectType}`);

        const properties: any[] = Array.isArray(result) ? result : (result?.results || result?.properties || [result]);

        let summarized = properties.map((prop: any) => {
          const summary: Record<string, any> = {
            alias: prop.alias,
            label: prop.label,
            type: prop.type,
            group: prop.group
          };

          if (prop.type === 'select' || prop.type === 'multiselect') {
            const options = prop.properties?.list || prop.options || [];
            summary.optionsCount = options.length;
            if (params.includeOptions) {
              summary.options = options;
            }
          }

          return summary;
        });

        if (params.filter) {
          const filterLower = params.filter.toLowerCase();
          summarized = summarized.filter((prop: any) =>
            (prop.alias && prop.alias.toLowerCase().includes(filterLower)) ||
            (prop.label && prop.label.toLowerCase().includes(filterLower))
          );
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(summarized, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  if (!readonly) {
    // 2. Create a property
    server.tool(
      'beeno_properties_create',
      'Create a new property for an object type. For select/multiselect types, provide options array.',
      {
        name: z.string().describe('Internal property name'),
        group: z.string().default('core').describe('Property group (default: core)'),
        objectType: z.enum(['deal', 'contact', 'company']).describe('Object type this property belongs to'),
        propertyType: z.enum([
          'date', 'datetime', 'select', 'multiselect', 'text',
          'textarea', 'time', 'number', 'user', 'currency'
        ]).describe('Property data type'),
        isRequired: z.boolean().optional().describe('Whether the property is required'),
        isUniqueIdentifier: z.boolean().optional().describe('Whether the property is a unique identifier'),
        isFormVisible: z.boolean().optional().describe('Whether the property is visible in forms'),
        options: z.array(z.object({
          label: z.string().describe('Display label for the option'),
          value: z.string().describe('Internal value for the option')
        })).optional().describe('Options list (required for select/multiselect types)')
      },
      async (params) => {
        try {
          const body = {
            properties: {
              name: params.name,
              group: params.group,
              object: params.objectType,
              type: params.propertyType,
              isRequired: params.isRequired,
              isUniqueIdentifier: params.isUniqueIdentifier,
              isFormVisible: params.isFormVisible,
              properties: params.options ? { list: params.options } : undefined
            }
          };
          const result = await client.post('/properties', body);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }
}
