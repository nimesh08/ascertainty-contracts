use anchor_lang::prelude::*;

use crate::constants::{AUDITOR_SEED, BASELINE_SEED, FUEL_TYPE_LEN, MRV_PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{Auditor, Baseline, MrvProject, MrvProjectStatus};

fn pad_into<const N: usize>(src: &str) -> std::result::Result<[u8; N], ExiraError> {
    let bytes = src.as_bytes();
    if bytes.len() > N {
        return Err(ExiraError::StringTooLong);
    }
    let mut out = [0u8; N];
    out[..bytes.len()].copy_from_slice(bytes);
    Ok(out)
}

#[derive(Accounts)]
pub struct SubmitBaseline<'info> {
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
        constraint = !mrv_project.baseline_submitted @ ExiraError::BaselineAlreadySubmitted,
    )]
    pub mrv_project: Account<'info, MrvProject>,

    #[account(
        init,
        payer = auditor_signer,
        space = 8 + Baseline::INIT_SPACE,
        seeds = [BASELINE_SEED, mrv_project.key().as_ref()],
        bump,
    )]
    pub baseline: Account<'info, Baseline>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitBaseline>,
    energy_kwh_per_year: u64,
    fuel_type: String,
    cost_inr_per_year: u64,
    co2_tons_per_year_x100: u64,
    report_hash: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    let baseline = &mut ctx.accounts.baseline;
    baseline.mrv_project = ctx.accounts.mrv_project.key();
    baseline.auditor = ctx.accounts.auditor_signer.key();
    baseline.energy_kwh_per_year = energy_kwh_per_year;
    baseline.fuel_type = pad_into::<FUEL_TYPE_LEN>(&fuel_type)?;
    baseline.cost_inr_per_year = cost_inr_per_year;
    baseline.co2_tons_per_year_x100 = co2_tons_per_year_x100;
    baseline.report_hash = report_hash;
    baseline.submitted_at = clock.unix_timestamp;
    baseline.bump = ctx.bumps.baseline;

    let mrv = &mut ctx.accounts.mrv_project;
    mrv.baseline_submitted = true;
    mrv.status = MrvProjectStatus::BaselineSubmitted;

    msg!("Baseline submitted for MRV project {}", mrv.project_id);
    Ok(())
}
