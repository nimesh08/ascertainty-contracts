use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{EXIRA_TOKEN_DECIMALS, PLATFORM_SEED, POOL_SEED};
use crate::error::ExiraError;
use crate::state::{Platform, Pool, PoolStatus};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
        has_one = usdc_mint @ ExiraError::InvalidUsdcMint,
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Pool::INIT_SPACE,
        seeds = [POOL_SEED, &pool_id.to_le_bytes()],
        bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(
        init,
        payer = admin,
        mint::decimals = EXIRA_TOKEN_DECIMALS,
        mint::authority = pool,
        mint::freeze_authority = pool,
    )]
    pub pool_token_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = pool,
    )]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreatePool>, pool_id: u64, target_amount: u64) -> Result<()> {
    require!(target_amount > 0, ExiraError::InvalidTargetAmount);

    let clock = Clock::get()?;
    let pool = &mut ctx.accounts.pool;
    pool.pool_id = pool_id;
    pool.pool_token_mint = ctx.accounts.pool_token_mint.key();
    pool.usdc_vault = ctx.accounts.usdc_vault.key();
    pool.target_amount = target_amount;
    pool.tokens_sold = 0;
    pool.total_distributed = 0;
    pool.cumulative_usdc_per_token = 0;
    pool.underlying_project_count = 0;
    pool.status = PoolStatus::Funding;
    pool.created_at = clock.unix_timestamp;
    pool.bump = ctx.bumps.pool;

    ctx.accounts.platform.pool_count = ctx.accounts.platform.pool_count.saturating_add(1);

    msg!(
        "Pool {} created. target_amount={}",
        pool_id,
        target_amount
    );
    Ok(())
}
