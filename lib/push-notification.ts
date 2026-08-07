/**
 * Backend API calls for FCM device token registration.
 * Uses relative URLs — Next.js rewrites proxy /api/* to the Spring Boot backend.
 */

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
  const res = await fetch('/api/push/register-token', {
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
  const res = await fetch('/api/push/unregister-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await parseApiResponse(res);
  if (!res.ok || data.responseStatus === 'FAILURE') {
    throw new Error(`unregister-token failed: ${data.responseMessage}`);
  }
}
