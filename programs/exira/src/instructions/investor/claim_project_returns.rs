use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{POSITION_SEED, PRECISION, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{InvestorPosition, Project};

#[derive(Accounts)]
pub struct ClaimProjectReturns<'info> {
    #[account(
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub project: Box<Account<'info, Project>>,

    #[account(mut)]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        seeds = [POSITION_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == investor.key() @ ExiraError::Unauthorized,
        constraint = position.target == project.key() @ ExiraError::WrongPlatform,
    )]
    pub position: Box<Account<'info, InvestorPosition>>,

    /// Investor's USDC ATA (destination of claimed USDC). Created if needed.
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

pub fn handler(ctx: Context<ClaimProjectReturns>) -> Result<()> {
    let project = &ctx.accounts.project;
    let position = &ctx.accounts.position;

    let delta = project
        .cumulative_usdc_per_token
        .checked_sub(position.last_claimed_per_token)
        .ok_or(ExiraError::MathUnderflow)?;

    let owed_scaled = (position.tokens_held as u128)
        .checked_mul(delta)
        .ok_or(ExiraError::MathOverflow)?;
    let owed_u128 = owed_scaled / PRECISION;
    let owed = u64::try_from(owed_u128).map_err(|_| ExiraError::MathOverflow)?;

    require!(owed > 0, ExiraError::NothingToClaim);
    require!(
        ctx.accounts.usdc_vault.amount >= owed,
        ExiraError::InsufficientVaultBalance
    );

    // Transfer USDC from project vault (PDA authority) to investor ATA
    let project_id = project.project_id;
    let project_id_bytes = project_id.to_le_bytes();
    let bump = project.bump;
    let seeds: &[&[u8]] = &[PROJECT_SEED, project_id_bytes.as_ref(), &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.usdc_vault.to_account_info(),
        to: ctx.accounts.investor_usdc_ata.to_account_info(),
        authority: ctx.accounts.project.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(Token::id(), cpi_accounts, signer);
    token::transfer(cpi_ctx, owed)?;

    let position = &mut ctx.accounts.position;
    position.last_claimed_per_token = project.cumulative_usdc_per_token;
    position.total_claimed = position
        .total_claimed
        .checked_add(owed)
        .ok_or(ExiraError::MathOverflow)?;

    msg!(
        "claim_project_returns: investor={} owed={} total_claimed={}",
        ctx.accounts.investor.key(),
        owed,
        position.total_claimed
    );

    Ok(())
}
