'use client';

import Button from '@mui/material/Button';
import Link from 'next/link';

export default function LogInPageButton() {
    return (
        <Link href="./login">
            <Button>Log In</Button>
        </Link>
    )
}