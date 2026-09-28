export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published';
  createdAt: string;
}