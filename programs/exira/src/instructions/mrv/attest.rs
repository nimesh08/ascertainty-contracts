use anchor_lang::prelude::*;

use crate::constants::{AUDITOR_SEED, MRV_PROJECT_SEED, VERIFICATION_SEED};
use crate::error::ExiraError;
use crate::state::{Auditor, MrvProject, Verification};

#[derive(Accounts)]
pub struct AttestVerification<'info> {
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
        seeds = [MRV_PROJECT_SEED, &mrv_project.project_id.to_le_bytes()],
        bump = mrv_project.bump,
    )]
    pub mrv_project: Account<'info, MrvProject>,

    #[account(
        mut,
        seeds = [VERIFICATION_SEED, mrv_project.key().as_ref(), &[verification.index]],
        bump = verification.bump,
        constraint = !verification.attested @ ExiraError::AlreadyAttested,
        constraint = verification.auditor == auditor_signer.key() @ ExiraError::AttestationAuditorMismatch,
    )]
    pub verification: Account<'info, Verification>,
}

pub fn handler(ctx: Context<AttestVerification>) -> Result<()> {
    let verification = &mut ctx.accounts.verification;
    verification.attested = true;

    msg!(
        "Verification #{} attested by auditor {}",
        verification.index,
        ctx.accounts.auditor_signer.key()
    );
    Ok(())
}
