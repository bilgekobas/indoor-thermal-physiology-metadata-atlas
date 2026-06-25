import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// GitHub Pages SPA redirect support. public/404.html redirects direct
// URLs such as /population#demographics to /?/population#demographics;
// restore the original path before React Router reads location.pathname.
const redirect = window.location.search
if (redirect.startsWith('?/')) {
  const restoredPath = redirect.slice(2).replace(/~and~/g, '&')
  const restoredSearch = ''
  window.history.replaceState(null, '', `${import.meta.env.BASE_URL}${restoredPath}${restoredSearch}${window.location.hash}`)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
