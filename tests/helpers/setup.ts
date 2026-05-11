import * as anchor from "@anchor-lang/core";
import { AnchorProvider, BN, Program, Wallet } from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import type { Exira } from "../types/exira";
import idl from "../types/exira.json";

export const EXIRA_PROGRAM_ID = new PublicKey(
  "J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2"
);

// PDA seed bytes (must match constants.rs)
export const PLATFORM_SEED = Buffer.from("platform");
export const PROJECT_SEED = Buffer.from("project");
export const POOL_SEED = Buffer.from("pool");
export const POOL_LINK_SEED = Buffer.from("pool_link");
export const POSITION_SEED = Buffer.from("position");
export const MRV_PROJECT_SEED = Buffer.from("mrv_project");
export const BASELINE_SEED = Buffer.from("baseline");
export const VERIFICATION_SEED = Buffer.from("verification");
export const AUDITOR_SEED = Buffer.from("auditor");

export interface ExiraTestContext {
  connection: Connection;
  provider: AnchorProvider;
  program: Program<Exira>;
  admin: Keypair;
  treasury: Keypair;
  usdcMint: PublicKey;
  platformPda: PublicKey;
}

export function u64Le(n: number | BN): Buffer {
  const bn = typeof n === "number" ? new BN(n) : n;
  return bn.toArrayLike(Buffer, "le", 8);
}

export function findPlatformPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID);
}

export function findProjectPda(projectId: number | BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PROJECT_SEED, u64Le(projectId)],
    EXIRA_PROGRAM_ID
  );
}

export function findPoolPda(poolId: number | BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_SEED, u64Le(poolId)],
    EXIRA_PROGRAM_ID
  );
}

export function findPoolLinkPda(pool: PublicKey, project: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POOL_LINK_SEED, pool.toBuffer(), project.toBuffer()],
    EXIRA_PROGRAM_ID
  );
}

export function findPositionPda(target: PublicKey, owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, target.toBuffer(), owner.toBuffer()],
    EXIRA_PROGRAM_ID
  );
}

export function findMrvProjectPda(projectId: number | BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MRV_PROJECT_SEED, u64Le(projectId)],
    EXIRA_PROGRAM_ID
  );
}

export function findBaselinePda(mrvProject: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BASELINE_SEED, mrvProject.toBuffer()],
    EXIRA_PROGRAM_ID
  );
}

export function findVerificationPda(mrvProject: PublicKey, index: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VERIFICATION_SEED, mrvProject.toBuffer(), Buffer.from([index])],
    EXIRA_PROGRAM_ID
  );
}

export function findAuditorPda(wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AUDITOR_SEED, wallet.toBuffer()],
    EXIRA_PROGRAM_ID
  );
}

/**
 * Airdrop SOL with retries (devnet rate-limit resilient).
 */
export async function airdrop(
  connection: Connection,
  target: PublicKey,
  sol: number
): Promise<void> {
  const sig = await connection.requestAirdrop(target, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

/**
 * Create a fresh funded keypair.
 */
export async function newFundedWallet(
  connection: Connection,
  sol = 10
): Promise<Keypair> {
  const kp = Keypair.generate();
  await airdrop(connection, kp.publicKey, sol);
  return kp;
}

/**
 * Mint mock USDC (fresh mint with 6 decimals) for tests. Returns mint pubkey.
 */
export async function createMockUsdcMint(
  connection: Connection,
  mintAuthority: Keypair
): Promise<PublicKey> {
  const mint = await createMint(
    connection,
    mintAuthority,
    mintAuthority.publicKey,
    null,
    6
  );
  return mint;
}

/**
 * Mint USDC tokens to a recipient (creates ATA if needed).
 */
export async function mintUsdc(
  connection: Connection,
  mint: PublicKey,
  mintAuthority: Keypair,
  recipient: PublicKey,
  amount: number | bigint
): Promise<PublicKey> {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    mintAuthority,
    mint,
    recipient
  );
  await mintTo(connection, mintAuthority, mint, ata.address, mintAuthority, BigInt(amount));
  return ata.address;
}

/**
 * Convenience: get the ATA address without creating it.
 */
export function ata(mint: PublicKey, owner: PublicKey, allowOwnerOffCurve = true): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve);
}

/**
 * Read the USDC balance of an ATA (0 if not existing).
 */
export async function usdcBalance(connection: Connection, ata: PublicKey): Promise<bigint> {
  try {
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return 0n;
  }
}

/**
 * Boot a fresh test context. Connects to the localnet running via surfpool/anchor-localnet
 * (started externally via `anchor localnet` or provided by `anchor test`).
 */
export async function bootstrap(rpcUrl = "http://127.0.0.1:8899"): Promise<ExiraTestContext> {
  const connection = new Connection(rpcUrl, "confirmed");

  const admin = await newFundedWallet(connection, 100);
  const treasury = Keypair.generate();

  const wallet = new Wallet(admin);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load IDL + Program
  const program = new Program<Exira>(idl as Exira, provider);

  const usdcMint = await createMockUsdcMint(connection, admin);
  const [platformPda] = findPlatformPda();

  return { connection, provider, program, admin, treasury, usdcMint, platformPda };
}

/**
 * Initialize the exira platform with default fees.
 */
export async function initPlatform(ctx: ExiraTestContext): Promise<void> {
  await ctx.program.methods
    .initializePlatform(150, 3000, 800) // 1.5% orig, 30% carry, 8% hurdle
    .accountsPartial({
      platform: ctx.platformPda,
      admin: ctx.admin.publicKey,
      treasury: ctx.treasury.publicKey,
      usdcMint: ctx.usdcMint,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export const USDC_DECIMALS = 6;
/** Convert "human USDC" (e.g., 100.5) to smallest unit (100_500_000). */
export function usdc(n: number): BN {
  return new BN(Math.round(n * 1_000_000));
}
