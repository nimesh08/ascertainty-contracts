# Testing

Exira ships a 92-scenario integration suite in `tests/integration/exira_suite.ts`. The suite is structured as Mocha `describe` / `it` blocks and runs against either Surfpool or a stock `solana-test-validator`.

## Workflows

### A. Surfpool (recommended, fast)

[Surfpool](https://docs.surfpool.run) is a drop-in faster local validator. `scripts/run-tests.sh` resets Surfpool, airdrops the admin, redeploys the program, and runs the full suite in one shot.

```bash
./scripts/run-tests.sh
```

What the script does:

1. Kills any existing Surfpool process on port 8999.
2. Starts a fresh `surfpool start --ci --legacy-anchor-compatibility` on ports 8999 (RPC) and 9000 (WS).
3. Airdrops 20 SOL to `./keys/admin.json` on the local cluster.
4. Deploys `./target/deploy/exira.so` using `./target/deploy/exira-keypair.json`.
5. Invokes `npx mocha --require ts-node/register --extension ts tests/integration/exira_suite.ts`.

You should see `92 passing`. Surfpool stays running after the script exits; kill it with `pkill -f 'surfpool start'`.

### B. Stock `solana-test-validator`

If you prefer the official validator, the `Anchor.toml` `[scripts.test]` entry is wired up so you can run:

```bash
anchor test
```

Anchor will spin a local validator, deploy the program, and execute the same test file.

### C. CI

The repo does not ship a CI workflow in the MVP. If you add one, the template should match the Surfpool flow: install Solana CLI 3.1.9 (Agave), install Anchor 1.0.0 via `avm`, run `anchor build`, then `./scripts/run-tests.sh`.

## Running a single scenario

The suite uses Mocha, so `--grep` works. The test file has eight top-level `describe` blocks; you can grep by any substring of their titles or by individual `it` titles.

```bash
./scripts/run-tests.sh --grep "Distribution math"
./scripts/run-tests.sh --grep "Late joiner"
./scripts/run-tests.sh --grep "t16"
```

Via `anchor test`, the flag is threaded through `[scripts.test]` in `Anchor.toml`:

```bash
anchor test -- --grep "Distribution math"
```

## What the 92 scenarios cover

The suite is organized into the following groups, by the `describe` block titles in `tests/integration/exira_suite.ts`:

| Group | `describe` title | Count | What it exercises |
|-------|------------------|-------|-------------------|
| Platform | `t06: Platform Initialization` | 7 | `initialize_platform`, PDA derivation, re-init rejection, fee bps validation, bump equality, error-enum presence. |
| MRV Registry | `t07: MRV Registry` | 12 | `register_mrv_project` admin gate, `add_auditor`, duplicate rejection, `submit_baseline` auditor gate, duplicate baseline, `submit_verification` (single and multiple), `attest_verification` self-auditor guard. |
| Project Lifecycle | `t08-t10: Project lifecycle` | 14 | `create_project` (including `MrvBaselineMissing`, non-admin, target=0, term bounds), investor buys, `PoolFull` on overbuy, `activate_project` (fee collection to treasury, post-activation buy rejection), `distribute_repayment` accumulator bumps, per-investor claims. |
| Distribution Math | `t14: Distribution math correctness` | 15 | Single and multi-round distributions; five weekly distributions then single claim; late-buyer fairness; zero-amount distribution; `tokens_sold > 0` precondition; monotonicity; invariant `sum(claims) <= total_distributed`; micro-claim precision. |
| Pool Lifecycle | `t11-t13: Pool lifecycle` | 12 | `create_pool` (non-admin, target=0), `add_project_to_pool` (duplicate rejection), `buy_pool_tokens`, project fill / activate / distribute flow beneath a pool, `distribute_pool_returns`, pool claim, double-claim rejection. |
| Security / Authorization | `t16: Security & authorization` | 20 | Non-admin cannot re-init, create project, create pool, add auditor, distribute, activate, or close; investor cannot claim another's position; fake position PDA rejected; IDL-level checks for signer flags, program present, Anchor version, and presence of specific error codes (`MathOverflow`, `AttestationAuditorMismatch`, `CannotWithdraw`, `NothingToClaim`, `ZeroAmount`). |
| Edge Cases | `t15: Edge cases` | 10 | Zero-amount buy, insufficient USDC, buy exactly-remaining capacity, buy past target, withdraw during Funding (burn + refund), zero-amount distribution, multiple distributions one claim, close transitions, large (10_000 USDC) distribution with `u128`, idempotent multi-buy accumulation. |
| End-to-End | `t17: End-to-end integration` | 5 | Full project lifecycle with three investors and three monthly distributions then close; late-joiner fairness across brackets; mixed direct + pool claim; cancellation via withdraw; origination-fee accounting to treasury. |

Total: 92 tests. `it("N.", ...)` numbering inside each group gives an easy pointer to any single scenario.

## Reading the test output

Mocha emits a green check for each passing `it`, indented under the group. A typical successful run ends with:

```
  92 passing (1m 4s)
```

If a single test fails, Mocha continues and reports all failures at the end. Each failure includes the assertion message and, for on-chain errors, the Anchor error code and instruction name in the stack. For example, a mis-wired account produces something like `AnchorError caused by account: usdc_vault. Error Code: WrongVault. Error Number: 6025`.

## Adding new tests

Conventions used in the existing suite:

- Keep tests top-to-bottom ordered so earlier tests set up state for later ones within the same `describe`. The suite intentionally does not tear down between `it` blocks inside a group; fresh state lives at the top-level `before` hooks of each group.
- Prefer deterministic `project_id` and `pool_id` values (for example `new BN(Date.now())` for uniqueness across reruns, or fixed small integers inside hermetic groups).
- Use `tests/helpers/setup.ts` for shared fixtures (program handle, provider, connection, USDC mint creation on localnet, admin keypair load).
- For negative paths, always assert on the Anchor error code via `try/catch` on `.rpc()` and checking `err.error.errorCode.code` against the string name from `ExiraError`. Do not assert on numeric error numbers; they can shift if the enum is reordered.
- When introducing a new instruction, add at least: a happy-path test, an authority-negative test, and an input-validation test for each `require!`.

## Gotchas

- The integration suite assumes the local cluster is freshly reset. Re-running twice in a row without a reset can fail tests that assume counters start at zero.
- Surfpool's `--legacy-anchor-compatibility` flag is required for Anchor 1.0.0 programs against Surfpool 1.2.1. Without it, account parsing fails.
- `NO_DNA=1` is set by the script to disable Surfpool's DNA background task, which can otherwise race with `anchor deploy` on first start.
