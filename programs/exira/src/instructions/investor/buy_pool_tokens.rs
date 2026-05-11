use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::constants::{POOL_SEED, POSITION_SEED};
use crate::error::ExiraError;
use crate::state::{InvestorPosition, Pool, PoolStatus};

#[derive(Accounts)]
pub struct BuyPoolTokens<'info> {
    #[account(
        mut,
        seeds = [POOL_SEED, &pool.pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = pool_token_mint @ ExiraError::WrongMint,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(mut)]
    pub pool_token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub investor_usdc_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = investor,
        associated_token::mint = pool_token_mint,
        associated_token::authority = investor,
    )]
    pub investor_pool_token_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = investor,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [POSITION_SEED, pool.key().as_ref(), investor.key().as_ref()],
        bump,
    )]
    pub position: Box<Account<'info, InvestorPosition>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<BuyPoolTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, ExiraError::ZeroAmount);

    let pool = &ctx.accounts.pool;
    require!(pool.status == PoolStatus::Funding, ExiraError::NotFunding);
    let remaining = pool
        .target_amount
        .checked_sub(pool.tokens_sold)
        .ok_or(ExiraError::MathUnderflow)?;
    require!(amount <= remaining, ExiraError::PoolFull);

    // 1) Transfer USDC from investor -> pool vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.investor_usdc_ata.to_account_info(),
        to: ctx.accounts.usdc_vault.to_account_info(),
        authority: ctx.accounts.investor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(Token::id(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // 2) Mint pool tokens 1:1
    let pool_id = pool.pool_id;
    let pool_id_bytes = pool_id.to_le_bytes();
    let bump = pool.bump;
    let seeds: &[&[u8]] = &[POOL_SEED, pool_id_bytes.as_ref(), &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.pool_token_mint.to_account_info(),
        to: ctx.accounts.investor_pool_token_ata.to_account_info(),
        authority: ctx.accounts.pool.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(Token::id(), cpi_accounts, signer);
    token::mint_to(cpi_ctx, amount)?;

    // 3) Update position + pool
    let position = &mut ctx.accounts.position;
    if position.owner == Pubkey::default() {
        position.owner = ctx.accounts.investor.key();
        position.target = ctx.accounts.pool.key();
        position.last_claimed_per_token = ctx.accounts.pool.cumulative_usdc_per_token;
        position.total_claimed = 0;
        position.bump = ctx.bumps.position;
    }
    position.tokens_held = position
        .tokens_held
        .checked_add(amount)
        .ok_or(ExiraError::MathOverflow)?;

    let pool = &mut ctx.accounts.pool;
    pool.tokens_sold = pool
        .tokens_sold
        .checked_add(amount)
        .ok_or(ExiraError::MathOverflow)?;

    msg!(
        "buy_pool_tokens: pool={} investor={} amount={} tokens_sold={}",
        pool.pool_id,
        ctx.accounts.investor.key(),
        amount,
        pool.tokens_sold
    );

    Ok(())
}
