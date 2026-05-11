use anchor_lang::prelude::*;

/// One investor's position in either a Project or a Pool (target_kind distinguishes).
/// PDA seeds: ["position", target.key(), owner.key()]
#[account]
#[derive(InitSpace)]
pub struct InvestorPosition {
    /// Wallet that owns this position
    pub owner: Pubkey,
    /// Either Project PDA or Pool PDA key
    pub target: Pubkey,
    /// How many project/pool tokens this position represents
    pub tokens_held: u64,
    /// Dividend accumulator value at the time of the investor's last claim (or at buy-in)
    pub last_claimed_per_token: u128,
    /// Total USDC claimed across all claim events (accounting only)
    pub total_claimed: u64,
    /// Bump for this position PDA
    pub bump: u8,
}
