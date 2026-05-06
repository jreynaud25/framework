import { redirect } from 'next/navigation'

/**
 * /brand → /brand/3070
 *
 * Default landing for the brand-side preview. Until we have a brand
 * picker (or real auth that knows which brand the user belongs to),
 * land directly on the demo brand "30 70 Agency".
 */
export default function BrandIndex() {
  redirect('/brand/3070')
}
