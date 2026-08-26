// Server-side mirror of the country lists in src/config/countries.js.
//
// It is a copy rather than an import on purpose. No api/ file imports from src/
// anywhere in this repo, and the endpoint that uses this is the one that creates
// accounts: an import-resolution mistake here means nobody can sign up, and this
// codebase has been bitten by exactly that before. A twenty-line copy is the
// cheaper risk.
//
// scripts/check-shared-constants.mjs fails the build if the two ever disagree.

export const ACCEPTED_COUNTRIES = new Set([
  "United Kingdom",
  "Ireland",
  "United States",
  "Canada",
  "Austria",
  "Belgium",
  "Denmark",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Italy",
  "Luxembourg",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Spain",
  "Sweden",
  "Switzerland",
  "UAE",
  "Qatar",
  "Saudi Arabia",
])

export const RESTRICTED_COUNTRIES = new Set([
  "Russia",
  "North Korea",
  "Iran",
  "Syria",
  "Belarus",
  "Afghanistan",
  "Myanmar",
  "Venezuela",
  "Zimbabwe",
  "Nicaragua",
  "Libya",
  "Somalia",
  "Yemen",
  "Sudan",
  "Mali",
  "Burundi",
  "Central African Republic",
  "Democratic Republic of Congo",
  "Iraq",
  "Lebanon",
  "Bosnia and Herzegovina",
])
