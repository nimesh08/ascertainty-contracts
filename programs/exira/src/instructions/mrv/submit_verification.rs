use anchor_lang::prelude::*;

use crate::constants::{AUDITOR_SEED, MRV_PROJECT_SEED, VERIFICATION_SEED};
use crate::error::ExiraError;
use crate::state::{Auditor, MrvProject, MrvProjectStatus, Verification};

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct SubmitVerification<'info> {
    #[account(mut)]
    pub auditor_signer: Signer<'info>,

    #[account(
        seeds = [AUDITOR_SEED, auditor_signer.key().as_ref()],
        bump = auditor.bump,
        constraint = auditor.is_active @ ExiraError::AuditorInactive,
        constraint = auditor.wallet == auditor_signer.key() @ ExiraError::Unauthorized,
    )]
    pub auditor: Account<'info, Auditor>,

    #[account(
        mut,
        seeds = [MRV_PROJECT_SEED, &mrv_project.project_id.to_le_bytes()],
        bump = mrv_project.bump,
        constraint = mrv_project.baseline_submitted @ ExiraError::MrvBaselineMissing,
    )]
    pub mrv_project: Account<'info, MrvProject>,

    #[account(
        init,
        payer = auditor_signer,
        space = 8 + Verification::INIT_SPACE,
        seeds = [VERIFICATION_SEED, mrv_project.key().as_ref(), &[index]],
        bump,
    )]
    pub verification: Account<'info, Verification>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
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
    require!(period_end > period_start, ExiraError::InvalidVerificationPeriod);

    let clock = Clock::get()?;
    let verification = &mut ctx.accounts.verification;
    verification.mrv_project = ctx.accounts.mrv_project.key();
    verification.auditor = ctx.accounts.auditor_signer.key();
    verification.index = index;
    verification.period_start = period_start;
    verification.period_end = period_end;
    verification.energy_kwh_saved = energy_kwh_saved;
    verification.cost_inr_saved = cost_inr_saved;
    verification.co2_tons_avoided_x100 = co2_tons_avoided_x100;
    verification.savings_vs_expected_bps = savings_vs_expected_bps;
    verification.report_hash = report_hash;
    verification.attested = false;
    verification.submitted_at = clock.unix_timestamp;
    verification.bump = ctx.bumps.verification;

    let mrv = &mut ctx.accounts.mrv_project;
    mrv.verification_count = mrv.verification_count.saturating_add(1);
    mrv.status = MrvProjectStatus::InProgress;

    msg!(
        "Verification #{} submitted for MRV project {}",
        index,
        mrv.project_id
    );
    Ok(())
}
