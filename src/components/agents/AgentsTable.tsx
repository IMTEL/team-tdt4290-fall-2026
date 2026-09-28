'use client';

import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Agent } from '@/lib/types';

const columns: GridColDef<Agent>[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'status', headerName: 'Status', width: 130 },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
    },
];

interface AgentsTableProps {
  agents: Agent[];
}

export function AgentsTable({ agents }: AgentsTableProps) {
    return (
      <DataGrid
        rows={agents}
        columns={columns}
        disableRowSelectionOnClick
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
      />
    );
}