export const runtime = 'edge'

export function GET() {
  return Response.json({
    ok: true,
    service: 'framework-web',
    ts: new Date().toISOString(),
  })
}
