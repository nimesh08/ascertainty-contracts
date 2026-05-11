# Accounts Reference

Exira stores state in nine types of Program Derived Accounts (PDAs). Every struct derives `InitSpace` from Anchor, so the rent-exempt space allocation is `8 + T::INIT_SPACE` (8 bytes for the Anchor account discriminator plus the derived size of the struct). All fields shown below come directly from `programs/exira/src/state/*`.

Seed constants are defined in `programs/exira/src/constants.rs`:

```rust
PLATFORM_SEED     = b"platform"
PROJECT_SEED      = b"project"
POOL_SEED         = b"pool"
POOL_LINK_SEED    = b"pool_link"
POSITION_SEED     = b"position"
MRV_PROJECT_SEED  = b"mrv_project"
BASELINE_SEED     = b"baseline"
VERIFICATION_SEED = b"verification"
AUDITOR_SEED      = b"auditor"
```

## 1. `Platform`

Singleton platform configuration.

- **Seeds:** `["platform"]`.
- **Fields:**
  - `admin: Pubkey` : authority for all admin-gated instructions.
  - `treasury: Pubkey` : receives origination fee.
  - `usdc_mint: Pubkey` : the accepted USDC mint (Circle).
  - `origination_fee_bps: u16`.
  - `performance_fee_bps: u16`.
  - `hurdle_rate_bps: u16`.
  - `project_count: u64` : monotonic project counter (informational).
  - `pool_count: u64` : monotonic pool counter (informational).
  - `bump: u8`.
- **Space:** `8 + Platform::INIT_SPACE` = `8 + (32*3 + 2*3 + 8*2 + 1)` = 127 bytes.
- **Lifecycle:**
  - Created by `initialize_platform` (one time).
  - Mutated by `create_project` and `create_pool` (counter bumps).
  - Referenced read-only by every admin instruction via `has_one = admin`.
  - Never closed.

## 2. `Project`

One per MSME retrofit being financed.

- **Seeds:** `["project", project_id.to_le_bytes()]` (`project_id: u64`, so 8-byte little-endian suffix).
- **Fields:**
  - `project_id: u64`.
  - `mrv_project: Pubkey` : stored link to the MRV project (set at create).
  - `token_mint: Pubkey` : the project's SPL token mint (authority = this PDA).
  - `usdc_vault: Pubkey` : USDC ATA owned by this PDA.
  - `target_amount: u64` : total USDC this project will raise (also caps tokens minted).
  - `tokens_sold: u64` : current outstanding token supply.
  - `total_distributed: u64` : lifetime USDC deposited via `distribute_repayment`.
  - `cumulative_usdc_per_token: u128` : pull-based dividend accumulator scaled by `PRECISION`.
  - `term_months: u8`.
  - `status: ProjectStatus` : one of `Funding`, `Active`, `Repaying`, `Completed`, `Cancelled`.
  - `activated_at: i64`.
  - `created_at: i64`.
  - `origination_fee_collected: u64`.
  - `bump: u8`.
- **Space:** `8 + Project::INIT_SPACE` = `8 + (8 + 32*3 + 8*3 + 16 + 1 + 1 + 8*2 + 8 + 1)` = 180 bytes (`u128` = 16 bytes; `ProjectStatus` = 1 byte under InitSpace).
- **Lifecycle:**
  - Created by `create_project`.
  - Mutated by `buy_project_tokens` (tokens_sold += amount), `withdraw_investment` (tokens_sold -= amount), `activate_project` (status Funding to Active), `distribute_repayment` (accumulator + total_distributed + status Active to Repaying on first call), `close_project` (status to Completed).
  - Signs PDA-signed CPIs as mint authority, vault authority, and freeze authority.
  - Never closed in V1.

## 3. `Pool`

One per diversified pool product.

