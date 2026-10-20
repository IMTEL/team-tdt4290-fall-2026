'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';

// A client component: a server page can't pass Next's Link (a function) on to MUI's Button.
/** Links to the page for adding a new legal template. */
export function NewLegalTemplateButton() {
  return (
    <Button component={Link} href="/legal-templates/new" variant="contained">
      Legg til lovverk
    </Button>
  );
}
