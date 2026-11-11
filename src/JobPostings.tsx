import { useState } from 'react'
import { PagedTable, type Column, type Filter } from './PagedTable'

const STATUSES = ['OPEN', 'APPLIED', 'REJECTED', 'CLOSED'] as const

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
  status: (typeof STATUSES)[number]
  discoveredAt: string
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
const options = (...values: string[]) => values.map((value) => ({ value, label: capitalize(value) }))

type ProblemDetail = { title?: string; detail?: string; from?: string; to?: string }

// Turns a failed status update into a message, using the problem details the API sends
async function updateErrorMessage(res: Response): Promise<string> {
  const problem: ProblemDetail = await res.json().catch(() => ({}))
  if (res.status === 409 && problem.from && problem.to) {
    const from = capitalize(problem.from)
    const to = capitalize(problem.to)
    return problem.from === problem.to
      ? `The posting is already ${from}.`
      : `A ${from} posting can't be changed to ${to}.`
  }
  if (res.status === 404) return 'This job posting no longer exists.'
  if (res.status === 400) return problem.detail ?? 'The status update was not valid.'
  return `Update failed with status ${res.status}.`
}

function StatusSelect({ job, onUpdated }: { job: JobPosting; onUpdated: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = async (status: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/job-postings/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(await updateErrorMessage(res))
      onUpdated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <select
        className={`badge status-select ${job.status.toLowerCase()}`}
        aria-label={`Status of ${job.title}`}
        value={job.status}
        disabled={saving}
        onChange={(e) => update(e.target.value)}
      >
        {options(...STATUSES).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="cell-error" role="alert">{error}</div>}
    </>
  )
}

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
    render: (job, reload) => <StatusSelect job={job} onUpdated={reload} />,
  },
  { header: 'Discovered', render: (job) => new Date(job.discoveredAt).toLocaleDateString() },
]

const filters: Filter[] = [
  { param: 'status', label: 'Status', options: options(...STATUSES) },
  { param: 'workMode', label: 'Work mode', options: options('ONSITE', 'HYBRID', 'REMOTE') },
  { param: 'externalSourceId', label: 'Source', options: options('findwork') },
]

export function JobPostings() {
  return (
    <>
      <h1>Job postings</h1>
      <PagedTable path="/job-postings" columns={columns} rowKey={(job) => job.id} filters={filters} />
    </>
  )
}
