import { useAuth } from 'react-oidc-context'
import { signOut } from './auth'
import { JobPostings } from './JobPostings'
import { ResumeUpload } from './ResumeUpload'

export function App() {
  const auth = useAuth()

  // Also covers handling the redirect back from the hosted login
  if (auth.isLoading) return <p className="auth-status">Signing in…</p>

  if (!auth.isAuthenticated) {
    return (
      <div className="auth-status">
        <h1>JobScan Backoffice</h1>
        {auth.error && (
          <p className="error" role="alert">
            Sign-in failed: {auth.error.message}
          </p>
        )}
        <button onClick={() => auth.signinRedirect()}>Sign in</button>
      </div>
    )
  }

  return (
    <>
      <header className="app-header">
        <span>{auth.user?.profile.email}</span>
        <button onClick={signOut}>Sign out</button>
      </header>
      <main>
        <ResumeUpload />
        <JobPostings />
      </main>
    </>
  )
}
