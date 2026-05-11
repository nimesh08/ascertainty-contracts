use anchor_lang::prelude::*;

use crate::constants::{
    AUDITOR_NAME_LEN, CERTIFICATION_LEN, FUEL_TYPE_LEN, LOCATION_LEN, MSME_NAME_LEN, SECTOR_LEN,
    UPGRADE_TYPE_LEN,
};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum MrvProjectStatus {
    Registered,
    BaselineSubmitted,
    InProgress,
    Completed,
}

/// MRV (Measurement, Reporting, Verification) project registry entry.
/// PDA seeds: ["mrv_project", project_id.to_le_bytes()]
#[account]
#[derive(InitSpace)]
pub struct MrvProject {
    pub project_id: u64,
    pub msme_name: [u8; MSME_NAME_LEN],
    pub sector: [u8; SECTOR_LEN],
    pub location: [u8; LOCATION_LEN],
    pub upgrade_type: [u8; UPGRADE_TYPE_LEN],
    pub status: MrvProjectStatus,
    pub baseline_submitted: bool,
    pub verification_count: u8,
    pub created_at: i64,
    pub bump: u8,
}

/// Baseline (pre-retrofit) energy consumption for an MRV project.
/// PDA seeds: ["baseline", mrv_project.key()]
#[account]
#[derive(InitSpace)]
pub struct Baseline {
    pub mrv_project: Pubkey,
    pub auditor: Pubkey,
    /// Pre-retrofit annual energy consumption (kWh)
    pub energy_kwh_per_year: u64,
    pub fuel_type: [u8; FUEL_TYPE_LEN],
    /// Annual energy cost in paise (INR * 100) for precision
    pub cost_inr_per_year: u64,
    /// Baseline CO2 emissions per year in tons, scaled x100
    pub co2_tons_per_year_x100: u64,
    /// SHA-256 hash of the off-chain detailed baseline report
    pub report_hash: [u8; 32],
    pub submitted_at: i64,
    pub bump: u8,
}

/// Post-retrofit measurement + verification for a period.
/// PDA seeds: ["verification", mrv_project.key(), verification_index_le]
#[account]
#[derive(InitSpace)]
pub struct Verification {
    pub mrv_project: Pubkey,
    pub auditor: Pubkey,
    pub index: u8,
    pub period_start: i64,
    pub period_end: i64,
    /// Actual energy savings (kWh) measured in the period
    pub energy_kwh_saved: u64,
    /// Actual cost savings (paise) in the period
    pub cost_inr_saved: u64,
    /// CO2 avoided (tons, scaled x100)
    pub co2_tons_avoided_x100: u64,
    /// Actual savings vs expected, in basis points (10000 = 100%)
    pub savings_vs_expected_bps: u16,
    pub report_hash: [u8; 32],
    /// True once the submitting auditor has signed-off / attested
    pub attested: bool,
    pub submitted_at: i64,
    pub bump: u8,
}

/// Registered auditor (BEE-certified etc). PDA seeds: ["auditor", wallet.key()]
#[account]
#[derive(InitSpace)]
pub struct Auditor {
    pub wallet: Pubkey,
    pub name: [u8; AUDITOR_NAME_LEN],
    pub certification: [u8; CERTIFICATION_LEN],
    pub is_active: bool,
    pub projects_audited: u32,
    pub added_at: i64,
    pub bump: u8,
}
