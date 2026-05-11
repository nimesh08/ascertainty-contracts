use anchor_lang::prelude::*;

use crate::constants::{AUDITOR_NAME_LEN, AUDITOR_SEED, CERTIFICATION_LEN, PLATFORM_SEED};
use crate::error::ExiraError;
use crate::state::{Auditor, Platform};

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
pub struct AddAuditor<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// The auditor's wallet that will be authorized.
    /// CHECK: we just store the key.
    pub auditor_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Auditor::INIT_SPACE,
        seeds = [AUDITOR_SEED, auditor_wallet.key().as_ref()],
        bump,
    )]
    pub auditor: Account<'info, Auditor>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddAuditor>, name: String, certification: String) -> Result<()> {
    let clock = Clock::get()?;
    let auditor = &mut ctx.accounts.auditor;
    auditor.wallet = ctx.accounts.auditor_wallet.key();
    auditor.name = pad_into::<AUDITOR_NAME_LEN>(&name)?;
    auditor.certification = pad_into::<CERTIFICATION_LEN>(&certification)?;
    auditor.is_active = true;
    auditor.projects_audited = 0;
    auditor.added_at = clock.unix_timestamp;
    auditor.bump = ctx.bumps.auditor;

    msg!(
        "Auditor {} added (certification=...)",
        ctx.accounts.auditor_wallet.key()
    );
    Ok(())
}
