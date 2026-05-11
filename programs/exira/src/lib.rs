// Exira: savings-backed efficiency financing on Solana
//
// Two-layer token system:
//   - Project tokens: direct ownership of a single MSME's savings stream
//   - Pool tokens:    diversified ownership across multiple projects (Pool PDA holds project tokens)
//
// Distribution uses a pull-based dividend accumulator (u128 scaled by PRECISION = 1e12).

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2");

#[program]
pub mod exira {
    use super::*;

    // ---------- Admin: platform + project + pool lifecycle ----------

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        origination_fee_bps: u16,
        performance_fee_bps: u16,
        hurdle_rate_bps: u16,
    ) -> Result<()> {
        crate::instructions::admin::initialize_platform::handler(
            ctx,
            origination_fee_bps,
            performance_fee_bps,
            hurdle_rate_bps,
        )
    }

    pub fn create_project(
        ctx: Context<CreateProject>,
        project_id: u64,
        target_amount: u64,
        term_months: u8,
    ) -> Result<()> {
        crate::instructions::admin::create_project::handler(
            ctx,
            project_id,
            target_amount,
            term_months,
        )
    }

    pub fn activate_project(ctx: Context<ActivateProject>) -> Result<()> {
        crate::instructions::admin::activate_project::handler(ctx)
    }

    pub fn distribute_repayment(ctx: Context<DistributeRepayment>, amount: u64) -> Result<()> {
        crate::instructions::admin::distribute_repayment::handler(ctx, amount)
    }

    pub fn close_project(ctx: Context<CloseProject>) -> Result<()> {
        crate::instructions::admin::close_project::handler(ctx)
    }

    pub fn create_pool(ctx: Context<CreatePool>, pool_id: u64, target_amount: u64) -> Result<()> {
        crate::instructions::admin::create_pool::handler(ctx, pool_id, target_amount)
    }

    pub fn add_project_to_pool(ctx: Context<AddProjectToPool>) -> Result<()> {
        crate::instructions::admin::add_project_to_pool::handler(ctx)
    }

    pub fn distribute_pool_returns(
        ctx: Context<DistributePoolReturns>,
        amount: u64,
    ) -> Result<()> {
        crate::instructions::admin::distribute_pool_returns::handler(ctx, amount)
    }

    pub fn withdraw_project_funds(
        ctx: Context<WithdrawProjectFunds>,
        amount: u64,
    ) -> Result<()> {
        crate::instructions::admin::withdraw_project_funds::handler(ctx, amount)
    }

    // ---------- Investor: buy / claim / withdraw ----------

    pub fn buy_project_tokens(ctx: Context<BuyProjectTokens>, amount: u64) -> Result<()> {
        crate::instructions::investor::buy_project_tokens::handler(ctx, amount)
    }

    pub fn claim_project_returns(ctx: Context<ClaimProjectReturns>) -> Result<()> {
        crate::instructions::investor::claim_project_returns::handler(ctx)
    }

    pub fn withdraw_investment(ctx: Context<WithdrawInvestment>) -> Result<()> {
        crate::instructions::investor::withdraw_investment::handler(ctx)
    }

    pub fn buy_pool_tokens(ctx: Context<BuyPoolTokens>, amount: u64) -> Result<()> {
        crate::instructions::investor::buy_pool_tokens::handler(ctx, amount)
    }

    pub fn claim_pool_returns(ctx: Context<ClaimPoolReturns>) -> Result<()> {
        crate::instructions::investor::claim_pool_returns::handler(ctx)
    }

    // ---------- MRV ----------

    pub fn register_mrv_project(
        ctx: Context<RegisterMrvProject>,
        project_id: u64,
        msme_name: String,
        sector: String,
        location: String,
        upgrade_type: String,
    ) -> Result<()> {
        crate::instructions::mrv::register_project::handler(
            ctx,
            project_id,
            msme_name,
            sector,
            location,
            upgrade_type,
        )
    }

    pub fn add_auditor(
        ctx: Context<AddAuditor>,
        name: String,
        certification: String,
    ) -> Result<()> {
        crate::instructions::mrv::add_auditor::handler(ctx, name, certification)
    }

    pub fn submit_baseline(
        ctx: Context<SubmitBaseline>,
        energy_kwh_per_year: u64,
        fuel_type: String,
        cost_inr_per_year: u64,
        co2_tons_per_year_x100: u64,
        report_hash: [u8; 32],
    ) -> Result<()> {
        crate::instructions::mrv::submit_baseline::handler(
            ctx,
            energy_kwh_per_year,
            fuel_type,
            cost_inr_per_year,
            co2_tons_per_year_x100,
            report_hash,
        )
    }

    pub fn submit_verification(
        ctx: Context<SubmitVerification>,
        index: u8,
        period_start: i64,
        period_end: i64,
        energy_kwh_saved: u64,
        cost_inr_saved: u64,
        co2_tons_avoided_x100: u64,
        savings_vs_expected_bps: u16,
        report_hash: [u8; 32],
    ) -> Result<()> {
        crate::instructions::mrv::submit_verification::handler(
            ctx,
            index,
            period_start,
            period_end,
            energy_kwh_saved,
            cost_inr_saved,
            co2_tons_avoided_x100,
            savings_vs_expected_bps,
            report_hash,
        )
    }

    pub fn attest_verification(ctx: Context<AttestVerification>) -> Result<()> {
        crate::instructions::mrv::attest::handler(ctx)
    }
}
