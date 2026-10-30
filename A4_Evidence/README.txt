RMT A4 EVIDENCE BUNDLE

supplementary/: new automated collection from 29 October 2026.
  measurements/: all 40 measured trial JSON files, the aggregate batch log, environment, pilot and warm-up records.
  analysis/: all 40 run values, 1680 batch rows, summaries, paired contrasts, and six data plots.
  demonstration/: two separate final-state demonstrations and screenshots; excluded from main statistics.
  app/: original application source, instrumentation wrapper, production build and exact frontend/backend pnpm lockfiles. node_modules is intentionally excluded.
  protocol.txt: protocol fixed before the main sample.
  run.cjs: exact collector used, with its Codex runtime-specific Playwright path preserved for provenance.
  run_portable.cjs: same measurement logic using a normal local Playwright dependency.
  analyse_supplement.py: recreates the supplementary calculations and figures from saved JSON.

raw/, source_snapshot/, processed/, figures/, code/: the original A3 repository snapshot and its separate reanalysis. These original public-site values are not pooled with the supplementary experiment.
audit/: original hashes, collection and report checks, source-access outcomes.
literature/: 11 verified full-text links with access versions and page/section locators, the A2 selection audit and the targeted-search criteria. Full papers are linked rather than redistributed.
audit/literature_access_log.json is the historical initial-candidate download log, including rejected candidates; literature/verified_full_texts.csv is the current active-source register.

REPRODUCE CALCULATIONS
Install the pinned Python packages from supplementary/requirements.txt.
Run python supplementary/analyse_supplement.py.
This reads the saved records and reproduces reported numerical outputs without making up new measurements.

REPEAT COLLECTION
Use the declared Node version and Microsoft Edge environment if matching the original conditions.
Install frontend/backend dependencies with pnpm install --frozen-lockfile in each app folder.
Install the root supplementary/package.json dependency to obtain Playwright 1.62.1.
Build app/frontend with Vite, run app/backend/server_instrumented.cjs, then gateway.cjs.
Run node run_portable.cjs --pilot; then node run_portable.cjs for the main collection.
Run from a fresh copy if preserving the supplied raw files, because a repeated collection writes new measurement files.
The gateway binds 127.0.0.1:18080 and proxies to the backend on port 3001.
Timing values will vary. A new collection is not expected to reproduce the last decimal of the archived values.

CLOUD EVIDENCE
Upload this extracted folder as a4/ in the existing public research repository. Do not overwrite original A3 raw files. The connected account used for this task has read permission only on Ramazan-droid/RMTdata, so no new files have been published there.

PROVENANCE
Supplementary scripts and measurements were prepared and run with Codex assistance. They must not be described as manual student measurements or backdated to A3. The course AI-use restriction remains applicable to the submitted report.
