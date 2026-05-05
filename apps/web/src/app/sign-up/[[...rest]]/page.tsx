import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-8">
      <SignUp appearance={{ elements: { rootBox: { width: '100%' } } }} />
    </main>
  )
}
