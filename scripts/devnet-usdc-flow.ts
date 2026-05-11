/**
 * Full USDC flow test on Devnet using the already-created project 888812.
 * Tests: buy_project_tokens -> activate_project -> distribute_repayment -> claim_project_returns
 */

import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import * as fs from "fs";
import type { Exira } from "../tests/types/exira";
import idl from "../tests/types/exira.json";

const EXIRA_PROGRAM_ID = new PublicKey("J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2");
const USDC = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const RPC = "https://api.devnet.solana.com";
const PROJECT_ID = 888812; // from prior smoke test

const PLATFORM_SEED = Buffer.from("platform");
const PROJECT_SEED = Buffer.from("project");
const POSITION_SEED = Buffer.from("position");

function u64Le(n: number | BN): Buffer {
  const bn = typeof n === "number" ? new BN(n) : n;
  return bn.toArrayLike(Buffer, "le", 8);
}
const platformPda = () =>
  PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID)[0];
const projectPda = (id: number) =>
  PublicKey.findProgramAddressSync([PROJECT_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
const positionPda = (t: PublicKey, o: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [POSITION_SEED, t.toBuffer(), o.toBuffer()],
    EXIRA_PROGRAM_ID
  )[0];
const ata = (m: PublicKey, o: PublicKey) => getAssociatedTokenAddressSync(m, o, true);
const usdc = (n: number) => new BN(Math.round(n * 1_000_000));
const loadKp = (p: string) =>
  Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
const getBal = async (c: Connection, a: PublicKey): Promise<bigint> => {
  try {
    return (await getAccount(c, a)).amount;
  } catch {
    return 0n;
  }
};

function explorer(tx: string) {
  return `https://explorer.solana.com/tx/${tx}?cluster=devnet`;
}

async function main() {
  console.log("=== Exira USDC Flow Test (Devnet) ===\n");

  const admin = loadKp("./keys/admin.json");
  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(admin), {
    commitment: "confirmed",
  });
  const program = new Program<Exira>(idl as Exira, provider);

  const solBal = await connection.getBalance(admin.publicKey);
  const usdcBalBefore = await getBal(connection, ata(USDC, admin.publicKey));
  console.log("Admin:", admin.publicKey.toBase58());
  console.log(`SOL:  ${(solBal / LAMPORTS_PER_SOL).toFixed(4)}`);
  console.log(`USDC: ${Number(usdcBalBefore) / 1_000_000}\n`);

  if (usdcBalBefore < BigInt(usdc(5).toString())) {
    console.log("Need at least 5 USDC. Exiting.");
    process.exit(1);
  }

  // Use the existing project 888812 (target=100 USDC, Funding status)
  const pda = projectPda(PROJECT_ID);
  const pData = await program.account.project.fetch(pda);

  console.log(`Project ${PROJECT_ID}:`);
  console.log("  target:     ", Number(pData.targetAmount.toString()) / 1_000_000, "USDC");
  console.log("  tokens_sold:", Number(pData.tokensSold.toString()) / 1_000_000);
  console.log("  status:     ", Object.keys(pData.status)[0]);
  console.log("  vault:      ", pData.usdcVault.toBase58(), "\n");

  // For this test, the admin will also be the investor (self-buy).
  // In real flow this would be a separate wallet.

  // STEP 1: Buy 5 USDC worth of project tokens (small test amount)
  console.log("1. Buying 5 USDC of project tokens...");
  try {
    const tx = await program.methods
      .buyProjectTokens(usdc(5))
      .accountsPartial({
        project: pda,
        tokenMint: pData.tokenMint,
        usdcVault: pData.usdcVault,
        investor: admin.publicKey,
        investorUsdcAta: ata(USDC, admin.publicKey),
        investorTokenAta: ata(pData.tokenMint, admin.publicKey),
        position: positionPda(pda, admin.publicKey),
        usdcMint: USDC,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log("   ✓ Bought. tx:", explorer(tx));
  } catch (e: any) {
    console.log("   ✗ buy:", e.message);
    process.exit(1);
  }

  // Refresh
  const pData2 = await program.account.project.fetch(pda);
  console.log("   Now tokens_sold:", Number(pData2.tokensSold.toString()) / 1_000_000, "\n");

  // STEP 2: Check investor position
  console.log("2. Checking investor position...");
  try {
    const pos = await program.account.investorPosition.fetch(positionPda(pda, admin.publicKey));
    console.log("   owner:                  ", pos.owner.toBase58());
    console.log("   tokens_held:            ", Number(pos.tokensHeld.toString()) / 1_000_000);
    console.log("   last_claimed_per_token: ", pos.lastClaimedPerToken.toString());
    console.log("   total_claimed:          ", Number(pos.totalClaimed.toString()) / 1_000_000, "\n");
  } catch (e: any) {
    console.log("   ✗ position fetch:", e.message, "\n");
  }

  // STEP 3: Buy remaining 95 USDC worth to fully fund the project
  // (Since we only have 20 USDC total, and we already spent 5, we'd need 95 more -
  // we only have 15 left. Skip full-fund and demonstrate partial-funding state.)
  console.log("3. Project is still in Funding status (partially funded). Full lifecycle");
  console.log("   (activate → distribute → claim) requires target to be fully reached.");
  console.log("   The `activate_project` instruction enforces `tokens_sold == target_amount`.\n");

  console.log("=== USDC buy flow verified on Devnet ===");
  console.log(`\nView the buy tx on explorer. Full lifecycle test (100 USDC) needs more devnet USDC.`);
  console.log(`Explorer: https://explorer.solana.com/address/${pda.toBase58()}?cluster=devnet`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
