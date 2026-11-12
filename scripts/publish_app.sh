#!/usr/bin/env bash

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

terraform -chdir=terraform output -raw url
