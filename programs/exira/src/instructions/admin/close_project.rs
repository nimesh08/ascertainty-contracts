use anchor_lang::prelude::*;

use crate::constants::{PLATFORM_SEED, PROJECT_SEED};
use crate::error::ExiraError;
use crate::state::{Platform, Project, ProjectStatus};

#[derive(Accounts)]
pub struct CloseProject<'info> {
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = admin @ ExiraError::Unauthorized,
    )]
    pub platform: Account<'info, Platform>,

    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PROJECT_SEED, &project.project_id.to_le_bytes()],
        bump = project.bump,
    )]
    pub project: Account<'info, Project>,
}

pub fn handler(ctx: Context<CloseProject>) -> Result<()> {
    let project = &ctx.accounts.project;
    require!(
        project.status == ProjectStatus::Repaying || project.status == ProjectStatus::Active,
        ExiraError::NotActiveOrRepaying
    );

    let project = &mut ctx.accounts.project;
    project.status = ProjectStatus::Completed;

    msg!("Project {} closed (status=Completed)", project.project_id);
    Ok(())
}
