# Instructions Reference

The Exira program exposes 18 instructions, grouped into three modules: `admin`, `investor`, and `mrv`. Every instruction is defined in `programs/exira/src/instructions/<module>/<name>.rs` and wired into the `#[program]` block in `programs/exira/src/lib.rs`.

Error variants referenced below live in `programs/exira/src/error.rs` (enum `ExiraError`).

## Module: admin (8 instructions)

All admin instructions gate on `has_one = admin @ ExiraError::Unauthorized` against the `Platform` PDA, so the `admin` signer must equal `platform.admin`.

### 1. `initialize_platform(origination_fee_bps: u16, performance_fee_bps: u16, hurdle_rate_bps: u16)`

- **Module:** `admin::initialize_platform`
- **Purpose:** One-time platform bootstrap. Stores admin, treasury, accepted USDC mint, and fee configuration.
- **Accounts:**
  - `platform` : `init`, PDA `[PLATFORM_SEED]`, payer = admin, space = `8 + Platform::INIT_SPACE`.
  - `admin` : `Signer`, `mut`.
  - `treasury` : `UncheckedAccount` (pubkey stored only).
  - `usdc_mint` : `Account<Mint>` (the Circle USDC mint).
  - `system_program` : `Program<System>`.
- **Signers:** `admin`.
- **Constraints:** Each of the three bps arguments must be `<= MAX_FEE_BPS (10_000)`.
- **Effects:** Writes all fields into the new `Platform` account; counters start at 0.
- **Errors:** `InvalidFeeBps`. The `init` constraint itself will throw an Anchor AccountAlreadyInUse error if called a second time.

### 2. `create_project(project_id: u64, target_amount: u64, term_months: u8)`

- **Module:** `admin::create_project`
- **Purpose:** Create a Project PDA plus its fresh SPL token mint and USDC vault ATA.
- **Accounts:** `platform` (`has_one = admin`, `has_one = usdc_mint`), `admin` (Signer, mut), `mrv_project` (must have `baseline_submitted`), `project` (init PDA `[PROJECT_SEED, project_id.to_le_bytes()]`), `token_mint` (init mint, decimals 6, authority = project), `usdc_vault` (init ATA for usdc_mint, authority = project), `usdc_mint`, `system_program`, `token_program`, `associated_token_program`, `rent`.
- **Signers:** `admin` (payer for account rents and mint creation).
- **Constraints:** `target_amount > 0`; `MIN_TERM_MONTHS (6) <= term_months <= MAX_TERM_MONTHS (60)`; `mrv_project.baseline_submitted == true`.
- **Effects:** Initializes the Project with `status = Funding`, sets `created_at`, increments `platform.project_count`.
- **Errors:** `Unauthorized`, `InvalidUsdcMint`, `InvalidTargetAmount`, `InvalidTermMonths`, `MrvBaselineMissing`.

### 3. `activate_project`

- **Module:** `admin::activate_project`
- **Purpose:** Transition a fully-funded project from `Funding` to `Active` and collect the origination fee.
- **Accounts:** `platform` (`has_one = admin`, `has_one = treasury`, `has_one = usdc_mint`), `admin` (Signer), `project` (mut, PDA with `has_one = usdc_vault`), `usdc_vault` (mut), `treasury_usdc_ata` (mut, USDC ATA owned by treasury), `treasury` (UncheckedAccount), `usdc_mint`, `token_program`.
- **Signers:** `admin`.
- **Constraints:** `project.status == Funding`; `project.tokens_sold == project.target_amount`.
- **Effects:** PDA-signed CPI transfers `target_amount * origination_fee_bps / 10_000` USDC from the project vault to the treasury ATA; sets `status = Active`, `activated_at = now`, and `origination_fee_collected = fee_amount`.
- **Errors:** `Unauthorized`, `InvalidUsdcMint`, `WrongVault`, `NotFunding`, `NotFullyFunded`, `MathOverflow`.

### 4. `create_pool(pool_id: u64, target_amount: u64)`

- **Module:** `admin::create_pool`
- **Purpose:** Create a Pool PDA plus its pool-token SPL mint and USDC vault ATA.
- **Accounts:** `platform` (`has_one = admin`, `has_one = usdc_mint`), `admin` (Signer, mut), `pool` (init PDA `[POOL_SEED, pool_id.to_le_bytes()]`), `pool_token_mint` (init mint, decimals 6, authority = pool), `usdc_vault` (init ATA, authority = pool), `usdc_mint`, system + token + associated-token + rent programs.
- **Signers:** `admin`.
- **Constraints:** `target_amount > 0`.
- **Effects:** Initializes Pool with `status = Funding`; increments `platform.pool_count`.
- **Errors:** `Unauthorized`, `InvalidUsdcMint`, `InvalidTargetAmount`.

