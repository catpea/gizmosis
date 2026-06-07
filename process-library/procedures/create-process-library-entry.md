# Procedure: Create or Update a Process Library Entry

## Purpose

Capture newly learned project knowledge so future AI agents do not rediscover it by trial, error, and wasted compute.

## Inputs

- The bug, confusion, or repeated task.
- The correct solution.
- The files and commands involved.
- The quality gate that would have prevented the issue.

## Steps

1. Decide whether this is a new procedure, a guide update, a reference-table update, or a search-index update.
2. Write the entry with these sections: Purpose, Inputs, Steps, Quality gates, Failure recovery.
3. Include exact Gizmo tags or JavaScript features agents should search for.
4. Update `process-library/index.json`.
5. Update `process-library/solutions/search-index.json` with relevant queries.
6. Add or update tests when the procedure encodes a preventable failure.
7. Run `npm test`.

## Quality gates

- An agent can find the entry by searching for the JavaScript feature, Gizmo tag, or symptom.
- The entry says what not to do.
- The entry contains concrete quality gates.
