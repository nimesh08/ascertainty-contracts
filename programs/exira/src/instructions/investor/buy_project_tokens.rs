use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};

use crate::constants::{POSITION_SEED, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{InvestorPosition, Project, ProjectStatus};

#[derive(Accounts)]
pub struct BuyProjectTokens<'info> {
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

    /// Investor's USDC ATA (source of USDC payment)
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = investor,
    )]
    pub investor_usdc_ata: Box<Account<'info, TokenAccount>>,

    /// Investor's project token ATA (destination of minted tokens)
    #[account(
        init_if_needed,
        payer = investor,
        associated_token::mint = token_mint,
        associated_token::authority = investor,
    )]
    pub investor_token_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = investor,
        space = 8 + InvestorPosition::INIT_SPACE,
        seeds = [POSITION_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump,
    )]
    pub position: Box<Account<'info, InvestorPosition>>,

    pub usdc_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<BuyProjectTokens>, amount: u64) -> Result<()> {
    require!(amount > 0, ExiraError::ZeroAmount);

    let project = &ctx.accounts.project;
    require!(
        project.status == ProjectStatus::Funding,
        ExiraError::NotFunding
    );

    let remaining = project
        .target_amount
        .checked_sub(project.tokens_sold)
        .ok_or(ExiraError::MathUnderflow)?;
    require!(amount <= remaining, ExiraError::PoolFull);

    // 1) Transfer USDC from investor -> project vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.investor_usdc_ata.to_account_info(),
        to: ctx.accounts.usdc_vault.to_account_info(),
        authority: ctx.accounts.investor.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(Token::id(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // 2) Mint project tokens 1:1 to investor, signed by project PDA
    let project_id = project.project_id;
    let project_id_bytes = project_id.to_le_bytes();
    let bump = project.bump;
    let seeds: &[&[u8]] = &[PROJECT_SEED, project_id_bytes.as_ref(), &[bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.investor_token_ata.to_account_info(),
        authority: ctx.accounts.project.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(Token::id(), cpi_accounts, signer);
    token::mint_to(cpi_ctx, amount)?;

    // 3) Update state
    let position = &mut ctx.accounts.position;
    if position.owner == Pubkey::default() {
        // Newly initialized position — set baseline.
        position.owner = ctx.accounts.investor.key();
        position.target = ctx.accounts.project.key();
        position.last_claimed_per_token = ctx.accounts.project.cumulative_usdc_per_token;
        position.total_claimed = 0;
        position.bump = ctx.bumps.position;
    }
    position.tokens_held = position
        .tokens_held
        .checked_add(amount)
        .ok_or(ExiraError::MathOverflow)?;

    let project = &mut ctx.accounts.project;
    project.tokens_sold = project
        .tokens_sold
        .checked_add(amount)
        .ok_or(ExiraError::MathOverflow)?;

    msg!(
        "buy_project_tokens: project={} investor={} amount={} tokens_sold={}",
        project.project_id,
        ctx.accounts.investor.key(),
        amount,
        project.tokens_sold
    );

    Ok(())
}
