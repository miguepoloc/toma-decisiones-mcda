# Contributing

Thanks for your interest. This repository holds the course material for *Multi-Criteria Decision Making* (Universidad del
Magdalena) and, in [`plataforma/`](plataforma/), an open-source web platform for MCDA (AHP with several experts, TOPSIS, VIKOR,
ELECTRE, PROMETHEE, SAW, Fuzzy-TOPSIS) and an AHP + GIS suitability-map geoviewer.

## Reporting problems
Open an issue with: what you did, what you expected, what happened, and (if it is a numerical result) the input judgments or
decision matrix. Numerical bugs are the most valuable reports: the same maths lives in three places (see below).

## Development
```bash
cd plataforma
npm ci
npm run typecheck
npm test            # unit checks of every method against reference values
npm run test:excel  # exported workbooks: round-trip and live formulas
npm run dev         # needs .env.local with your own Supabase project (see .env.example)
```
`npm run test:db` needs a local PostgreSQL 17 and runs every migration in a throw-away database.

## Rules that matter
- **The same maths lives in three places** (`plataforma/src/lib/*.ts`, the HTML tool template, and the formulas of the exported
  Excel). A change to a method goes in all three, with a test that fails without it.
- Every method is verified against an exact reference (course notebooks / `pyDecision`). Do not change a reference value to make a
  test pass; explain the difference in the pull request.
- Never commit real personal data or expert judgments. Examples must be marked as examples.
- New code and comments in English; user-visible text goes through the translation layer once it lands (see
  `plataforma/docs/PLAN_publicacion.md` §6). The Spanish course material is kept in Spanish on purpose.
- Disclose AI assistance in the pull request description if it wrote or reviewed a significant part of the change.

## Licence
By contributing you agree that your contribution is released under the MIT licence (see `LICENSE`).
