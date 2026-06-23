import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('admin_token');
  res.cookies.delete('superadmin_token');
  return res;
}