- **Seeds:** `["pool", pool_id.to_le_bytes()]`.
- **Fields:**
  - `pool_id: u64`.
  - `pool_token_mint: Pubkey`.
  - `usdc_vault: Pubkey`.
  - `target_amount: u64`.
  - `tokens_sold: u64`.
  - `total_distributed: u64`.
  - `cumulative_usdc_per_token: u128`.
  - `underlying_project_count: u16`.
  - `status: PoolStatus` : one of `Funding`, `Active`, `Distributing`, `Completed`, `Cancelled`.
  - `created_at: i64`.
  - `bump: u8`.
- **Space:** `8 + Pool::INIT_SPACE` = `8 + (8 + 32*2 + 8*3 + 16 + 2 + 1 + 8 + 1)` = 140 bytes.
- **Lifecycle:**
  - Created by `create_pool`.
  - Mutated by `add_project_to_pool` (increments `underlying_project_count`), `buy_pool_tokens` (tokens_sold += amount), `distribute_pool_returns` (accumulator + total_distributed).
  - Signs PDA-signed CPIs as pool-token mint authority and pool USDC vault authority.
  - Never closed in V1.

## 4. `PoolProjectLink`

A join record, one per (pool, project) pair.

- **Seeds:** `["pool_link", pool.key().as_ref(), project.key().as_ref()]`.
- **Fields:**
  - `pool: Pubkey`.
  - `project: Pubkey`.
  - `project_tokens_held: u64` : how many project tokens the pool currently holds for this link (reserved for V2 pool-CPI flow; stays at 0 in V1).
  - `bump: u8`.
- **Space:** `8 + PoolProjectLink::INIT_SPACE` = `8 + (32 + 32 + 8 + 1)` = 81 bytes.
- **Lifecycle:**
  - Created by `add_project_to_pool`.
  - Not mutated in V1 (reserved for V2 where pool PDA buys underlying project tokens).
  - Never closed in V1.

## 5. `InvestorPosition`

One per (target, owner). `target` is the pubkey of either a `Project` PDA or a `Pool` PDA; the same struct is reused for both layers.

- **Seeds:** `["position", target.key().as_ref(), owner.key().as_ref()]`.
- **Fields:**
  - `owner: Pubkey` : the investor wallet.
  - `target: Pubkey` : the Project or Pool PDA.
  - `tokens_held: u64` : project or pool tokens currently held.
  - `last_claimed_per_token: u128` : accumulator value at last claim (or at initial buy baseline).
  - `total_claimed: u64` : lifetime USDC pulled by this position.
  - `bump: u8`.
- **Space:** `8 + InvestorPosition::INIT_SPACE` = `8 + (32 + 32 + 8 + 16 + 8 + 1)` = 105 bytes.
- **Lifecycle:**
  - Created (`init_if_needed`) by `buy_project_tokens` or `buy_pool_tokens`.
  - Mutated by subsequent buys, `claim_project_returns`, `claim_pool_returns`, and `withdraw_investment`.
  - `withdraw_investment` zeroes `tokens_held` but does NOT close the account in V1.

## 6. `MrvProject`

MRV registry entry for one MSME.

- **Seeds:** `["mrv_project", project_id.to_le_bytes()]`.
- **Fields:**
  - `project_id: u64`.
  - `msme_name: [u8; 64]` (fixed-length, zero-padded).
  - `sector: [u8; 32]`.
  - `location: [u8; 64]`.
  - `upgrade_type: [u8; 32]`.
  - `status: MrvProjectStatus` : one of `Registered`, `BaselineSubmitted`, `InProgress`, `Completed`.
  - `baseline_submitted: bool`.
  - `verification_count: u8`.
  - `created_at: i64`.
  - `bump: u8`.
- **Space:** `8 + MrvProject::INIT_SPACE` = `8 + (8 + 64 + 32 + 64 + 32 + 1 + 1 + 1 + 8 + 1)` = 220 bytes.
- **Lifecycle:**
  - Created by `register_mrv_project`.
  - Mutated by `submit_baseline` (flips `baseline_submitted`, sets status BaselineSubmitted) and `submit_verification` (increments `verification_count`, sets status InProgress).
  - Referenced read-only by `create_project` via the `baseline_submitted` constraint.
  - Never closed.

