use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::constants::{PLATFORM_SEED, PRECISION, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{Platform, Project, ProjectStatus};

#[derive(Accounts)]
pub struct DistributeRepayment<'info> {
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
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub project: Box<Account<'info, Project>>,

    /// Admin's USDC ATA sourcing the repayment funds.
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

pub fn handler(ctx: Context<DistributeRepayment>, amount: u64) -> Result<()> {
    require!(amount > 0, ExiraError::ZeroAmount);

    let project = &ctx.accounts.project;
    require!(
        project.status == ProjectStatus::Active || project.status == ProjectStatus::Repaying,
        ExiraError::NotActiveOrRepaying
    );
    require!(project.tokens_sold > 0, ExiraError::NoTokensSold);

    // Transfer USDC from admin to project vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.admin_usdc_ata.to_account_info(),
        to: ctx.accounts.usdc_vault.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(Token::id(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update accumulator: cumulative_per_token += (amount * PRECISION) / tokens_sold
    let amount_scaled = (amount as u128)
        .checked_mul(PRECISION)
        .ok_or(ExiraError::MathOverflow)?;
    let delta_per_token = amount_scaled
        .checked_div(project.tokens_sold as u128)
        .ok_or(ExiraError::MathUnderflow)?;

    let project = &mut ctx.accounts.project;
    project.cumulative_usdc_per_token = project
        .cumulative_usdc_per_token
        .checked_add(delta_per_token)
        .ok_or(ExiraError::MathOverflow)?;
    project.total_distributed = project
        .total_distributed
        .checked_add(amount)
        .ok_or(ExiraError::MathOverflow)?;

    if project.status == ProjectStatus::Active {
        project.status = ProjectStatus::Repaying;
    }

    msg!(
        "distribute_repayment: project={} amount={} cumulative_per_token={} total_distributed={}",
        project.project_id,
        amount,
        project.cumulative_usdc_per_token,
        project.total_distributed
    );

    Ok(())
}
