# Procedure: Add Application Probes

## Purpose

Add live semantic diagnostics for UI failures that screenshots cannot explain precisely.

## Steps

1. Describe the bug as an application law, not as pixels.
2. Add a `<layout-probe/>` when the assertion is geometric.
3. Add a `<probe/>` when the assertion needs custom JavaScript-like logic.
4. Include tolerance for cross-browser/mobile differences.
5. Include repair hints for AI agents.
6. Add a fixture or test that can reproduce the failure.
7. Compile and run probes in the demo.

## Examples

- Collapse button center-y must match title center-y within 2px.
- Ghost cable must be hidden and pathless when no connection exists.
- Cable endpoint must equal measured port dot center in world space.

## Quality gates

- Probe failure reports actual, expected, difference, tolerance, selectors, and hints.
- Probe is stripped or kept according to `<build/>` policy.
