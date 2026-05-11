use anchor_lang::prelude::*;

#[error_code]
pub enum ExiraError {
    // Platform / auth
    #[msg("Unauthorized signer for this instruction")]
    Unauthorized,
    #[msg("Platform already initialized")]
    PlatformAlreadyInitialized,
    #[msg("Invalid USDC mint")]
    InvalidUsdcMint,
    #[msg("Fee basis points exceeds 10_000 (100%)")]
    InvalidFeeBps,

    // Project / pool creation
    #[msg("Target amount must be greater than zero")]
    InvalidTargetAmount,
    #[msg("Term months out of allowed range")]
    InvalidTermMonths,
    #[msg("Referenced MRV project does not exist or has no baseline submitted")]
    MrvBaselineMissing,
    #[msg("Project or pool ID already in use")]
    DuplicateId,

    // Lifecycle / status
    #[msg("Pool is full; target amount reached")]
    PoolFull,
    #[msg("Pool is not in Funding status")]
    NotFunding,
    #[msg("Pool is not in Active or Repaying status")]
    NotActiveOrRepaying,
    #[msg("Pool is not Completed")]
    NotCompleted,
    #[msg("Cannot withdraw after activation")]
    CannotWithdraw,
    #[msg("Pool has not reached target amount")]
    NotFullyFunded,
    #[msg("Cannot cancel after activation")]
    CannotCancelActive,

    // Distribution / claim
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Zero amount not allowed")]
    ZeroAmount,
    #[msg("No tokens sold yet; cannot distribute")]
    NoTokensSold,
    #[msg("Arithmetic overflow in distribution math")]
    MathOverflow,
    #[msg("Arithmetic underflow in distribution math")]
    MathUnderflow,
    #[msg("Claim amount exceeds vault balance (invariant violation)")]
    InsufficientVaultBalance,

    // MRV
    #[msg("Auditor is not authorized or inactive")]
    AuditorInactive,
    #[msg("Baseline already submitted for this project")]
    BaselineAlreadySubmitted,
    #[msg("Verification period is invalid (end before start)")]
    InvalidVerificationPeriod,
    #[msg("Verification already attested")]
    AlreadyAttested,
    #[msg("Only the submitting auditor can attest their own verification")]
    AttestationAuditorMismatch,

    // Pool composition
    #[msg("Pool has reached max underlying projects (V1 limit)")]
    PoolTooManyProjects,
    #[msg("Project already linked to this pool")]
    ProjectAlreadyLinked,
    #[msg("Project is not linked to this pool")]
    ProjectNotLinked,

    // Account integrity
    #[msg("Wrong vault account provided")]
    WrongVault,
    #[msg("Wrong token mint provided")]
    WrongMint,
    #[msg("Wrong platform config")]
    WrongPlatform,
    #[msg("String field exceeds maximum length")]
    StringTooLong,
}
