use anchor_lang::prelude::*;

// PDA seeds
#[constant]
pub const PLATFORM_SEED: &[u8] = b"platform";
#[constant]
pub const PROJECT_SEED: &[u8] = b"project";
#[constant]
pub const POOL_SEED: &[u8] = b"pool";
#[constant]
pub const POOL_LINK_SEED: &[u8] = b"pool_link";
#[constant]
pub const POSITION_SEED: &[u8] = b"position";
#[constant]
pub const MRV_PROJECT_SEED: &[u8] = b"mrv_project";
#[constant]
pub const BASELINE_SEED: &[u8] = b"baseline";
#[constant]
pub const VERIFICATION_SEED: &[u8] = b"verification";
#[constant]
pub const AUDITOR_SEED: &[u8] = b"auditor";

// Distribution math precision: u128 accumulator scaled by 1e12 to avoid rounding error
pub const PRECISION: u128 = 1_000_000_000_000;

// Fee caps and defaults
pub const MAX_FEE_BPS: u16 = 10_000; // 100%
pub const DEFAULT_ORIGINATION_FEE_BPS: u16 = 150; // 1.5%
pub const DEFAULT_PERFORMANCE_FEE_BPS: u16 = 3_000; // 30%
pub const DEFAULT_HURDLE_RATE_BPS: u16 = 800; // 8% baseline hurdle

// Project term bounds (months)
pub const MIN_TERM_MONTHS: u8 = 6;
pub const MAX_TERM_MONTHS: u8 = 60;

// Pool capacity limits
pub const MAX_POOL_PROJECTS_V1: u16 = 20;

// Token decimals for project/pool tokens - match USDC (6)
pub const EXIRA_TOKEN_DECIMALS: u8 = 6;

// String field lengths (fixed for deterministic account sizing)
pub const MSME_NAME_LEN: usize = 64;
pub const SECTOR_LEN: usize = 32;
pub const LOCATION_LEN: usize = 64;
pub const UPGRADE_TYPE_LEN: usize = 32;
pub const FUEL_TYPE_LEN: usize = 16;
pub const AUDITOR_NAME_LEN: usize = 64;
pub const CERTIFICATION_LEN: usize = 32;
