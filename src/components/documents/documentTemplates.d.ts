export type DocumentTemplateKind =
  | 'cv'
  | 'cover-letter'
  | 'business-plan'
  | 'presentation'
  | 'proposal'
  | 'report'
  | 'meeting-notes'
  | 'portfolio'
  | 'bio'
  | 'linkedin-profile'
  | 'portfolio-website';

export type DocumentTemplateCategory =
  | 'CV & Career'
  | 'Business'
  | 'Presentations'
  | 'Reports & Planning'
  | 'Letters';

export type DocumentTemplate = {
  id: string;
  name: string;
  description: string;
  category: DocumentTemplateCategory;
  documentType: DocumentTemplateKind;
  style: 'modern' | 'classic' | 'minimal' | 'executive';
  variant: 'creative' | 'minimal' | 'sidebar' | 'corporate' | 'proposal' | 'startup' | 'pitch' | 'technology' | 'clinical' | 'report' | 'plan' | 'academic' | 'timeline' | 'letter';
  content: string;
};

export function listDocumentTemplates(kind?: string): DocumentTemplate[];
export function getDocumentTemplate(id: string): DocumentTemplate | undefined;
export function buildDocumentTemplateContent(template: DocumentTemplate, details: Record<string, string>): string;
export function buildClassicCvTemplateContent(details: Record<string, string>): string;
export const documentTemplateCategories: DocumentTemplateCategory[];
