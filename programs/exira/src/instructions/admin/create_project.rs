use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::{
    EXIRA_TOKEN_DECIMALS, MAX_TERM_MONTHS, MIN_TERM_MONTHS, PLATFORM_SEED, PROJECT_SEED,
};
use crate::error::ExiraError;
use crate::state::{MrvProject, Platform, Project, ProjectStatus};

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct CreateProject<'info> {
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

    /// Reference MRV project. Must already have baseline submitted.
    #[account(
        constraint = mrv_project.baseline_submitted @ ExiraError::MrvBaselineMissing,
    )]
    pub mrv_project: Account<'info, MrvProject>,

    #[account(
        init,
        payer = admin,
        space = 8 + Project::INIT_SPACE,
        seeds = [PROJECT_SEED, &project_id.to_le_bytes()],
        bump,
    )]
    pub project: Box<Account<'info, Project>>,

    /// Project's fractional ownership SPL token. Mint authority = project PDA.
    #[account(
        init,
        payer = admin,
        mint::decimals = EXIRA_TOKEN_DECIMALS,
        mint::authority = project,
        mint::freeze_authority = project,
    )]
    pub token_mint: Box<Account<'info, Mint>>,

    /// USDC ATA owned by the project PDA (vault).
    #[account(
        init,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = project,
    )]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateProject>,
    project_id: u64,
    target_amount: u64,
    term_months: u8,
) -> Result<()> {
    require!(target_amount > 0, ExiraError::InvalidTargetAmount);
    require!(
        (MIN_TERM_MONTHS..=MAX_TERM_MONTHS).contains(&term_months),
        ExiraError::InvalidTermMonths
    );

    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    project.project_id = project_id;
    project.mrv_project = ctx.accounts.mrv_project.key();
    project.token_mint = ctx.accounts.token_mint.key();
    project.usdc_vault = ctx.accounts.usdc_vault.key();
    project.target_amount = target_amount;
    project.tokens_sold = 0;
    project.total_distributed = 0;
    project.cumulative_usdc_per_token = 0;
    project.term_months = term_months;
    project.status = ProjectStatus::Funding;
    project.activated_at = 0;
    project.created_at = clock.unix_timestamp;
    project.origination_fee_collected = 0;
    project.bump = ctx.bumps.project;

    ctx.accounts.platform.project_count =
        ctx.accounts.platform.project_count.saturating_add(1);

    msg!(
        "Project {} created. target_amount={}, term_months={}, mrv_project={}",
        project_id,
        target_amount,
        term_months,
        ctx.accounts.mrv_project.key()
    );

    Ok(())
}
