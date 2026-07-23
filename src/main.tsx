import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DsPlatformBridge } from './platform/ds/DsPlatformBridge.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DsPlatformBridge />
    <App />
  </StrictMode>,
)
