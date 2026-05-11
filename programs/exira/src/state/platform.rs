use anchor_lang::prelude::*;

/// Singleton platform config. PDA seeds: ["platform"]
#[account]
#[derive(InitSpace)]
pub struct Platform {
    /// Admin authority (controls all admin instructions)
    pub admin: Pubkey,
    /// Treasury wallet that receives origination + performance fees
    pub treasury: Pubkey,
    /// Accepted USDC mint (Circle devnet/mainnet official mint)
    pub usdc_mint: Pubkey,
    /// Origination fee charged at activate_project, in basis points (150 = 1.5%)
    pub origination_fee_bps: u16,
    /// Performance fee on upside above hurdle, in basis points (3000 = 30%)
    pub performance_fee_bps: u16,
    /// Hurdle rate — investors must earn this before carry kicks in, in basis points
    pub hurdle_rate_bps: u16,
    /// Monotonic counter for project_id assignment
    pub project_count: u64,
    /// Monotonic counter for pool_id assignment
    pub pool_count: u64,
    /// Bump for the platform PDA
    pub bump: u8,
}
