import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BeenoApiClient } from '../client.js';
import { filterSchema, fetchAllSchema, paginationSchema, sortSchema } from '../schemas.js';

export function registerTaskTools(server: McpServer, client: BeenoApiClient, readonly: boolean = false): void {

  // 1. List tasks
  server.tool(
    'beeno_tasks_list',
    'List tasks from Beeno CRM with pagination and sorting support.',
    {
      ...paginationSchema,
      ...sortSchema
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;
        if (params.sort != null) queryParams.sort = params.sort;
        if (params.order != null) queryParams.order = params.order;

        const result = await client.get('/tasks', queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  // 2. Read a single task
  server.tool(
    'beeno_tasks_read',
    'Read a single task by ID from Beeno CRM, returning all properties.',
    {
      taskId: z.string().describe('The ID of the task to read')
    },
    async (params) => {
      try {
        const result = await client.get(`/tasks/${params.taskId}`);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );

  if (!readonly) {
    // 3. Create a task
    server.tool(
      'beeno_tasks_create',
      'Create a new task in Beeno CRM with optional associations to deals and contacts.',
      {
        properties: z.object({
          name: z.string().describe('Task name'),
          owner: z.number().nullable().describe('Owner user ID'),
          description: z.string().nullable().describe('Task description'),
          due_date: z.string().nullable().describe('Due date in YYYY-MM-DD format'),
          due_time: z.string().nullable().describe('Due time in HH:mm format'),
          task_type: z.enum(['todo', 'call', 'email', 'whatsapp']).nullable().describe('Type of task'),
          priority: z.enum(['0', '1', '2']).nullable().describe('Priority: 0=low, 1=medium, 2=high'),
          source: z.string().nullable().describe('Source of the task'),
          deals: z.array(z.string()).nullable().describe('Array of deal IDs to associate'),
          contacts: z.array(z.string()).nullable().describe('Array of contact IDs to associate')
        }).describe('Task properties')
      },
      async (params) => {
        try {
          const result = await client.post('/tasks', { properties: params.properties });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 4. Update a task
    server.tool(
      'beeno_tasks_update',
      'Update an existing task in Beeno CRM. Only provided properties will be updated.',
      {
        taskId: z.string().describe('The ID of the task to update'),
        properties: z.string().describe('JSON string of task properties to update (e.g. {"name":"Task name","due_date":"2025-01-31"})')
      },
      async (params) => {
        try {
          const result = await client.patch(`/tasks/${params.taskId}`, { properties: JSON.parse(params.properties) });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );

    // 5. Delete a task
    server.tool(
      'beeno_tasks_delete',
      'Permanently delete a task from Beeno CRM. This action cannot be undone.',
      {
        taskId: z.string().describe('The ID of the task to delete')
      },
      async (params) => {
        try {
          const result = await client.delete(`/tasks/${params.taskId}`);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
        }
      }
    );
  }

  // 6. Search tasks
  server.tool(
    'beeno_tasks_search',
    'Search tasks in Beeno CRM using filters. Filterable properties: id, name, due_date, owner_id, task_type, source, description, priority (0=low, 1=medium, 2=high). Set fetchAll=true to auto-paginate.',
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
        if (params.sort != null) body.sort = params.sort;
        if (params.order != null) body.order = params.order;

        if (params.fetchAll) {
          const result = await client.postAllPages('/tasks/search', body, params.maxResults ?? undefined);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }

        const queryParams: Record<string, string> = {};
        if (params.limit != null) queryParams.limit = String(params.limit);
        if (params.cursor != null) queryParams.cursor = params.cursor;

        const result = await client.post('/tasks/search', body, queryParams);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true };
      }
    }
  );
}
