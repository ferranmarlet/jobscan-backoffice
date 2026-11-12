import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

// Values come from the Terraform outputs (see README), baked in at build time
function env(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env.local and fill it in.`)
  return value
}

const clientId = env('VITE_COGNITO_CLIENT_ID')
const loginDomain = env('VITE_COGNITO_LOGIN_DOMAIN')
// Must match one of the client's callback/logout URLs exactly, trailing slash included
const appUrl = `${window.location.origin}/`

// Signs in through Cognito's hosted login with the authorization code grant and PKCE.
// Tokens live in sessionStorage and are renewed with the refresh token before they expire.
export const userManager = new UserManager({
  authority: env('VITE_COGNITO_ISSUER_URI'),
  client_id: clientId,
  redirect_uri: appUrl,
  response_type: 'code',
  scope: 'openid email profile',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

// Drops the ?code=…&state=… Cognito redirects back with, so a reload doesn't reuse them
export function onSigninCallback(): void {
  window.history.replaceState({}, document.title, window.location.pathname)
}

// Revokes the refresh token, forgets the local session and ends the hosted login session.
// Cognito's /logout takes client_id and logout_uri rather than the OIDC end-session
// parameters signoutRedirect sends, so it's called directly.
export async function signOut(): Promise<void> {
  await userManager.revokeTokens(['refresh_token']).catch(() => {})
  await userManager.removeUser()
  const params = new URLSearchParams({ client_id: clientId, logout_uri: appUrl })
  window.location.assign(`https://${loginDomain}/logout?${params}`)
}

async function currentUser(): Promise<User> {
  const user = await userManager.getUser()
  if (user && !user.expired) return user
  // The refresh token expired or was revoked; the hosted login session may still sign in silently
  await userManager.signinRedirect()
  throw new Error('Session expired. Signing in again…')
}

// fetch against the API with the user's access token, which the API validates as a JWT
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { access_token } = await currentUser()
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${access_token}`)
  return fetch(`/api${path}`, { ...init, headers })
}
