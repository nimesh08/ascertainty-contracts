use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{PLATFORM_SEED, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{Platform, Project, ProjectStatus};

#[derive(Accounts)]
pub struct ActivateProject<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
        has_one = treasury @ ExiraError::Unauthorized,
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

    /// Treasury USDC ATA receiving the origination fee.
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = treasury,
    )]
    pub treasury_usdc_ata: Box<Account<'info, TokenAccount>>,

    /// CHECK: treasury authority from platform config.
    pub treasury: UncheckedAccount<'info>,

    pub usdc_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ActivateProject>) -> Result<()> {
    let project_status = ctx.accounts.project.status;
    require!(
        project_status == ProjectStatus::Funding,
        ExiraError::NotFunding
    );

    let target = ctx.accounts.project.target_amount;
    let sold = ctx.accounts.project.tokens_sold;
    require!(sold == target, ExiraError::NotFullyFunded);

    // Origination fee = 1.5% of target_amount (from platform config)
    let fee_bps = ctx.accounts.platform.origination_fee_bps as u128;
    let fee_amount = ((target as u128)
        .checked_mul(fee_bps)
        .ok_or(ExiraError::MathOverflow)?
        / 10_000u128) as u64;

    // Transfer fee from project vault to treasury, signed by project PDA
    let project_id = ctx.accounts.project.project_id;
    let project_id_bytes = project_id.to_le_bytes();
    let bump = ctx.accounts.project.bump;
    let seeds: &[&[u8]] = &[PROJECT_SEED, project_id_bytes.as_ref(), &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    if fee_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.usdc_vault.to_account_info(),
            to: ctx.accounts.treasury_usdc_ata.to_account_info(),
            authority: ctx.accounts.project.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(Token::id(), cpi_accounts, signer);
        token::transfer(cpi_ctx, fee_amount)?;
    }

    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    project.status = ProjectStatus::Active;
    project.activated_at = clock.unix_timestamp;
    project.origination_fee_collected = fee_amount;

    msg!(
        "Project {} activated. origination_fee={} ({} bps of {})",
        project.project_id,
        fee_amount,
        fee_bps,
        target
    );

    Ok(())
}
