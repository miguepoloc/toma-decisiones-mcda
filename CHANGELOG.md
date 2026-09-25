# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/). No tagged release exists yet; the first one (with a Zenodo DOI)
is planned in `plataforma/docs/PLAN_publicacion.md` (task R5).

## [Unreleased]
### Changed
- AHP weights are now the principal eigenvector (Saaty) by default, in the app and in the exported Excel (live power-iteration formulas); the column-average shortcut taught in the course remains selectable and is shown next to it. Reference values re-derived with `numpy.linalg.eig`.

### Added
- Group AHP diagnostics: consensus indicator S* (Goepel 2018) and Monte Carlo weight uncertainty.
- «Mis proyectos» shows method or map type, size and expert progress for each project.
- Geoviewer: «Subir el mapa de este criterio» flow.
- Group AHP with token-based expert links, public read-only results, Excel export with live formulas.
- TOPSIS, VIKOR (editable *v*, compromise-set conditions), PROMETHEE, ELECTRE, SAW, Fuzzy-TOPSIS on a shared decision matrix,
  with target-type criteria.
- AHP + GIS geoviewer: own layers (GeoTIFF, GeoJSON, zipped shapefile, KML, GPX), editable suitability rules, point query,
  parcel analysis, export (GeoTIFF + QML, PNG, KMZ, CSV, Excel).
- Publication-readiness files: `CITATION.cff`, `CONTRIBUTING.md`, CI workflow, English README, publication plan.
