pub mod admin;
pub mod investor;
pub mod mrv;

// Context structs — public API surface
pub use admin::initialize_platform::InitializePlatform;
pub use admin::create_project::CreateProject;
pub use admin::activate_project::ActivateProject;
pub use admin::distribute_repayment::DistributeRepayment;
pub use admin::close_project::CloseProject;
pub use admin::create_pool::CreatePool;
pub use admin::add_project_to_pool::AddProjectToPool;
pub use admin::distribute_pool_returns::DistributePoolReturns;
pub use investor::buy_project_tokens::BuyProjectTokens;
pub use investor::claim_project_returns::ClaimProjectReturns;
pub use investor::withdraw_investment::WithdrawInvestment;
pub use investor::buy_pool_tokens::BuyPoolTokens;
pub use investor::claim_pool_returns::ClaimPoolReturns;
pub use mrv::register_project::RegisterMrvProject;
pub use mrv::add_auditor::AddAuditor;
pub use mrv::submit_baseline::SubmitBaseline;
pub use mrv::submit_verification::SubmitVerification;
pub use mrv::attest::AttestVerification;

// Anchor's #[program] macro expects the following pub(crate) types at crate root:
//   __client_accounts_<ctx_snake>
//   __cpi_client_accounts_<ctx_snake>
// Re-export them crate-internally so #[program] can find them.
pub(crate) use admin::initialize_platform::__client_accounts_initialize_platform;
pub(crate) use admin::create_project::__client_accounts_create_project;
pub(crate) use admin::activate_project::__client_accounts_activate_project;
pub(crate) use admin::distribute_repayment::__client_accounts_distribute_repayment;
pub(crate) use admin::close_project::__client_accounts_close_project;
pub(crate) use admin::create_pool::__client_accounts_create_pool;
pub(crate) use admin::add_project_to_pool::__client_accounts_add_project_to_pool;
pub(crate) use admin::distribute_pool_returns::__client_accounts_distribute_pool_returns;
pub(crate) use investor::buy_project_tokens::__client_accounts_buy_project_tokens;
pub(crate) use investor::claim_project_returns::__client_accounts_claim_project_returns;
pub(crate) use investor::withdraw_investment::__client_accounts_withdraw_investment;
pub(crate) use investor::buy_pool_tokens::__client_accounts_buy_pool_tokens;
pub(crate) use investor::claim_pool_returns::__client_accounts_claim_pool_returns;
pub(crate) use mrv::register_project::__client_accounts_register_mrv_project;
pub(crate) use mrv::add_auditor::__client_accounts_add_auditor;
pub(crate) use mrv::submit_baseline::__client_accounts_submit_baseline;
pub(crate) use mrv::submit_verification::__client_accounts_submit_verification;
pub(crate) use mrv::attest::__client_accounts_attest_verification;

pub(crate) use admin::initialize_platform::__cpi_client_accounts_initialize_platform;
pub(crate) use admin::create_project::__cpi_client_accounts_create_project;
pub(crate) use admin::activate_project::__cpi_client_accounts_activate_project;
pub(crate) use admin::distribute_repayment::__cpi_client_accounts_distribute_repayment;
pub(crate) use admin::close_project::__cpi_client_accounts_close_project;
pub(crate) use admin::create_pool::__cpi_client_accounts_create_pool;
pub(crate) use admin::add_project_to_pool::__cpi_client_accounts_add_project_to_pool;
pub(crate) use admin::distribute_pool_returns::__cpi_client_accounts_distribute_pool_returns;
pub(crate) use investor::buy_project_tokens::__cpi_client_accounts_buy_project_tokens;
pub(crate) use investor::claim_project_returns::__cpi_client_accounts_claim_project_returns;
pub(crate) use investor::withdraw_investment::__cpi_client_accounts_withdraw_investment;
pub(crate) use investor::buy_pool_tokens::__cpi_client_accounts_buy_pool_tokens;
pub(crate) use investor::claim_pool_returns::__cpi_client_accounts_claim_pool_returns;
pub(crate) use mrv::register_project::__cpi_client_accounts_register_mrv_project;
pub(crate) use mrv::add_auditor::__cpi_client_accounts_add_auditor;
pub(crate) use mrv::submit_baseline::__cpi_client_accounts_submit_baseline;
pub(crate) use mrv::submit_verification::__cpi_client_accounts_submit_verification;
pub(crate) use mrv::attest::__cpi_client_accounts_attest_verification;
