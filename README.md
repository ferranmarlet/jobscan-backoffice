# JobScan Backoffice

Backoffice web app for browsing the job postings collected by the JobScan API. It is a single page application built with React, TypeScript and Vite.

## Features

- Sign-in through Amazon Cognito's hosted login. Every API request carries the user's access token as a Bearer token
- Table of job postings showing title (linked to the original posting), company, location, work mode, seniority, salary, skills, source, status and discovery date
- Change a posting's status from the table, saved through the API
- Filters by status, work mode and source, applied by the API
- Server-side pagination
- Loading, empty and error states
- Section for choosing a resume file. The file stays in the browser and is not uploaded yet
- Reusable `PagedTable` component that works with any endpoint following the API contract below
- Plain CSS with no UI dependencies

## Getting started

Requires Node.js 20 or later.

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the Cognito values from `terraform -chdir=terraform output` (the stack must be deployed, see [Deployment](#deployment)). The app won't start without them.

The dev server proxies `/api` requests to the JobScan API at `API_URL` (`http://localhost:8080` by default, see the API's README to run it), so the API needs no CORS configuration in development. The API must be configured with the same user pool and app client (`COGNITO_ISSUER_URI` and `COGNITO_SPA_CLIENT_ID`).

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

The proxy only runs in development. In production, CloudFront routes `/api` to the API.

## Authentication

The app signs users in through Cognito's hosted login using the authorization code grant with PKCE ([`oidc-client-ts`](https://github.com/authts/oidc-client-ts)). It sends the access token to the API as `Authorization: Bearer <token>`, and the API validates it as a JWT. Tokens are kept in `sessionStorage` and renewed with the refresh token before they expire. Signing out revokes the refresh token and ends the hosted login session.

Users can't sign themselves up. Create one and, if needed, add them to the `admin` group:

```sh
POOL_ID=$(terraform -chdir=terraform output -raw cognito_user_pool_id)
aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username user@example.com
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username user@example.com --group-name admin
```

Cognito emails a temporary password, which must be changed at first sign-in. The local dev server (`http://localhost:5173/`) is an allowed redirect URL. Add others with `cognito_extra_redirect_urls`.

## Deployment

The site is served from S3 through CloudFront, which also routes `/api/*` to the API instance. `terraform/` defines this along with the Cognito user pool, and reads the API stack's state from `../jobscan/terraform`.

### Prerequisites

- Node.js 20 or later, Terraform and the AWS CLI are installed.
- You are logged in to AWS (`aws login`).
- The API stack in `../jobscan` is deployed (see its README). This stack reads its state to find the API instance.

### First deployment

The two stacks depend on each other: this one needs the API's state, and the API needs this stack's Cognito user pool to validate tokens. So the first deployment goes back and forth between them.

1. Create the infrastructure: S3 bucket, CloudFront distribution and Cognito user pool.

   ```sh
   terraform -chdir=terraform init
   terraform -chdir=terraform apply
   ```

2. Point the API at the user pool. Copy these outputs into `cognito_issuer_uri` and `cognito_spa_client_id` in `../jobscan/terraform/dev.tfvars`:

   ```sh
   terraform -chdir=terraform output cognito_issuer_uri
   terraform -chdir=terraform output cognito_spa_client_id
   ```

   Then apply the API stack, which passes them to the API as `COGNITO_ISSUER_URI` and `COGNITO_SPA_CLIENT_ID`:

   ```sh
   terraform -chdir=../jobscan/terraform apply -var-file=dev.tfvars
   ```

3. Create a user (see [Authentication](#authentication)).

4. Publish the site, as described below.

### Publishing a new version

The Cognito settings are baked into the build, so write them from the Terraform outputs first. Then build, upload to S3 and invalidate the CloudFront cache so viewers get the new files:

```sh
cat > .env.production.local <<EOF
VITE_COGNITO_ISSUER_URI=$(terraform -chdir=terraform output -raw cognito_issuer_uri)
VITE_COGNITO_CLIENT_ID=$(terraform -chdir=terraform output -raw cognito_spa_client_id)
VITE_COGNITO_LOGIN_DOMAIN=$(terraform -chdir=terraform output -raw cognito_login_domain)
EOF
npm ci
npm run build
aws s3 sync dist "s3://$(terraform -chdir=terraform output -raw bucket_name)" --delete
aws cloudfront create-invalidation --paths '/*' \
  --distribution-id "$(terraform -chdir=terraform output -raw distribution_id)"
```

The site is then at `terraform -chdir=terraform output -raw url`. The invalidation can take a few minutes to reach every edge location.

### Maintenance

- If the API's Auto Scaling group replaces the instance, run `terraform -chdir=terraform apply` again to move the Elastic IP to the new instance. The API is unreachable from the site until then.
- If the user pool or app client is recreated, its IDs change: repeat step 2 of the first deployment and publish the site again.

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
src/auth.ts             Cognito sign-in and apiFetch, which sends the access token
src/App.tsx             Sign-in gate and header
src/PagedTable.tsx      Reusable table with filters and pagination
src/JobPostings.tsx     Job posting type, columns and filters
src/ResumeUpload.tsx    Resume file picker, not connected to an API yet
src/index.css           Styles
terraform/              S3, CloudFront and Cognito infrastructure
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
