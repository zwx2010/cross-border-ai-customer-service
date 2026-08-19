# Browser service investigation

## Phase 1: reproduction

The acceptance wave requires Dify preview re-runs. Browser bootstrap was attempted with the currently installed browser skill package and failed consistently before any tab discovery.

Observed error:

```text
Trusted RPC dependency must resolve within a configured trusted code path:
file:///C:/Users/zwx/.codex/plugins/cache/openai-bundled/browser/26.814.41407/scripts/browser-service.mjs
```

The same failure reproduced through the browser runtime setup and through a direct `nodeRepl.rpc("browser", { method: "setup", params: { environment: "codex-app" } })` call. The referenced `browser-service.mjs` file exists on disk, so this is a trusted-path/runtime configuration failure, not a missing-file failure.

## Phase 2: comparison

- The Dify tab and signed-in session were available in the previous turn, but the fresh browser runtime cannot claim the tab in this turn.
- No Dify workflow or knowledge-base mutation was attempted after the bootstrap failure.
- Existing Dify evidence remains valid and is preserved in the foundation, handoff, and knowledge-base review reports.

## Phase 3: conclusion

The blocker is external to the project artifacts: the Node browser service rejects the installed browser plugin's service module before browser selection. A workspace-level code change cannot safely repair this trusted runtime path.

## Required recovery

Restore the Codex in-app browser service/plugin trust configuration, then rerun the fixed acceptance set in `acceptance-test-set.md`. Do not mark Task 4.2 pass or publish Dify until that rerun completes.
