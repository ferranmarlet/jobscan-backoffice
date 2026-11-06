# JobScan Backoffice

Backoffice web app for browsing the job postings collected by the JobScan API. It is a single page application built with React, TypeScript and Vite.

## Features

- Table of job postings showing title (linked to the original posting), company, location, work mode, seniority, salary, skills, source, status and discovery date
- Filters by status, work mode and source, applied by the API
- Server-side pagination
- Loading, empty and error states
- Reusable `PagedTable` component that works with any endpoint following the API contract below
- Mock API for development while the real list endpoint is unfinished
- Plain CSS with no UI dependencies

## Getting started

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

By default, the dev server answers `/api` requests with mock data from `mockApi.ts`.

To use a real API, copy `.env.example` to `.env.local` and set `API_URL`. The dev server then proxies `/api` requests to that URL, so the API needs no CORS configuration in development.

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

The mock and the proxy only run in development. In production, CloudFront routes `/api` to the API.

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

The table expects this endpoint. `page` is zero-based, and all filters are optional.

```
GET /job-postings/?status=OPEN&workMode=REMOTE&source=findwork&page=0&size=20
```

```json
{
  "content": [
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
  "page": { "size": 20, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

This contract is what the frontend assumes. The API's list endpoint does not implement it yet.

## Project structure

```
mockApi.ts              Mock API plugin for the dev server
vite.config.ts          Chooses between the mock and the API proxy
src/PagedTable.tsx      Reusable table with filters and pagination
src/JobPostings.tsx     Job posting type, columns and filters
src/index.css           Styles
terraform/              S3 and CloudFront infrastructure
```

## Adding a table

Pass `PagedTable` a path, columns and a row key. Filters are optional:

```tsx
<PagedTable
  path="/companies/"
  rowKey={(company) => company.id}
  columns={[{ header: 'Name', render: (company) => company.name }]}
  filters={[{ param: 'country', label: 'Country', options: [{ value: 'ES', label: 'Spain' }] }]}
/>
```

Each filter's `param` is sent as a query parameter, and a column that renders `null` shows a dash.
