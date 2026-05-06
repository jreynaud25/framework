import { redirect } from 'next/navigation'

/**
 * /templates → /templates/3070
 *
 * Brand-client "Create" surface. Without a session telling us which
 * brand the user belongs to, fall back to the demo brand.
 */
export default function TemplatesIndex() {
  redirect('/templates/3070')
}
