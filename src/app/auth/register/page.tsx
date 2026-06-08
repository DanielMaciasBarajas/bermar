import { Suspense } from 'react'
import RegisterForm from './RegisterForm'

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--sand)]">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
