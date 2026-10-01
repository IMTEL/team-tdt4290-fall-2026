import { withAuth } from 'next-auth/middleware';

// Sends signed-out users to /login (with `?callbackUrl=`) before they reach pages that need RAGdoll.
export default withAuth({ pages: { signIn: '/login' } });

export const config = {
  matcher: ['/configure/:path*', '/browse-agents/:path*', '/test-chat/:path*'],
};
