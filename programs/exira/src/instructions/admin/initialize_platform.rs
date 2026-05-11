use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::constants::{MAX_FEE_BPS, PLATFORM_SEED};
use crate::error::ExiraError;
use crate::state::Platform;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + Platform::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump,
    )]
    pub platform: Account<'info, Platform>,

    /// Admin who signs and pays. Becomes the platform authority.
    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: treasury is only stored as a pubkey; no data reads required.
    pub treasury: UncheckedAccount<'info>,

    /// The official USDC mint we accept (Circle devnet/mainnet).
    pub usdc_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializePlatform>,
    origination_fee_bps: u16,
    performance_fee_bps: u16,
    hurdle_rate_bps: u16,
) -> Result<()> {
    require!(
        origination_fee_bps <= MAX_FEE_BPS
            && performance_fee_bps <= MAX_FEE_BPS
            && hurdle_rate_bps <= MAX_FEE_BPS,
        ExiraError::InvalidFeeBps
    );

    let platform = &mut ctx.accounts.platform;
    platform.admin = ctx.accounts.admin.key();
    platform.treasury = ctx.accounts.treasury.key();
    platform.usdc_mint = ctx.accounts.usdc_mint.key();
    platform.origination_fee_bps = origination_fee_bps;
    platform.performance_fee_bps = performance_fee_bps;
    platform.hurdle_rate_bps = hurdle_rate_bps;
    platform.project_count = 0;
    platform.pool_count = 0;
    platform.bump = ctx.bumps.platform;

    msg!(
        "Exira platform initialized. admin={} usdc_mint={} fees_bps(orig/perf/hurdle)={}/{}/{}",
        platform.admin,
        platform.usdc_mint,
        platform.origination_fee_bps,
        platform.performance_fee_bps,
        platform.hurdle_rate_bps,
    );

    Ok(())
}
