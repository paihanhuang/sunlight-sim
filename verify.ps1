$ErrorActionPreference = "Stop"

Write-Output "==> Typecheck"
npm run typecheck

Write-Output "==> Lint"
npm run lint

Write-Output "==> Unit tests"
npm run test

Write-Output "==> Headed Playwright e2e"
npm run test:e2e:headed
