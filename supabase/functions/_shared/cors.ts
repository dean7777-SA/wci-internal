// Shared CORS utility — restricts Access-Control-Allow-Origin to known origins.

const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  // Production
  'https://wci-internal.vercel.app',
  'https://www.wallcoverings.co.za',
  'https://wallcoverings.co.za',
  'https://wp-wonderland-connect.vercel.app',
]

const BASE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  Vary: 'Origin',
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': origin }
  }
  // No matching origin → omit Access-Control-Allow-Origin (browser will block)
  return { ...BASE_HEADERS }
}
