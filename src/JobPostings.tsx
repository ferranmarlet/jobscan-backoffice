import { PagedTable, type Column, type Filter } from './PagedTable'

type JobPosting = {
  id: string
  externalId: string | null
  externalSourceId: string
  title: string
  company: string | null
  location: string | null
  workMode: 'ONSITE' | 'HYBRID' | 'REMOTE' | null
  seniority: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | null
  salary: { min: number; max: number; currency: string } | null
  skills: string[]
  sourceUrl: string
  status: 'OPEN' | 'APPLIED' | 'REJECTED' | 'CLOSED'
  discoveredAt: string
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
const options = (...values: string[]) => values.map((value) => ({ value, label: capitalize(value) }))

const columns: Column<JobPosting>[] = [
  {
    header: 'Title',
    render: (job) => (
      <a href={job.sourceUrl} target="_blank" rel="noreferrer">
        {job.title}
      </a>
    ),
  },
  { header: 'Company', render: (job) => job.company },
  { header: 'Location', render: (job) => job.location },
  { header: 'Work mode', render: (job) => job.workMode && capitalize(job.workMode) },
  { header: 'Seniority', render: (job) => job.seniority && capitalize(job.seniority) },
  {
    header: 'Salary',
    render: ({ salary }) =>
      salary && `${salary.min.toLocaleString()}–${salary.max.toLocaleString()} ${salary.currency}`,
  },
  { header: 'Skills', render: (job) => job.skills.join(', ') || null },
  { header: 'Source', render: (job) => capitalize(job.externalSourceId) },
  {
    header: 'Status',
    render: (job) => <span className={`badge ${job.status.toLowerCase()}`}>{capitalize(job.status)}</span>,
  },
  { header: 'Discovered', render: (job) => new Date(job.discoveredAt).toLocaleDateString() },
]

const filters: Filter[] = [
  { param: 'status', label: 'Status', options: options('OPEN', 'APPLIED', 'REJECTED', 'CLOSED') },
  { param: 'workMode', label: 'Work mode', options: options('ONSITE', 'HYBRID', 'REMOTE') },
  { param: 'externalSourceId', label: 'Source', options: options('findwork') },
]

export function JobPostings() {
  return (
    <main>
      <h1>Job postings</h1>
      <PagedTable path="/job-postings" columns={columns} rowKey={(job) => job.id} filters={filters} />
    </main>
  )
}
