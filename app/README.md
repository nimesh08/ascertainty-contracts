# Exira Devnet Test UI

Simple static HTML+JS page to interact with the deployed Exira program on Solana Devnet.

## Run locally

```bash
cd app
python3 -m http.server 8080
# Open http://localhost:8080 in Chrome/Brave/Firefox with Phantom installed.
```

## Usage

1. Click **Connect Phantom** and switch Phantom to **Devnet**
2. Click **Airdrop 2 SOL to me** (may hit rate limit — use https://faucet.solana.com as fallback)
3. Get Devnet USDC: https://faucet.circle.com/ (select Solana Devnet)
4. Try these flows:
   - **Admin flow (if you're the platform admin):** Register MRV → Add auditor → Submit baseline → Create project → Have investors buy → Activate → Distribute repayment
   - **Investor flow:** Buy project tokens → Claim returns when distributions happen

## Deployed Addresses (Devnet)

- Program ID: `J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2`
- Platform PDA: `YugaQS7oCazuuitbSLoDjNGRxpToaAq9cUp4dpXZiZD`
- USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle official)

## Notes

- Only the platform admin wallet (who initialized it) can call admin-only instructions
- For a full local test, run `./scripts/run-tests.sh` from the repo root
- UI uses Phantom wallet via `window.solana` provider (Phantom standard)
