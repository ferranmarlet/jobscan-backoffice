/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COGNITO_ISSUER_URI: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_LOGIN_DOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
