import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

if (!process.env.ADMIN_JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('[middleware] ADMIN_JWT_SECRET no está configurado.');
}

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas del admin
  if (
    pathname === '/admin/login' ||
    pathname === '/admin/leads/login' ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/logout') ||
    pathname.startsWith('/api/admin/leads/login')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL('/admin/login', req.url));
    res.cookies.delete('admin_token');
    return res;
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
