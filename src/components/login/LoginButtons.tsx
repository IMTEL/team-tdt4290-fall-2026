'use client';

import Button from '@mui/material/Button';
import { keycloakRegister, keycloakSignIn } from '@/lib/auth';

/** `callbackUrl` is where the user lands after logging in. NextAuth only allows our own origin. */
export function LoginButtons({ callbackUrl = '/' }: { callbackUrl?: string }) {
  return (
    <>
      <Button variant="contained" fullWidth onClick={() => keycloakSignIn(callbackUrl)}>
        Log in
      </Button>
      <Button variant="outlined" fullWidth onClick={() => keycloakRegister(callbackUrl)}>
        Create account
      </Button>
    </>
  );
}
