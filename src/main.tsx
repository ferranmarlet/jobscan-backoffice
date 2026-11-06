import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { JobPostings } from './JobPostings'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JobPostings />
  </StrictMode>,
)
