'use client';

import Link from 'next/link';
import Button from '@mui/material/Button';

// A client component: a server page can't pass Next's Link (a function) on to MUI's Button.
/** Links to the page for making a new job seeker profile. */
export function NewProfileButton() {
  return (
    <Button component={Link} href="/profiles/new" variant="contained">
      Lag en ny mal
    </Button>
  );
}