## 7. `Baseline`

Pre-retrofit annual energy data; one per MRV project.

- **Seeds:** `["baseline", mrv_project.key().as_ref()]`.
- **Fields:**
  - `mrv_project: Pubkey`.
  - `auditor: Pubkey` : the auditor who submitted this baseline.
  - `energy_kwh_per_year: u64`.
  - `fuel_type: [u8; 16]`.
  - `cost_inr_per_year: u64` : annual cost in paise (INR x 100).
  - `co2_tons_per_year_x100: u64` : annual CO2 in tons x 100.
  - `report_hash: [u8; 32]` : SHA-256 of the off-chain report.
  - `submitted_at: i64`.
  - `bump: u8`.
- **Space:** `8 + Baseline::INIT_SPACE` = `8 + (32*2 + 8 + 16 + 8 + 8 + 32 + 8 + 1)` = 153 bytes.
- **Lifecycle:** Created exactly once by `submit_baseline`. Never mutated or closed after that.

## 8. `Verification`

Post-retrofit measurement for a period; many per MRV project, keyed by `index`.

- **Seeds:** `["verification", mrv_project.key().as_ref(), &[index]]` (`index: u8`).
- **Fields:**
  - `mrv_project: Pubkey`.
  - `auditor: Pubkey` : auditor who submitted (and must be the one who later attests).
  - `index: u8`.
  - `period_start: i64`.
  - `period_end: i64`.
  - `energy_kwh_saved: u64`.
  - `cost_inr_saved: u64` : savings in paise.
  - `co2_tons_avoided_x100: u64`.
  - `savings_vs_expected_bps: u16`.
  - `report_hash: [u8; 32]`.
  - `attested: bool`.
  - `submitted_at: i64`.
  - `bump: u8`.
- **Space:** `8 + Verification::INIT_SPACE` = `8 + (32 + 32 + 1 + 8*2 + 8*3 + 2 + 32 + 1 + 8 + 1)` = 157 bytes.
- **Lifecycle:**
  - Created by `submit_verification`.
  - Mutated once by `attest_verification` (sets `attested = true`). Never closed.

## 9. `Auditor`

Admin-registered auditor authorization.

- **Seeds:** `["auditor", wallet.key().as_ref()]`.
- **Fields:**
  - `wallet: Pubkey`.
  - `name: [u8; 64]`.
  - `certification: [u8; 32]`.
  - `is_active: bool`.
  - `projects_audited: u32` : reserved counter (not yet incremented in V1).
  - `added_at: i64`.
  - `bump: u8`.
- **Space:** `8 + Auditor::INIT_SPACE` = `8 + (32 + 64 + 32 + 1 + 4 + 8 + 1)` = 150 bytes.
- **Lifecycle:**
  - Created by `add_auditor`.
  - Read by `submit_baseline`, `submit_verification`, `attest_verification` (via `is_active` and `wallet == signer` constraints).
  - `is_active` flag is declared but there is no explicit deactivation instruction in V1; admin-controlled deactivation can be added in a future release by writing a small new instruction that flips the flag.
  - Never closed.

## Cross-cutting notes

- Every mutating instruction re-derives its primary PDAs with the stored `bump` (for example `bump = project.bump`) rather than re-finding, which saves compute and rejects any attempt to pass a different valid bump.
- The Project and Pool PDAs act as authorities for their own SPL token mints and USDC vault ATAs. The same PDA signs both `mint_to` CPIs and `transfer` CPIs, using seeds of the form `[SEED, id_bytes, &[bump]]`.
- `InvestorPosition` is the only account that is intentionally designed to be reused across the two token layers; the `target` field distinguishes which layer the position belongs to at the type level.
