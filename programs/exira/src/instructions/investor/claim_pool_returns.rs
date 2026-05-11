use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{POOL_SEED, POSITION_SEED, PRECISION};
use crate::error::ExiraError;
use crate::state::{InvestorPosition, Pool};

#[derive(Accounts)]
pub struct ClaimPoolReturns<'info> {
    #[account(
        seeds = [POOL_SEED, &pool.pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(mut)]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        seeds = [POSITION_SEED, pool.key().as_ref(), investor.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == investor.key() @ ExiraError::Unauthorized,
        constraint = position.target == pool.key() @ ExiraError::WrongPlatform,
    )]
    pub position: Box<Account<'info, InvestorPosition>>,

    #[account(
        init_if_needed,
        payer = investor,
        associated_token::mint = usdc_mint,
        associated_token::authority = investor,
    )]
    pub investor_usdc_ata: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<ClaimPoolReturns>) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let position = &ctx.accounts.position;

    let delta = pool
        .cumulative_usdc_per_token
        .checked_sub(position.last_claimed_per_token)
        .ok_or(ExiraError::MathUnderflow)?;
    let owed_scaled = (position.tokens_held as u128)
        .checked_mul(delta)
        .ok_or(ExiraError::MathOverflow)?;
    let owed = u64::try_from(owed_scaled / PRECISION).map_err(|_| ExiraError::MathOverflow)?;

    require!(owed > 0, ExiraError::NothingToClaim);
    require!(
        ctx.accounts.usdc_vault.amount >= owed,
        ExiraError::InsufficientVaultBalance
    );

    let pool_id = pool.pool_id;
    let pool_id_bytes = pool_id.to_le_bytes();
    let bump = pool.bump;
    let seeds: &[&[u8]] = &[POOL_SEED, pool_id_bytes.as_ref(), &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.usdc_vault.to_account_info(),
        to: ctx.accounts.investor_usdc_ata.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(Token::id(), cpi_accounts, signer);
    token::transfer(cpi_ctx, owed)?;

    let position = &mut ctx.accounts.position;
    position.last_claimed_per_token = pool.cumulative_usdc_per_token;
    position.total_claimed = position
        .total_claimed
        .checked_add(owed)
        .ok_or(ExiraError::MathOverflow)?;

    msg!(
        "claim_pool_returns: investor={} owed={} total_claimed={}",
        ctx.accounts.investor.key(),
        owed,
        position.total_claimed
    );

    Ok(())
}
