import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateLocalAccount,
  createLocalAccount,
  deleteLocalSession,
  LOCAL_SESSION_COOKIE,
  localUserForSession,
} from '../../../lib/local-db';
import {
  authenticateCloudAccount,
  cloudUserForSession,
  createCloudAccount,
  deleteCloudSession,
  usingCloudDatabase,
} from '../../../lib/cloud-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(LOCAL_SESSION_COOKIE)?.value;
  const user = usingCloudDatabase() ? await cloudUserForSession(token) : localUserForSession(token);
  return NextResponse.json({ authenticated: Boolean(user), user });
}

export async function POST(req: NextRequest) {
  let payload: { action?: unknown; email?: unknown; password?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const action = payload.action === 'register' ? 'register' : 'login';
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスを確認してください' }, { status: 400 });
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'パスワードは8〜128文字で入力してください' }, { status: 400 });
  }

  try {
    const result = usingCloudDatabase()
      ? await (action === 'register' ? createCloudAccount(email, password) : authenticateCloudAccount(email, password))
      : (action === 'register' ? createLocalAccount(email, password) : authenticateLocalAccount(email, password));
    const response = NextResponse.json({ authenticated: true, user: result.user });
    response.cookies.set(LOCAL_SESSION_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    const status = error instanceof Error && 'status' in error && typeof error.status === 'number' ? error.status : 500;
    const message = status < 500 && error instanceof Error ? error.message : '認証処理に失敗しました';
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(LOCAL_SESSION_COOKIE)?.value;
  if (usingCloudDatabase()) await deleteCloudSession(token);
  else deleteLocalSession(token);
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(LOCAL_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
