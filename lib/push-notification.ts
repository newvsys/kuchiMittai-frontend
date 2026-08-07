/**
 * Backend API calls for FCM device token registration.
 * Uses NEXT_PUBLIC_API_BASE_URL directly so it works both locally (Docker)
 * and in production (Vercel) without relying on the Next.js rewrite proxy.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

interface PushApiResponse {
  responseMessage: string;
  responseStatus: 'SUCCESS' | 'FAILURE';
}

async function parseApiResponse(res: Response): Promise<PushApiResponse> {
  const json: PushApiResponse = await res.json().catch(() => ({
    responseMessage: `HTTP ${res.status}`,
    responseStatus: 'FAILURE' as const,
  }));
  return json;
}

export async function registerFcmToken(
  token: string,
  userId?: number | string
): Promise<void> {
  const res = await fetch(`${API_BASE}/push/register-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      ...(userId != null ? { userId: Number(userId) } : {}),
      role: 'admin',
      platform: 'WEB',
    }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || data.responseStatus === 'FAILURE') {
    throw new Error(`register-token failed: ${data.responseMessage}`);
  }
}

export async function unregisterFcmToken(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/push/unregister-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || data.responseStatus === 'FAILURE') {
    throw new Error(`unregister-token failed: ${data.responseMessage}`);
  }
}
