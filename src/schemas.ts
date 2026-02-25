import { z } from 'zod';

export const filterSchema = z.object({
  propertyName: z.string().describe('Internal property name to filter on'),
  operator: z.enum([
    'EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE',
    'IN', 'NOT_IN', 'HAS_PROPERTY', 'NOT_HAS_PROPERTY',
    'CONTAINS_TOKEN', 'NOT_CONTAINS_TOKEN'
  ]).describe('Filter operator'),
  value: z.string().optional().describe('Single value (for all operators except IN/NOT_IN)'),
  values: z.array(z.string()).optional().describe('Array of values (for IN/NOT_IN operators)')
});

export const paginationSchema = {
  limit: z.number().min(1).max(100).optional().describe('Results per page (1-100, default 100)'),
  cursor: z.string().optional().describe('Cursor for next page from previous response')
};

export const sortSchema = {
  sort: z.enum(['date_modified', 'date_added', 'createdAt', 'updatedAt']).optional()
    .describe('Sort field (default: date_modified)'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)')
};
