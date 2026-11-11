import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { JobPostings } from './JobPostings'
import { ResumeUpload } from './ResumeUpload'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main>
      <ResumeUpload />
      <JobPostings />
    </main>
  </StrictMode>,
)
