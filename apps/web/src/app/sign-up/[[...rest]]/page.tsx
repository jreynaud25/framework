import { SignUp } from '@clerk/nextjs'

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

export default function SignUpPage() {
  if (!HAS_CLERK) {
    return (
      <main className="grid min-h-dvh place-items-center px-8 text-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-fw-muted">Sign up disabled</div>
          <h1 className="mt-2 font-display text-3xl">Auth not configured</h1>
          <p className="mt-3 max-w-md text-fw-muted">
            Set Clerk keys in <code>.env.local</code> to enable sign-up.
          </p>
        </div>
      </main>
    )
  }
  return (
    <main className="grid min-h-dvh place-items-center px-8">
      <SignUp appearance={{ elements: { rootBox: { width: '100%' } } }} />
    </main>
  )
}
