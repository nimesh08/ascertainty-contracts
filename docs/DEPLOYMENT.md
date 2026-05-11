# Deployment

## Devnet deployment, from scratch

This walks through a clean devnet deploy from a freshly cloned repo.

### 0. Toolchain check

```bash
solana --version    # expect: solana-cli 3.1.9 (Agave)
rustc --version     # expect: 1.95.0 (pinned via rust-toolchain.toml)
anchor --version    # expect: anchor-cli 1.0.0
node --version      # expect: v20.x
```

If Anchor is not 1.0.0:

```bash
avm install 1.0.0
avm use 1.0.0
```

### 1. Program keypair

The program keypair determines the on-chain program ID. The repo currently declares `J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2` in both `Anchor.toml` and `programs/exira/src/lib.rs#declare_id!`. You have two options:

**Option A: redeploy to the existing program ID.** You must already hold the corresponding keypair. Place it at `./target/deploy/exira-keypair.json` before building.

**Option B: generate a new program ID.**

```bash
solana-keygen new -o ./target/deploy/exira-keypair.json --no-bip39-passphrase
solana address -k ./target/deploy/exira-keypair.json
```

Take the printed address and replace every occurrence of `J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2` in:

- `Anchor.toml` (`[programs.localnet]` and `[programs.devnet]`).
- `programs/exira/src/lib.rs` (`declare_id!`).
- `scripts/init-devnet.ts` and any other script that hardcodes it.

Then rebuild.

### 2. Admin keypair

The repo ships an empty `keys/` directory. Generate (or reuse) an admin keypair, then fund it on devnet.

```bash
solana-keygen new -o ./keys/admin.json --no-bip39-passphrase
chmod 600 ./keys/admin.json
ADMIN=$(solana address -k ./keys/admin.json)
echo "Admin: $ADMIN"
```

Airdrop via CLI (may be rate-limited) or the web faucet:

```bash
solana airdrop 5 "$ADMIN" --url https://api.devnet.solana.com
# or: open https://faucet.solana.com and paste "$ADMIN"
```

You need at least ~4 SOL on devnet to deploy the program (rent for the program account) plus a small buffer for rent on the Platform PDA and per-project accounts.

### 3. Build

```bash
NO_DNA=1 anchor build
```

Artifacts land in `./target/deploy/exira.so` and `./target/deploy/exira-keypair.json`.

### 4. Deploy

```bash
solana program deploy \
  --program-id ./target/deploy/exira-keypair.json \
  ./target/deploy/exira.so \
  --url https://api.devnet.solana.com \
  --keypair ./keys/admin.json
```

Note the printed `Program Id`. It should match what `declare_id!` declares; if it differs, re-check step 1.

### 5. Initialize the platform

One-time per cluster. Uses Circle's devnet USDC mint.

```bash
npx tsx scripts/init-devnet.ts
```

The script is idempotent: if the Platform PDA already exists, it prints the stored config and exits.

Expected output:

```
Admin:        <your admin pubkey>
Platform PDA: <deterministic, same across redeploys of the same program id>
Treasury:     <same as admin, by default>
OK Platform initialized. tx: <signature>
  Explorer: https://explorer.solana.com/tx/<signature>?cluster=devnet
```

To use a separate treasury wallet, edit `scripts/init-devnet.ts` (the `treasury` variable) before running, or write a small new TS script that passes a different `treasury` pubkey to `initializePlatform`.

### 6. Verify on explorer

Open both links and confirm the accounts exist and are owned by the program:

- Program: `https://explorer.solana.com/address/<program_id>?cluster=devnet`
- Platform PDA: `https://explorer.solana.com/address/<platform_pda>?cluster=devnet`

Data-layer checks:

```bash
# Program account should be "BPF Upgradeable Program"
solana program show <program_id> --url https://api.devnet.solana.com

# Platform PDA should be owned by <program_id>
solana account <platform_pda> --url https://api.devnet.solana.com
```

### 7. Smoke test

