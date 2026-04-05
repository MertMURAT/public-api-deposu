# Contributing

Thanks for contributing to `public-api-deposu`.

## Scope

This repository is a public discovery surface for the live API Deposu catalog.

- The source of truth is the API Deposu backend.
- `README.md` is generated. Do not edit it by hand.
- This repository does not store the full internal catalog dataset.

## Local Workflow

Requirements:

- Node.js 18+

Generate the README locally:

```bash
npm run generate:readme
```

Optional environment variables:

- `CATALOG_API_BASE`
- `SITE_BASE_URL`
- `SITE_LOCALE`
- `REPO_URL`

## What To Report

Open an issue when you find:

- broken docs links
- broken detail or test links
- wrong auth/free/official labels in the public table
- missing APIs that should appear in the public catalog
- formatting bugs in the generated README

## Pull Request Rules

- Keep changes small and focused.
- If you change generation logic, regenerate `README.md` in the same change.
- Do not add private/internal catalog fields to this repository.
- Do not make production write requests from this repo workflow.

## Content Boundary

Keep these out of this repository:

- internal analytics
- ranking logic
- moderation notes
- private verification notes
- non-public operational configuration

## Questions

If the issue is about the product rather than the generated table, use:

- GitHub issues for repository problems
- API Deposu support/submission surfaces for catalog/product requests