### 5. `add_project_to_pool`

- **Module:** `admin::add_project_to_pool`
- **Purpose:** Link an existing Project to a Pool.
- **Accounts:** `platform` (`has_one = admin`), `admin` (Signer, mut), `pool` (mut PDA), `project` (PDA), `pool_project_link` (init PDA `[POOL_LINK_SEED, pool_pubkey, project_pubkey]`), `system_program`.
- **Signers:** `admin`.
- **Constraints:** `pool.underlying_project_count < MAX_POOL_PROJECTS_V1 (20)`. The `init` on the link PDA itself prevents double-linking the same (pool, project) pair.
- **Effects:** Creates `PoolProjectLink { pool, project, project_tokens_held: 0 }`; increments `pool.underlying_project_count`.
- **Errors:** `Unauthorized`, `PoolTooManyProjects`. Re-linking the same pair fails with Anchor's AccountAlreadyInUse. The `ProjectAlreadyLinked` error code exists in the enum as a defensive name for the same condition.

### 6. `distribute_repayment(amount: u64)`

- **Module:** `admin::distribute_repayment`
- **Purpose:** Admin deposits MSME repayment USDC into the project vault and bumps the accumulator.
- **Accounts:** `platform` (`has_one = admin`, `has_one = usdc_mint`), `admin` (Signer, mut), `project` (mut PDA with `has_one = usdc_vault`), `admin_usdc_ata` (mut, authority = admin), `usdc_vault` (mut), `usdc_mint`, `token_program`.
- **Signers:** `admin`.
- **Constraints:** `amount > 0`; `project.status in {Active, Repaying}`; `project.tokens_sold > 0`.
- **Effects:** Transfers `amount` USDC from `admin_usdc_ata` to `usdc_vault`; adds `(amount * PRECISION) / tokens_sold` to `cumulative_usdc_per_token`; adds `amount` to `total_distributed`; transitions `Active -> Repaying` on first distribution.
- **Errors:** `Unauthorized`, `InvalidUsdcMint`, `WrongVault`, `ZeroAmount`, `NotActiveOrRepaying`, `NoTokensSold`, `MathOverflow`, `MathUnderflow`.

### 7. `distribute_pool_returns(amount: u64)`

- **Module:** `admin::distribute_pool_returns`
- **Purpose:** Same as `distribute_repayment`, but at the pool layer.
- **Accounts:** `platform` (`has_one = admin`, `has_one = usdc_mint`), `admin` (Signer, mut), `pool` (mut PDA with `has_one = usdc_vault`), `admin_usdc_ata` (mut, authority = admin), `usdc_vault` (mut), `usdc_mint`, `token_program`.
- **Signers:** `admin`.
- **Constraints:** `amount > 0`; `pool.tokens_sold > 0`.
- **Effects:** Transfers USDC into pool vault; updates pool accumulator and `total_distributed`.
- **Errors:** `Unauthorized`, `InvalidUsdcMint`, `WrongVault`, `ZeroAmount`, `NoTokensSold`, `MathOverflow`, `MathUnderflow`.

### 8. `close_project`

- **Module:** `admin::close_project`
- **Purpose:** Mark a project as `Completed`.
- **Accounts:** `platform` (`has_one = admin`), `admin` (Signer), `project` (mut PDA).
- **Signers:** `admin`.
- **Constraints:** `project.status in {Active, Repaying}`.
- **Effects:** Sets `project.status = Completed`.
- **Errors:** `Unauthorized`, `NotActiveOrRepaying`.

## Module: investor (5 instructions)

### 9. `buy_project_tokens(amount: u64)`

- **Module:** `investor::buy_project_tokens`
- **Purpose:** Exchange USDC for project tokens, 1:1.
- **Accounts:** `project` (mut PDA, `has_one = token_mint`, `has_one = usdc_vault`), `token_mint` (mut), `usdc_vault` (mut), `investor` (Signer, mut), `investor_usdc_ata` (mut, authority = investor), `investor_token_ata` (init_if_needed ATA), `position` (init_if_needed PDA `[POSITION_SEED, project_pubkey, investor_pubkey]`), `usdc_mint`, system + token + associated-token + rent programs.
- **Signers:** `investor`.
- **Constraints:** `amount > 0`; `project.status == Funding`; `amount <= target_amount - tokens_sold`.
- **Effects:** Transfers USDC investor to vault; mints `amount` project tokens to `investor_token_ata` signed by the project PDA; on first buy, sets `position.last_claimed_per_token = project.cumulative_usdc_per_token` as the baseline; increments `position.tokens_held` and `project.tokens_sold`.
- **Errors:** `WrongMint`, `WrongVault`, `ZeroAmount`, `NotFunding`, `PoolFull` (buy would exceed target), `MathOverflow`, `MathUnderflow`.

