use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum PoolStatus {
    Funding,
    Active,
    Distributing,
    Completed,
    Cancelled,
}

/// Index/pool aggregating multiple projects. PDA seeds: ["pool", pool_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub pool_id: u64,
    /// SPL mint for this pool's fractional (diversified) ownership tokens
    pub pool_token_mint: Pubkey,
    /// USDC ATA owned by this pool's PDA (receives payouts flowing up from projects)
    pub usdc_vault: Pubkey,
    /// Max USDC raise target for pool tokens
    pub target_amount: u64,
    /// Pool tokens sold so far
    pub tokens_sold: u64,
    /// Total USDC distributed to pool token holders (lifetime)
    pub total_distributed: u64,
    /// Pull-based dividend accumulator at pool layer
    pub cumulative_usdc_per_token: u128,
    /// How many underlying projects this pool has linked
    pub underlying_project_count: u16,
    /// Lifecycle status
    pub status: PoolStatus,
    /// Unix timestamp at creation
    pub created_at: i64,
    /// Bump for this pool PDA
    pub bump: u8,
}

/// Link between a pool and an underlying project.
/// PDA seeds: ["pool_link", pool.key(), project.key()]
#[account]
#[derive(InitSpace)]
pub struct PoolProjectLink {
    pub pool: Pubkey,
    pub project: Pubkey,
    /// How many project tokens this pool holds for this linked project
    pub project_tokens_held: u64,
    pub bump: u8,
}
