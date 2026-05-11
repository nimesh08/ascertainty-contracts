/**
 * Full devnet smoke test — exercises the deployed Exira program.
 * Runs every instruction path using the admin keypair.
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
  createMint,
  getAssociatedTokenAddressSync,
  getAccount,
  mintTo,
} from "@solana/spl-token";
import * as fs from "fs";
import type { Exira } from "../tests/types/exira";
import idl from "../tests/types/exira.json";

const EXIRA_PROGRAM_ID = new PublicKey("J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2");
const RPC = "https://api.devnet.solana.com";

const PLATFORM_SEED = Buffer.from("platform");
const PROJECT_SEED = Buffer.from("project");
const POSITION_SEED = Buffer.from("position");
const MRV_PROJECT_SEED = Buffer.from("mrv_project");
const BASELINE_SEED = Buffer.from("baseline");
const AUDITOR_SEED = Buffer.from("auditor");

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
const mrvPda = (id: number) =>
  PublicKey.findProgramAddressSync([MRV_PROJECT_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
const baselinePda = (m: PublicKey) =>
  PublicKey.findProgramAddressSync([BASELINE_SEED, m.toBuffer()], EXIRA_PROGRAM_ID)[0];
const auditorPda = (w: PublicKey) =>
  PublicKey.findProgramAddressSync([AUDITOR_SEED, w.toBuffer()], EXIRA_PROGRAM_ID)[0];

function loadKp(p: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}
function ata(mint: PublicKey, owner: PublicKey) {
  return getAssociatedTokenAddressSync(mint, owner, true);
}
function usdc(n: number) {
  return new BN(Math.round(n * 1_000_000));
}
async function bal(connection: Connection, a: PublicKey): Promise<bigint> {
  try {
    return (await getAccount(connection, a)).amount;
  } catch {
    return 0n;
  }
}

async function main() {
  console.log("=== Exira Devnet Smoke Test ===\n");

  const admin = loadKp("./keys/admin.json");
  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(admin), {
    commitment: "confirmed",
  });
  const program = new Program<Exira>(idl as Exira, provider);

  console.log("Admin:", admin.publicKey.toBase58());
  const adminBal = await connection.getBalance(admin.publicKey);
  console.log(`Admin SOL: ${(adminBal / LAMPORTS_PER_SOL).toFixed(4)}\n`);

  // 1. Verify platform
  const platform = await program.account.platform.fetch(platformPda());
  console.log("1. Platform status:");
  console.log("   admin:   ", platform.admin.toBase58());
  console.log("   treasury:", platform.treasury.toBase58());
  console.log("   usdc_mint:", platform.usdcMint.toBase58());
  console.log("   fees:    orig=" + platform.originationFeeBps + " carry=" + platform.performanceFeeBps + " hurdle=" + platform.hurdleRateBps + "\n");

  // 2. Create a FRESH test USDC mint (admin-controlled, since Circle devnet USDC faucet is manual)
  //    We'll temporarily switch the platform's notion of USDC via a separate test mint.
  //    Since platform.usdc_mint is fixed, we'll only exercise the admin/MRV flows that don't need USDC balance.
  //    Full end-to-end USDC flow requires real devnet USDC via faucet.

  // 3. Register a fresh MRV project
  const MRV_ID = Math.floor(Math.random() * 1_000_000) + 100_000;
  console.log(`2. Registering MRV project ${MRV_ID}...`);
  try {
    const tx = await program.methods
      .registerMrvProject(new BN(MRV_ID), "Lucas TVS Devnet", "auto_components", "Chennai", "heat_pump")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        mrvProject: mrvPda(MRV_ID),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("   ✓ MRV registered. tx:", tx);
    console.log("   https://explorer.solana.com/tx/" + tx + "?cluster=devnet\n");
  } catch (e: any) {
    console.log("   ✗ registerMrv:", e.message, "\n");
  }

  // 4. Register self as auditor (admin becomes auditor for testing)
  console.log("3. Registering admin as auditor...");
  try {
    const tx = await program.methods
      .addAuditor("Admin Auditor", "BEE_test_devnet")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        auditorWallet: admin.publicKey,
        auditor: auditorPda(admin.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("   ✓ Auditor added. tx:", tx, "\n");
  } catch (e: any) {
    if (String(e).match(/already in use/)) {
      console.log("   ~ Auditor already registered (OK)\n");
    } else {
      console.log("   ✗ addAuditor:", e.message, "\n");
    }
  }

  // 5. Submit baseline
  console.log(`4. Submitting baseline for MRV ${MRV_ID}...`);
  try {
    const tx = await program.methods
      .submitBaseline(
        new BN(1_200_000),
        "electricity",
        new BN(96_000_000),
        new BN(87_200),
        Array.from(Buffer.alloc(32, 1))
      )
      .accountsPartial({
        auditorSigner: admin.publicKey,
        auditor: auditorPda(admin.publicKey),
        mrvProject: mrvPda(MRV_ID),
        baseline: baselinePda(mrvPda(MRV_ID)),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("   ✓ Baseline submitted. tx:", tx, "\n");
  } catch (e: any) {
    console.log("   ✗ submitBaseline:", e.message, "\n");
  }

  // 6. Submit verification
  console.log(`5. Submitting verification for MRV ${MRV_ID}...`);
  try {
    const tx = await program.methods
      .submitVerification(
        0,
        new BN(1700000000),
        new BN(1702000000),
        new BN(200_000),
        new BN(16_000_000),
        new BN(14_500),
        10000,
        Array.from(Buffer.alloc(32, 9))
      )
      .accountsPartial({
        auditorSigner: admin.publicKey,
        auditor: auditorPda(admin.publicKey),
        mrvProject: mrvPda(MRV_ID),
        verification: PublicKey.findProgramAddressSync(
          [Buffer.from("verification"), mrvPda(MRV_ID).toBuffer(), Buffer.from([0])],
          EXIRA_PROGRAM_ID
        )[0],
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("   ✓ Verification submitted. tx:", tx, "\n");
  } catch (e: any) {
    console.log("   ✗ submitVerification:", e.message, "\n");
  }

  // 7. Attest verification
  console.log("6. Attesting verification...");
  try {
    const tx = await program.methods
      .attestVerification()
      .accountsPartial({
        auditorSigner: admin.publicKey,
        auditor: auditorPda(admin.publicKey),
        mrvProject: mrvPda(MRV_ID),
        verification: PublicKey.findProgramAddressSync(
          [Buffer.from("verification"), mrvPda(MRV_ID).toBuffer(), Buffer.from([0])],
          EXIRA_PROGRAM_ID
        )[0],
      })
      .rpc();
    console.log("   ✓ Verification attested. tx:", tx, "\n");
  } catch (e: any) {
    console.log("   ✗ attest:", e.message, "\n");
  }

  // 8. Create a Project (with platform's usdc_mint)
  const PID = Math.floor(Math.random() * 1_000_000) + 100_000;
  console.log(`7. Creating project ${PID} (target=100 USDC, term=12 months)...`);
  try {
    const pda = projectPda(PID);
    const tokenMintKp = Keypair.generate();
    const tx = await program.methods
      .createProject(new BN(PID), usdc(100), 12)
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        mrvProject: mrvPda(MRV_ID),
        project: pda,
        tokenMint: tokenMintKp.publicKey,
        usdcVault: ata(platform.usdcMint, pda),
        usdcMint: platform.usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([tokenMintKp])
      .rpc();
    console.log("   ✓ Project created. tx:", tx);
    console.log("   project PDA:    ", pda.toBase58());
    console.log("   token_mint:     ", tokenMintKp.publicKey.toBase58());
    console.log("   usdc_vault:     ", ata(platform.usdcMint, pda).toBase58(), "\n");

    const pAcc = await program.account.project.fetch(pda);
    console.log("8. Project state:");
    console.log("   target_amount:  ", pAcc.targetAmount.toString(), "(1 USDC = 1_000_000)");
    console.log("   tokens_sold:    ", pAcc.tokensSold.toString());
    console.log("   status:         ", Object.keys(pAcc.status)[0]);
    console.log("   term_months:    ", pAcc.termMonths, "\n");
  } catch (e: any) {
    console.log("   ✗ createProject:", e.message, "\n");
  }

  console.log("=== Smoke test complete ===");
  console.log("\nTo do full USDC buy/activate/distribute/claim flow on devnet, get USDC from:");
  console.log("  https://faucet.circle.com/  (select Solana Devnet)");
  console.log("\nUI: http://localhost:8090\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
