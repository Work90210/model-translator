import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    '/api/((?!health|webhooks).*)',
    '/dashboard(.*)',
  ],
};
