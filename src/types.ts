export type FilterOperator =
  | 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE'
  | 'IN' | 'NOT_IN' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY'
  | 'CONTAINS_TOKEN' | 'NOT_CONTAINS_TOKEN';

export type SortField = 'date_modified' | 'date_added' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export type AssociationObject = 'deal' | 'contact' | 'company' | 'product';
export type NoteObject = 'deal' | 'contact';
export type PropertyObject = 'deal' | 'contact' | 'company';
export type NoteType = 'general' | 'email' | 'call' | 'meeting' | 'whatsapp';

export interface BeenoConfig {
  domain: string;
  apiKey: string;
  apiKeyName: string;
  whatsappApiKey?: string;
}