### 10. `buy_pool_tokens(amount: u64)`

- **Module:** `investor::buy_pool_tokens`
- **Purpose:** Same as `buy_project_tokens`, but for pool tokens.
- **Accounts:** `pool` (mut PDA, `has_one = pool_token_mint`, `has_one = usdc_vault`), `pool_token_mint` (mut), `usdc_vault` (mut), `investor` (Signer, mut), `investor_usdc_ata` (mut, authority = investor), `investor_pool_token_ata` (init_if_needed), `position` (init_if_needed PDA `[POSITION_SEED, pool_pubkey, investor_pubkey]`), `usdc_mint`, system + token + associated-token + rent programs.
- **Signers:** `investor`.
- **Constraints:** `amount > 0`; `pool.status == Funding`; `amount <= target_amount - tokens_sold`.
- **Effects:** Transfers USDC; mints pool tokens signed by the pool PDA; sets baseline on new positions; updates `pool.tokens_sold`.
- **Errors:** `WrongMint`, `WrongVault`, `ZeroAmount`, `NotFunding`, `PoolFull`, `MathOverflow`, `MathUnderflow`.

### 11. `claim_project_returns`

- **Module:** `investor::claim_project_returns`
- **Purpose:** Pull-claim accrued USDC from a project vault.
- **Accounts:** `project` (PDA, `has_one = usdc_vault`), `usdc_vault` (mut), `investor` (Signer, mut), `position` (mut PDA, `position.owner == investor`, `position.target == project`), `investor_usdc_ata` (init_if_needed), `usdc_mint`, system + token + associated-token programs.
- **Signers:** `investor`.
- **Constraints:** `owed = tokens_held * (cumulative_usdc_per_token - last_claimed_per_token) / PRECISION` must be `> 0`; vault must hold at least `owed`.
- **Effects:** PDA-signed CPI transfers `owed` USDC from vault to investor; sets `position.last_claimed_per_token = project.cumulative_usdc_per_token`; adds `owed` to `position.total_claimed`.
- **Errors:** `WrongVault`, `Unauthorized`, `WrongPlatform`, `MathOverflow`, `MathUnderflow`, `NothingToClaim`, `InsufficientVaultBalance`.

### 12. `claim_pool_returns`

- **Module:** `investor::claim_pool_returns`
- **Purpose:** Same as `claim_project_returns`, against a pool vault.
- **Accounts:** `pool` (PDA, `has_one = usdc_vault`), `usdc_vault` (mut), `investor` (Signer, mut), `position` (mut PDA, `position.owner == investor`, `position.target == pool`), `investor_usdc_ata` (init_if_needed), `usdc_mint`, system + token + associated-token programs.
- **Signers:** `investor`.
- **Effects and errors:** Mirror `claim_project_returns`.

### 13. `withdraw_investment`

- **Module:** `investor::withdraw_investment`
- **Purpose:** Cancel-style exit before activation. Burns the investor's project tokens and refunds their USDC 1:1.
- **Accounts:** `project` (mut PDA, `has_one = token_mint`, `has_one = usdc_vault`), `token_mint` (mut), `usdc_vault` (mut), `investor` (Signer, mut), `position` (mut PDA, `position.owner == investor`), `investor_token_ata` (mut), `investor_usdc_ata` (mut), `usdc_mint`, `token_program`.
- **Signers:** `investor`.
- **Constraints:** `project.status in {Funding, Cancelled}`; `position.tokens_held > 0`.
- **Effects:** Burns `tokens_held` project tokens from the investor's ATA; PDA-signed CPI refunds the same amount of USDC from vault to investor; zeroes `position.tokens_held`; decrements `project.tokens_sold`.
- **Errors:** `WrongMint`, `WrongVault`, `Unauthorized`, `CannotWithdraw`, `NothingToClaim`, `MathUnderflow`.

Note: V1 does not provide a pool-side `withdraw_investment` counterpart.

## Module: mrv (5 instructions)

### 14. `register_mrv_project(project_id: u64, msme_name: String, sector: String, location: String, upgrade_type: String)`

