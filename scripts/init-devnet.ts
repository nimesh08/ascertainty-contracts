/**
 * Initialize the exira platform on Solana Devnet.
 * Uses Circle's official USDC devnet mint.
 */

import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import type { Exira } from "../tests/types/exira";
import idl from "../tests/types/exira.json";

const EXIRA_PROGRAM_ID = new PublicKey("J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2");
const USDC_DEVNET = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const PLATFORM_SEED = Buffer.from("platform");
const RPC = "https://api.devnet.solana.com";

function loadKeypair(p: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(path.resolve(p), "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

async function main() {
  const admin = loadKeypair("./keys/admin.json");
  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(admin), { commitment: "confirmed" });
  const program = new Program<Exira>(idl as Exira, provider);

  const [platformPda] = PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID);

  console.log("Admin:       ", admin.publicKey.toBase58());
  console.log("Platform PDA:", platformPda.toBase58());

  // Check if already initialized
  try {
    const existing = await program.account.platform.fetch(platformPda);
    console.log("\n✓ Platform already initialized.");
    console.log("  stored admin:", existing.admin.toBase58());
    console.log("  fees (bps): orig=", existing.originationFeeBps, " carry=", existing.performanceFeeBps, " hurdle=", existing.hurdleRateBps);
    return;
  } catch {
    // Not yet initialized — proceed
  }

  // Use admin itself as treasury (for test purposes). Replace for production.
  const treasury = admin.publicKey;
  console.log("Treasury:    ", treasury.toBase58());

  const txSig = await program.methods
    .initializePlatform(150, 3000, 800)
    .accountsPartial({
      platform: platformPda,
      admin: admin.publicKey,
      treasury,
      usdcMint: USDC_DEVNET,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("\n✓ Platform initialized. tx:", txSig);
  console.log("  Explorer: https://explorer.solana.com/tx/" + txSig + "?cluster=devnet");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
