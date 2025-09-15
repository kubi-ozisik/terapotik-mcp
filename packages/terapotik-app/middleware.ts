import { authConfig } from '@/shared/config/auth-config';
import {
  authenticationRoutes,
  publicRoutes,
  redirectAfterLogin,
} from '@/shared/config/routes.config';
import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
const { auth } = NextAuth(authConfig);

export default auth(async function middleware(
  request: NextRequest & { auth?: unknown },
) {
  const url = request.nextUrl.clone();
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  const hasAuth = !!request.auth;

  // Skip middleware for API routes (including OAuth callbacks)
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

//   if (path === '/') {
//     if (hasAuth) {
//       return NextResponse.redirect(new URL('/dashboard', request.url));
//     }
//     return NextResponse.next();
//   }

  // 2. Check if has auth and trying to access auth pages?
  const isAuthRoute = authenticationRoutes.includes(url.pathname);
  if (isAuthRoute) {
    if (hasAuth) {
      // 2. b and redirect it to default page (/dashboard)
      return Response.redirect(new URL(redirectAfterLogin, url));
    }
    return;
  }

  // Define our protected routes that require authentication
  const isPublicRoute =
    publicRoutes.includes(url.pathname) ||
    publicRoutes.some((route) => url.pathname.startsWith(route));
  const hostname = request.headers.get('host') ?? request.nextUrl.hostname;

  // If the user is trying to access a protected route and is not authenticated
  if (!isPublicRoute && !hasAuth) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If the user is authenticated and trying to access auth pages
  if (
    hasAuth &&
    (path.startsWith('/auth/login') || path.startsWith('/auth/register'))
  ) {
    const redirectUrl = new URL(redirectAfterLogin, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/(api|trpc)(.*)', '/'],
};