- **Module:** `mrv::register_project`
- **Purpose:** Admin creates an MRV registry entry.
- **Accounts:** `platform` (`has_one = admin`), `admin` (Signer, mut), `mrv_project` (init PDA `[MRV_PROJECT_SEED, project_id.to_le_bytes()]`), `system_program`.
- **Signers:** `admin`.
- **Constraints:** Each string must fit its fixed-length array (`MSME_NAME_LEN = 64`, `SECTOR_LEN = 32`, `LOCATION_LEN = 64`, `UPGRADE_TYPE_LEN = 32`).
- **Effects:** Writes padded bytes into `MrvProject`; `status = Registered`, `baseline_submitted = false`.
- **Errors:** `Unauthorized`, `StringTooLong`.

### 15. `add_auditor(name: String, certification: String)`

- **Module:** `mrv::add_auditor`
- **Purpose:** Admin authorizes an auditor wallet.
- **Accounts:** `platform` (`has_one = admin`), `admin` (Signer, mut), `auditor_wallet` (UncheckedAccount, pubkey stored), `auditor` (init PDA `[AUDITOR_SEED, auditor_wallet_pubkey]`), `system_program`.
- **Signers:** `admin`.
- **Constraints:** Strings must fit (`AUDITOR_NAME_LEN = 64`, `CERTIFICATION_LEN = 32`).
- **Effects:** Creates `Auditor { wallet, name, certification, is_active: true, projects_audited: 0 }`.
- **Errors:** `Unauthorized`, `StringTooLong`.

### 16. `submit_baseline(energy_kwh_per_year: u64, fuel_type: String, cost_inr_per_year: u64, co2_tons_per_year_x100: u64, report_hash: [u8; 32])`

- **Module:** `mrv::submit_baseline`
- **Purpose:** Authorized auditor records pre-retrofit annual energy data for an MRV project.
- **Accounts:** `auditor_signer` (Signer, mut), `auditor` (PDA `[AUDITOR_SEED, auditor_signer]`, must be `is_active`), `mrv_project` (mut PDA, must have `!baseline_submitted`), `baseline` (init PDA `[BASELINE_SEED, mrv_project_pubkey]`), `system_program`.
- **Signers:** `auditor_signer`.
- **Constraints:** `auditor.is_active`; `auditor.wallet == auditor_signer.key()`; `!mrv_project.baseline_submitted`; `fuel_type` fits `FUEL_TYPE_LEN = 16`.
- **Effects:** Writes all baseline fields and `report_hash`; flips `mrv_project.baseline_submitted = true`; sets `mrv_project.status = BaselineSubmitted`.
- **Errors:** `AuditorInactive`, `Unauthorized`, `BaselineAlreadySubmitted`, `StringTooLong`.

### 17. `submit_verification(index: u8, period_start: i64, period_end: i64, energy_kwh_saved: u64, cost_inr_saved: u64, co2_tons_avoided_x100: u64, savings_vs_expected_bps: u16, report_hash: [u8; 32])`

- **Module:** `mrv::submit_verification`
- **Purpose:** Authorized auditor records a post-retrofit measurement for a period.
- **Accounts:** `auditor_signer` (Signer, mut), `auditor` (PDA, must be active and match signer), `mrv_project` (mut PDA, must have `baseline_submitted`), `verification` (init PDA `[VERIFICATION_SEED, mrv_project_pubkey, [index]]`), `system_program`.
- **Signers:** `auditor_signer`.
- **Constraints:** Auditor active and signer matches; `mrv_project.baseline_submitted`; `period_end > period_start`.
- **Effects:** Stores all verification fields including `auditor = auditor_signer`; `attested = false`; increments `mrv_project.verification_count`; sets `mrv_project.status = InProgress`.
- **Errors:** `AuditorInactive`, `Unauthorized`, `MrvBaselineMissing`, `InvalidVerificationPeriod`.

### 18. `attest_verification`

- **Module:** `mrv::attest`
- **Purpose:** Submitting auditor signs-off on their own verification.
- **Accounts:** `auditor_signer` (Signer, mut), `auditor` (PDA, must be active and match signer), `mrv_project` (PDA), `verification` (mut PDA, must have `!attested` and `verification.auditor == auditor_signer`).
- **Signers:** `auditor_signer`.
- **Constraints:** Auditor active and signer matches; verification not already attested; the attesting wallet must be the same one that submitted the verification.
- **Effects:** Sets `verification.attested = true`.
- **Errors:** `AuditorInactive`, `Unauthorized`, `AlreadyAttested`, `AttestationAuditorMismatch`.
