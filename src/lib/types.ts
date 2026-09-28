export interface Agent {
  id: string;
  name: string;
  status: 'draft' | 'published';
  createdAt: string;
}