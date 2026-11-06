import type { Plugin } from 'vite'

const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE']
const SENIORITIES = ['JUNIOR', 'MID', 'SENIOR', 'LEAD']
const STATUSES = ['OPEN', 'OPEN', 'APPLIED', 'REJECTED', 'CLOSED']
const TITLES = ['Backend Engineer', 'Frontend Engineer', 'Platform Engineer', 'Data Engineer']
const COMPANIES = ['Acme', 'Globex', 'Initech', null]
const LOCATIONS = ['Barcelona', 'Madrid', 'Berlin', null]
const SKILLS = ['Kotlin', 'React', 'AWS', 'PostgreSQL', 'Terraform']

const postings = Array.from({ length: 57 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  externalId: `job-${i}`,
  externalSourceId: 'findwork',
  title: TITLES[i % TITLES.length],
  company: COMPANIES[i % COMPANIES.length],
  location: LOCATIONS[i % LOCATIONS.length],
  workMode: WORK_MODES[i % WORK_MODES.length],
  seniority: SENIORITIES[i % SENIORITIES.length],
  salary: i % 3 ? { min: 40_000 + i * 500, max: 60_000 + i * 500, currency: 'EUR' } : null,
  skills: [SKILLS[i % SKILLS.length], SKILLS[(i + 2) % SKILLS.length]],
  sourceUrl: `https://example.com/jobs/${i}`,
  status: STATUSES[i % STATUSES.length],
  discoveredAt: new Date(Date.UTC(2026, 9, 30 - (i % 28))).toISOString(),
}))

export function mockApi(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use('/api/job-postings/', (req, res) => {
        const params = new URL(req.url!, 'http://mock').searchParams
        const matches = postings.filter(
          (posting) =>
            (!params.get('source') || posting.externalSourceId === params.get('source')) &&
            (!params.get('workMode') || posting.workMode === params.get('workMode')) &&
            (!params.get('status') || posting.status === params.get('status')),
        )
        const number = Number(params.get('page') ?? 0)
        const size = Number(params.get('size') ?? 20)
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            content: matches.slice(number * size, (number + 1) * size),
            page: { size, number, totalElements: matches.length, totalPages: Math.ceil(matches.length / size) },
          }),
        )
      })
    },
  }
}
