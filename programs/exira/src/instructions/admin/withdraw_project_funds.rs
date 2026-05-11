use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{PLATFORM_SEED, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{Platform, Project};

/// Admin-only: withdraw USDC from a project vault to an arbitrary destination ATA.
///
/// This is an escape hatch for operational disbursements (e.g. paying the underlying
/// MSME in fiat after off-ramping). It is intentionally not state-gated: the admin
/// may withdraw from any project regardless of `ProjectStatus`. The only protection
/// against abuse is `platform.admin` being required as a signer via `has_one`.
#[derive(Accounts)]
pub struct WithdrawProjectFunds<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
        has_one = usdc_mint @ ExiraError::InvalidUsdcMint,
    )]
    pub platform: Box<Account<'info, Platform>>,

    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub project: Box<Account<'info, Project>>,

    #[account(mut)]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    /// Any USDC ATA; must match platform.usdc_mint. Owner is free-form.
    #[account(
        mut,
        token::mint = usdc_mint,
    )]
    pub destination: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawProjectFunds>, amount: u64) -> Result<()> {
    require!(amount > 0, ExiraError::ZeroAmount);
    require!(
        amount <= ctx.accounts.usdc_vault.amount,
        ExiraError::InsufficientVaultBalance
    );

    let project_id = ctx.accounts.project.project_id;
    let project_id_bytes = project_id.to_le_bytes();
    let bump = ctx.accounts.project.bump;
    let seeds: &[&[u8]] = &[PROJECT_SEED, project_id_bytes.as_ref(), &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.usdc_vault.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.project.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(Token::id(), cpi_accounts, signer);
    token::transfer(cpi_ctx, amount)?;

    msg!(
        "withdraw_project_funds: project={} amount={} destination={}",
        project_id,
        amount,
        ctx.accounts.destination.key()
    );
    Ok(())
}
