'use client';

import { useRouter } from 'next/navigation';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { formatDate } from '@/lib/format';
import type { Agent } from '@/lib/types';

const columns: GridColDef<Agent>[] = [
  { field: 'name', headerName: 'Navn', flex: 1 },
  {
    field: 'lastUpdated',
    headerName: 'Sist oppdatert',
    width: 180,
    valueFormatter: (value: string) => formatDate(value),
  },
];

interface AgentsTableProps {
  agents: Agent[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
  const router = useRouter();

  return (
    <DataGrid
      rows={agents}
      columns={columns}
      disableRowSelectionOnClick
      onRowClick={(params) => router.push(`/browse-agents/${params.row.id}`)}
      initialState={{
        pagination: { paginationModel: { pageSize: 10 } },
      }}
    />
  );
}