```bash
npx tsx scripts/devnet-smoke.ts
npx tsx scripts/devnet-usdc-flow.ts
```

The first script exercises the full lifecycle (MRV, project, buy, activate, distribute, claim). The second shows the USDC buy path against Circle's devnet mint.

## Cost estimates

On devnet, SOL is free; these are provided for mainnet planning. All numbers assume the current rent schedule at release time; re-estimate with `solana rent <bytes>` before mainnet.

| Item | Size (bytes) | Rent-exempt SOL (approx.) |
|------|--------------|---------------------------|
| Program account (exira.so) | ~400 KB | ~3.0 SOL |
| `Platform` | 127 | ~0.0011 |
| `Project` | 180 | ~0.0016 |
| `Pool` | 140 | ~0.0012 |
| `PoolProjectLink` | 81 | ~0.0007 |
| `InvestorPosition` | 105 | ~0.0009 |
| `MrvProject` | 220 | ~0.0019 |
| `Baseline` | 153 | ~0.0013 |
| `Verification` | 157 | ~0.0014 |
| `Auditor` | 150 | ~0.0013 |
| Token Mint (via anchor_spl) | 82 | ~0.0014 |
| Associated Token Account | 165 | ~0.0020 |

A single project (Project PDA + token mint + USDC vault ATA) therefore costs about 0.005 SOL in rent on mainnet. A new investor position (InvestorPosition + token ATA, if they do not already have one) costs about 0.003 SOL in rent; this is paid by the investor in `buy_project_tokens`.

## Mainnet caveats

Do not deploy to mainnet in the current state. Before mainnet:

1. **Audit.** Commission a third-party audit of the program. The security posture is good (see README) but no external audit has been done.
2. **Program upgrade authority.** After the first mainnet deploy, the upgrade authority defaults to the deployer. Transfer it to a multisig (Squads) or set it to a deterministic governance key. Consider revoking upgrade authority entirely once the program is stable.
3. **Admin authority.** The `Platform.admin` field is an ordinary pubkey; a multisig makes sense here too. The program has no built-in admin-transfer instruction in V1; add one before mainnet.
4. **Treasury.** Use a distinct, multisig-owned wallet as the treasury, not the deployer.
5. **Performance fee.** V1 stores `performance_fee_bps` and `hurdle_rate_bps` on the Platform but does not enforce them in `claim_*`. Either wire them into the claim path or remove them to keep the data model honest.
6. **Pausable / emergency stop.** Not in V1. Consider adding a `Paused` bool on `Platform` and a `require!(!platform.paused, ...)` gate to every value-moving ix.
7. **Reinitialization protection.** Every state PDA uses `init` (not `init_if_needed`) except `InvestorPosition` and the investor's token/USDC ATAs. That is intentional; audit reviewers should confirm.
8. **Upgrade migration.** If the account layouts change between V1 and V2 (for example adding a new field to `Project`), write explicit migration instructions; Anchor does not do this for you.
9. **Observability.** The program logs via `msg!` but does not `emit!` strongly-typed events. Mainnet indexers will be easier to build if you add `#[event]` structs and `emit!` calls.

## Upgrading a deployed program

With the upgrade authority's keypair:

```bash
anchor build
solana program deploy \
  --program-id ./target/deploy/exira-keypair.json \
  ./target/deploy/exira.so \
  --url https://api.devnet.solana.com \
  --keypair ./keys/admin.json
```

`solana program deploy` is idempotent: the same command both deploys initially and upgrades in place. Writing a larger `.so` than the previous one may require an explicit `--max-len` on the first deploy if you plan to upgrade later with a larger binary.

## Rolling back

If a deploy goes wrong:

- You can re-deploy the previous `.so` binary the same way, as long as the upgrade authority keypair still signs.
- If you need to retire the program entirely, `solana program close <program_id> --recipient <wallet> --keypair <upgrade_auth>` will reclaim the rent and mark the program closed. Do NOT do this on a program that holds user funds in PDAs.
