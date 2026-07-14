import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import { AuthProvider } from './lib/AuthContext'
import App from './App'
import './styles/index.css'

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'icfg-brjd2g4anznlytomhw6ogwig.us.auth0.com'
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '5LLCbqAdnnzYsgtvMKvTbOQmR7qUrqXh'

// Force the canonical www host BEFORE Auth0 initializes. The Auth0 PKCE
// transaction (state + code verifier) is stored in a host-only cookie, so login
// must start and finish on the same origin. Users who arrive on the apex domain
// (leguefacile.com) would otherwise get redirected to www AFTER the callback,
// losing the transaction cookie and triggering an "Invalid state" error.
if (window.location.hostname === 'leguefacile.com') {
  window.location.replace(
    `https://www.leguefacile.com${window.location.pathname}${window.location.search}${window.location.hash}`,
  )
}

const CANONICAL_ORIGIN =
  window.location.hostname === 'leguefacile.com'
    ? 'https://www.leguefacile.com'
    : window.location.origin

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: CANONICAL_ORIGIN,
      }}
      cacheLocation="localstorage"
      onRedirectCallback={() => {
        // Keep the path but drop the ?code=&state= query params so a page
        // refresh never re-attempts a stale (already-consumed) authorization code.
        window.history.replaceState({}, document.title, window.location.pathname)
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>,
)
