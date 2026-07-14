import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Auth0Provider } from '@auth0/auth0-react'
import { AuthProvider } from './lib/AuthContext'
import App from './App'
import './styles/index.css'

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN || 'icfg-brjd2g4anznlytomhw6ogwig.us.auth0.com'
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID || '5LLCbqAdnnzYsgtvMKvTbOQmR7qUrqXh'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
      cacheLocation="localstorage"
    >
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Auth0Provider>
  </StrictMode>,
)
