use anchor_lang::prelude::*;

use crate::constants::{MAX_POOL_PROJECTS_V1, PLATFORM_SEED, POOL_LINK_SEED, POOL_SEED, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{Platform, Pool, PoolProjectLink, Project};

#[derive(Accounts)]
pub struct AddProjectToPool<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
    )]
    pub platform: Account<'info, Platform>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [POOL_SEED, &pool.pool_id.to_le_bytes()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump,
    )]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = admin,
        space = 8 + PoolProjectLink::INIT_SPACE,
        seeds = [POOL_LINK_SEED, pool.key().as_ref(), project.key().as_ref()],
        bump,
    )]
    pub pool_project_link: Account<'info, PoolProjectLink>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddProjectToPool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    require!(
        pool.underlying_project_count < MAX_POOL_PROJECTS_V1,
        ExiraError::PoolTooManyProjects
    );

    let link = &mut ctx.accounts.pool_project_link;
    link.pool = pool.key();
    link.project = ctx.accounts.project.key();
    link.project_tokens_held = 0;
    link.bump = ctx.bumps.pool_project_link;

    pool.underlying_project_count = pool.underlying_project_count.saturating_add(1);

    msg!(
        "Added project {} to pool {}",
        ctx.accounts.project.project_id,
        pool.pool_id
    );
    Ok(())
}
