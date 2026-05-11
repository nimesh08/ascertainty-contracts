use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum ProjectStatus {
    Funding,
    Active,
    Repaying,
    Completed,
    Cancelled,
}

/// MSME project being financed. PDA seeds: ["project", project_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct Project {
    pub project_id: u64,
    /// Link to the MrvProject account that carries baseline + verifications
    pub mrv_project: Pubkey,
    /// SPL mint for this project's fractional ownership tokens
    pub token_mint: Pubkey,
    /// USDC ATA owned by this project's PDA
    pub usdc_vault: Pubkey,
    /// Max USDC this project wants to raise (in smallest units). Also = max tokens to mint.
    pub target_amount: u64,
    /// How much USDC has been raised (tokens sold count) so far
    pub tokens_sold: u64,
    /// Total USDC distributed as repayments (lifetime)
    pub total_distributed: u64,
    /// Pull-based dividend accumulator, scaled by PRECISION (1e12)
    pub cumulative_usdc_per_token: u128,
    /// Repayment term in months
    pub term_months: u8,
    /// Lifecycle status
    pub status: ProjectStatus,
    /// Unix timestamp at activation (0 if not yet active)
    pub activated_at: i64,
    /// Unix timestamp at creation
    pub created_at: i64,
    /// Total origination fee collected at activation (1.5% of target)
    pub origination_fee_collected: u64,
    /// Bump for this project PDA
    pub bump: u8,
}
