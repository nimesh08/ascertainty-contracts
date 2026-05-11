use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{PLATFORM_SEED, POOL_SEED, PRECISION};
use crate::error::ExiraError;
use crate::state::{Platform, Pool};

#[derive(Accounts)]
pub struct DistributePoolReturns<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
        has_one = usdc_mint @ ExiraError::InvalidUsdcMint,
    )]
    pub platform: Box<Account<'info, Platform>>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, &pool.pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Source of funds for the pool distribution (admin's USDC ATA).
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = admin,
    )]
    pub admin_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DistributePoolReturns>, amount: u64) -> Result<()> {
    require!(amount > 0, ExiraError::ZeroAmount);
    require!(ctx.accounts.pool.tokens_sold > 0, ExiraError::NoTokensSold);

    let cpi_accounts = Transfer {
        from: ctx.accounts.admin_usdc_ata.to_account_info(),
        to: ctx.accounts.usdc_vault.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(Token::id(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let amount_scaled = (amount as u128)
        .checked_mul(PRECISION)
        .ok_or(ExiraError::MathOverflow)?;
    let delta_per_token = amount_scaled
        .checked_div(ctx.accounts.pool.tokens_sold as u128)
        .ok_or(ExiraError::MathUnderflow)?;

    let pool = &mut ctx.accounts.pool;
    pool.cumulative_usdc_per_token = pool
        .cumulative_usdc_per_token
        .checked_add(delta_per_token)
        .ok_or(ExiraError::MathOverflow)?;
    pool.total_distributed = pool
        .total_distributed
        .checked_add(amount)
        .ok_or(ExiraError::MathOverflow)?;

    msg!(
        "distribute_pool_returns: pool={} amount={} cumulative_per_token={}",
        pool.pool_id,
        amount,
        pool.cumulative_usdc_per_token
    );

    Ok(())
}
