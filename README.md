# JobScan Backoffice

Backoffice web app for browsing the job postings collected by the JobScan API. It is a single page application built with React, TypeScript and Vite.

## Features

- Table of job postings showing title (linked to the original posting), company, location, work mode, seniority, salary, skills, source, status and discovery date
- Change a posting's status from the table, saved through the API
- Filters by status, work mode and source, applied by the API
- Server-side pagination
- Loading, empty and error states
- Reusable `PagedTable` component that works with any endpoint following the API contract below
- Plain CSS with no UI dependencies

## Getting started

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

The dev server proxies `/api` requests to the JobScan API at `http://localhost:8080` (see the API's README to run it), so the API needs no CORS configuration in development. To use another API, copy `.env.example` to `.env.local` and set `API_URL`.

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

The proxy only runs in development. In production, CloudFront routes `/api` to the API.

## Deployment

The site is served from S3 through CloudFront, which sends read-only `/api/*` requests to the existing API instance. `terraform/` defines this and reads the API stack's state from `../jobscan/terraform`, so that stack must already be deployed.

Create the infrastructure:

```sh
terraform -chdir=terraform init
terraform -chdir=terraform apply
```

Publish the site:

```sh
npm run build
aws s3 sync dist "s3://$(terraform -chdir=terraform output -raw bucket_name)" --delete
aws cloudfront create-invalidation --paths '/*' \
  --distribution-id "$(terraform -chdir=terraform output -raw distribution_id)"
```

If the API's Auto Scaling group replaces the instance, run `terraform -chdir=terraform apply` again to move the Elastic IP to the new instance. The API is unreachable from the site until then.

## API contract

The table uses the API's list endpoint. `page` is zero-based, the page size is fixed at 20 by the API, and all filters are optional.

```
GET /job-postings?status=OPEN&workMode=REMOTE&externalSourceId=findwork&page=0
```

```json
{
  "elements": [
    {
      "id": "5f0c1a52-7c3e-4f7a-9d55-0a1b2c3d4e5f",
      "externalId": "job-1",
      "externalSourceId": "findwork",
      "title": "Backend Engineer",
      "company": "Acme",
      "location": "Barcelona",
      "workMode": "HYBRID",
      "seniority": "SENIOR",
      "salary": { "min": 60000, "max": 80000, "currency": "EUR" },
      "skills": ["Kotlin", "AWS"],
      "sourceUrl": "https://example.com/jobs/1",
      "status": "OPEN",
      "discoveredAt": "2026-10-30T09:15:00Z"
    }
  ],
  "page": 0,
  "totalPages": 1,
  "totalElements": 1
}
```

Changing a status sends:

```
PATCH /job-postings/{id}
{ "status": "APPLIED" }
```

The table refetches the current page afterwards. CloudFront forwards `PATCH` to the API.

## Project structure

```
vite.config.ts          Dev server proxy to the API
src/PagedTable.tsx      Reusable table with filters and pagination
src/JobPostings.tsx     Job posting type, columns and filters
src/index.css           Styles
terraform/              S3 and CloudFront infrastructure
```

## Adding a table

Pass `PagedTable` a path, columns and a row key. Filters are optional:

```tsx
<PagedTable
  path="/companies"
  rowKey={(company) => company.id}
  columns={[{ header: 'Name', render: (company) => company.name }]}
  filters={[{ param: 'country', label: 'Country', options: [{ value: 'ES', label: 'Spain' }] }]}
/>
```

Each filter's `param` is sent as a query parameter, and a column that renders `null` shows a dash.
