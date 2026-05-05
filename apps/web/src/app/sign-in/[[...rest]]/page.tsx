import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-8">
      <SignIn appearance={{ elements: { rootBox: { width: '100%' } } }} />
    </main>
  )
}
