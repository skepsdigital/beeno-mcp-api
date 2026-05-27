import { z } from 'zod';

export const filterSchema = z.object({
  propertyName: z.string().describe('Internal property name to filter on'),
  operator: z.enum([
    'EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE',
    'IN', 'NOT_IN', 'HAS_PROPERTY', 'NOT_HAS_PROPERTY',
    'CONTAINS_TOKEN', 'NOT_CONTAINS_TOKEN'
  ]).describe('Filter operator'),
  value: z.string().nullish().describe('Single value (for all operators except IN/NOT_IN)'),
  values: z.array(z.string()).nullish().describe('Array of values (for IN/NOT_IN operators)')
});

export const paginationSchema = {
  limit: z.number().min(1).max(100).nullish().describe('Results per page (1-100, default 100)'),
  cursor: z.string().nullish().describe('Cursor for next page from previous response')
};

export const sortSchema = {
  sort: z.enum(['date_modified', 'date_added', 'createdAt', 'updatedAt']).nullish()
    .describe('Sort field (default: date_modified)'),
  order: z.enum(['asc', 'desc']).nullish().describe('Sort direction (default: desc)')
};

export const fetchAllSchema = {
  fetchAll: z.boolean().nullish()
    .describe('If true, auto-paginates and returns all results. Use maxResults to cap.'),
  maxResults: z.number().min(1).nullish()
    .describe('Optional cap on results when fetchAll=true (default: all)')
};
