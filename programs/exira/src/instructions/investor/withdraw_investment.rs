use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer};

use crate::constants::{POSITION_SEED, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{InvestorPosition, Project, ProjectStatus};

#[derive(Accounts)]
pub struct WithdrawInvestment<'info> {
    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump,
        has_one = token_mint @ ExiraError::WrongMint,
        has_one = usdc_vault @ ExiraError::WrongVault,
    )]
    pub project: Box<Account<'info, Project>>,

    #[account(mut)]
    pub token_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub usdc_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        mut,
        seeds = [POSITION_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump = position.bump,
        constraint = position.owner == investor.key() @ ExiraError::Unauthorized,
    )]
    pub position: Box<Account<'info, InvestorPosition>>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = investor,
    )]
    pub investor_token_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub investor_usdc_ata: Box<Account<'info, TokenAccount>>,

    pub usdc_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<WithdrawInvestment>) -> Result<()> {
    let project = &ctx.accounts.project;
    require!(
        project.status == ProjectStatus::Funding || project.status == ProjectStatus::Cancelled,
        ExiraError::CannotWithdraw
    );

    let amount = ctx.accounts.position.tokens_held;
    require!(amount > 0, ExiraError::NothingToClaim);

    // 1) Burn investor's project tokens
    let cpi_accounts = Burn {
        mint: ctx.accounts.token_mint.to_account_info(),
        from: ctx.accounts.investor_token_ata.to_account_info(),
        authority: ctx.accounts.investor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(Token::id(), cpi_accounts);
    token::burn(cpi_ctx, amount)?;

    // 2) Refund USDC from vault to investor (PDA signed)
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
    token::transfer(cpi_ctx, amount)?;

    // 3) Update state
    let position = &mut ctx.accounts.position;
    position.tokens_held = 0;

    let project = &mut ctx.accounts.project;
    project.tokens_sold = project
        .tokens_sold
        .checked_sub(amount)
        .ok_or(ExiraError::MathUnderflow)?;

    msg!(
        "withdraw_investment: investor={} amount={} new_tokens_sold={}",
        ctx.accounts.investor.key(),
        amount,
        project.tokens_sold
    );

    Ok(())
}
