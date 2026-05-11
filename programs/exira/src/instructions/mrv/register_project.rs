use anchor_lang::prelude::*;

use crate::constants::{
    LOCATION_LEN, MRV_PROJECT_SEED, MSME_NAME_LEN, PLATFORM_SEED, SECTOR_LEN, UPGRADE_TYPE_LEN,
};
use crate::error::ExiraError;
use crate::state::{MrvProject, MrvProjectStatus, Platform};

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
#[instruction(project_id: u64)]
pub struct RegisterMrvProject<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + MrvProject::INIT_SPACE,
        seeds = [MRV_PROJECT_SEED, &project_id.to_le_bytes()],
        bump,
    )]
    pub mrv_project: Account<'info, MrvProject>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterMrvProject>,
    project_id: u64,
    msme_name: String,
    sector: String,
    location: String,
    upgrade_type: String,
) -> Result<()> {
    let clock = Clock::get()?;
    let mrv = &mut ctx.accounts.mrv_project;
    mrv.project_id = project_id;
    mrv.msme_name = pad_into::<MSME_NAME_LEN>(&msme_name)?;
    mrv.sector = pad_into::<SECTOR_LEN>(&sector)?;
    mrv.location = pad_into::<LOCATION_LEN>(&location)?;
    mrv.upgrade_type = pad_into::<UPGRADE_TYPE_LEN>(&upgrade_type)?;
    mrv.status = MrvProjectStatus::Registered;
    mrv.baseline_submitted = false;
    mrv.verification_count = 0;
    mrv.created_at = clock.unix_timestamp;
    mrv.bump = ctx.bumps.mrv_project;

    msg!("MRV project {} registered", project_id);
    Ok(())
}
