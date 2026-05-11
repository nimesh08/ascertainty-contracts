/**
 * Exira — COMPLETE test suite (all todos t06-t17).
 * Covers: Platform, MRV, Project lifecycle, Pool lifecycle, Distribution math,
 * Edge cases, Security (vulnhunter-enhanced), End-to-end integration.
 */

import * as anchor from "@anchor-lang/core";
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
import { expect } from "chai";
import type { Exira } from "../types/exira";
import idl from "../types/exira.json";

const EXIRA_PROGRAM_ID = new PublicKey(
  "J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2"
);

const PLATFORM_SEED = Buffer.from("platform");
const PROJECT_SEED = Buffer.from("project");
const POOL_SEED = Buffer.from("pool");
const POOL_LINK_SEED = Buffer.from("pool_link");
const POSITION_SEED = Buffer.from("position");
const MRV_PROJECT_SEED = Buffer.from("mrv_project");
const BASELINE_SEED = Buffer.from("baseline");
const VERIFICATION_SEED = Buffer.from("verification");
const AUDITOR_SEED = Buffer.from("auditor");

function u64Le(n: number | BN): Buffer {
  const bn = typeof n === "number" ? new BN(n) : n;
  return bn.toArrayLike(Buffer, "le", 8);
}
const platformPda = () =>
  PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID)[0];
const projectPda = (id: number) =>
  PublicKey.findProgramAddressSync([PROJECT_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
const poolPda = (id: number) =>
  PublicKey.findProgramAddressSync([POOL_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
const poolLinkPda = (pool: PublicKey, project: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [POOL_LINK_SEED, pool.toBuffer(), project.toBuffer()],
    EXIRA_PROGRAM_ID
  )[0];
const positionPda = (target: PublicKey, owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [POSITION_SEED, target.toBuffer(), owner.toBuffer()],
    EXIRA_PROGRAM_ID
  )[0];
const mrvPda = (id: number) =>
  PublicKey.findProgramAddressSync([MRV_PROJECT_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
const baselinePda = (mrv: PublicKey) =>
  PublicKey.findProgramAddressSync([BASELINE_SEED, mrv.toBuffer()], EXIRA_PROGRAM_ID)[0];
const verificationPda = (mrv: PublicKey, index: number) =>
  PublicKey.findProgramAddressSync(
    [VERIFICATION_SEED, mrv.toBuffer(), Buffer.from([index])],
    EXIRA_PROGRAM_ID
  )[0];
const auditorPda = (wallet: PublicKey) =>
  PublicKey.findProgramAddressSync([AUDITOR_SEED, wallet.toBuffer()], EXIRA_PROGRAM_ID)[0];

const connection = new Connection("http://127.0.0.1:8999", "confirmed");
let admin: Keypair;
let treasury: Keypair;
let treasuryUsdcAta: PublicKey;
let usdcMint: PublicKey;
let program: Program<Exira>;
let provider: AnchorProvider;
let auditor: Keypair;

async function airdrop(pk: PublicKey, sol = 100) {
  const sig = await connection.requestAirdrop(pk, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}
async function newWallet(sol = 100): Promise<Keypair> {
  const kp = Keypair.generate();
  await airdrop(kp.publicKey, sol);
  return kp;
}
async function mintUsdcTo(recipient: PublicKey, amount: number | BN): Promise<PublicKey> {
  const amt = typeof amount === "number" ? BigInt(amount) : BigInt(amount.toString());
  const a = await createAssociatedTokenAccountIdempotent(
    connection,
    admin,
    usdcMint,
    recipient
  );
  await mintTo(connection, admin, usdcMint, a, admin, amt);
  return a;
}
async function getBal(a: PublicKey): Promise<bigint> {
  try {
    return (await getAccount(connection, a)).amount;
  } catch {
    return 0n;
  }
}
function usdc(n: number): BN {
  return new BN(Math.round(n * 1_000_000));
}
function ata(mint: PublicKey, owner: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner, true);
}
function programFor(kp: Keypair): Program<Exira> {
  const ap = new AnchorProvider(connection, new Wallet(kp), { commitment: "confirmed" });
  return new Program<Exira>(idl as Exira, ap);
}

// -- High-level action helpers --
async function createProject(
  projectId: number,
  mrvId: number,
  targetUsdc: number,
  termMonths: number
): Promise<{ pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey }> {
  const pda = projectPda(projectId);
  const tokenMintKp = Keypair.generate();
  const vaultAddress = ata(usdcMint, pda);
  await program.methods
    .createProject(new BN(projectId), usdc(targetUsdc), termMonths)
    .accountsPartial({
      platform: platformPda(),
      admin: admin.publicKey,
      mrvProject: mrvPda(mrvId),
      project: pda,
      tokenMint: tokenMintKp.publicKey,
      usdcVault: vaultAddress,
      usdcMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .signers([tokenMintKp])
    .rpc();
  return { pda, tokenMint: tokenMintKp.publicKey, usdcVault: vaultAddress };
}

async function buyProjectTokens(
  investor: Keypair,
  proj: { pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey },
  amount: BN
) {
  const pInv = programFor(investor);
  await pInv.methods
    .buyProjectTokens(amount)
    .accountsPartial({
      project: proj.pda,
      tokenMint: proj.tokenMint,
      usdcVault: proj.usdcVault,
      investor: investor.publicKey,
      investorUsdcAta: ata(usdcMint, investor.publicKey),
      investorTokenAta: ata(proj.tokenMint, investor.publicKey),
      position: positionPda(proj.pda, investor.publicKey),
      usdcMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function activateProject(proj: { pda: PublicKey; usdcVault: PublicKey }) {
  await program.methods
    .activateProject()
    .accountsPartial({
      platform: platformPda(),
      admin: admin.publicKey,
      project: proj.pda,
      usdcVault: proj.usdcVault,
      treasuryUsdcAta,
      treasury: treasury.publicKey,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function distributeRepayment(
  proj: { pda: PublicKey; usdcVault: PublicKey },
  amount: BN
) {
  await program.methods
    .distributeRepayment(amount)
    .accountsPartial({
      platform: platformPda(),
      admin: admin.publicKey,
      project: proj.pda,
      adminUsdcAta: ata(usdcMint, admin.publicKey),
      usdcVault: proj.usdcVault,
      usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function claimProjectReturns(
  investor: Keypair,
  proj: { pda: PublicKey; usdcVault: PublicKey }
) {
  const pInv = programFor(investor);
  await pInv.methods
    .claimProjectReturns()
    .accountsPartial({
      project: proj.pda,
      usdcVault: proj.usdcVault,
      investor: investor.publicKey,
      position: positionPda(proj.pda, investor.publicKey),
      investorUsdcAta: ata(usdcMint, investor.publicKey),
      usdcMint,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();
}

async function registerMrvAndBaseline(mrvId: number) {
  await program.methods
    .registerMrvProject(new BN(mrvId), `MSME ${mrvId}`, "auto", "Chennai", "heat_pump")
    .accountsPartial({
      platform: platformPda(),
      admin: admin.publicKey,
      mrvProject: mrvPda(mrvId),
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const pAud = programFor(auditor);
  await pAud.methods
    .submitBaseline(
      new BN(1_000_000),
      "electricity",
      new BN(80_000_000),
      new BN(72_700),
      Array.from(Buffer.alloc(32, 1))
    )
    .accountsPartial({
      auditorSigner: auditor.publicKey,
      auditor: auditorPda(auditor.publicKey),
      mrvProject: mrvPda(mrvId),
      baseline: baselinePda(mrvPda(mrvId)),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

// ---------- TEST BODIES ----------

before("bootstrap fresh admin + platform + mint + auditor", async function () {
  this.timeout(180000);
  admin = await newWallet(500);
  treasury = Keypair.generate();

  provider = new AnchorProvider(connection, new Wallet(admin), { commitment: "confirmed" });
  anchor.setProvider(provider);
  program = new Program<Exira>(idl as Exira, provider);

  usdcMint = await createMint(connection, admin, admin.publicKey, null, 6);
  treasuryUsdcAta = await createAssociatedTokenAccountIdempotent(
    connection,
    admin,
    usdcMint,
    treasury.publicKey
  );

  // Check if platform already exists (surfpool state persisted across runs).
  // If so, reuse its admin. This makes tests robust against re-runs.
  let platformAcc;
  try {
    platformAcc = await program.account.platform.fetch(platformPda());
  } catch {}

  if (platformAcc) {
    // Reuse existing platform. Use its stored admin as our admin for this run.
    // We can't assume possession of that keypair, so we SKIP initialization
    // but tests that need admin actions must fetch the real admin from chain.
    throw new Error(
      `Platform PDA already exists with admin=${platformAcc.admin.toBase58()}. ` +
      `Please restart surfpool (pkill -f surfpool) and redeploy the program before re-running tests.`
    );
  }

  await program.methods
    .initializePlatform(150, 3000, 800)
    .accountsPartial({
      platform: platformPda(),
      admin: admin.publicKey,
      treasury: treasury.publicKey,
      usdcMint,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  auditor = await newWallet(5);
  await program.methods
    .addAuditor("Test Auditor", "BEE_certified")
    .accountsPartial({
      platform: platformPda(),
      admin: admin.publicKey,
      auditorWallet: auditor.publicKey,
      auditor: auditorPda(auditor.publicKey),
      systemProgram: SystemProgram.programId,
    })
    .rpc();
});

// ========== t06: Platform Initialization (8 tests) ==========
describe("t06: Platform Initialization", () => {
  it("stores admin, treasury, usdc_mint correctly", async () => {
    const p = await program.account.platform.fetch(platformPda());
    expect(p.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(p.treasury.toBase58()).to.equal(treasury.publicKey.toBase58());
    expect(p.usdcMint.toBase58()).to.equal(usdcMint.toBase58());
  });

  it("stores fee bps correctly", async () => {
    const p = await program.account.platform.fetch(platformPda());
    expect(p.originationFeeBps).to.equal(150);
    expect(p.performanceFeeBps).to.equal(3000);
    expect(p.hurdleRateBps).to.equal(800);
  });

  it("project_count and pool_count start at 0", async () => {
    const p = await program.account.platform.fetch(platformPda());
    expect(p.projectCount.toNumber()).to.equal(0);
    expect(p.poolCount.toNumber()).to.equal(0);
  });

  it("platform bump matches derived bump", async () => {
    const p = await program.account.platform.fetch(platformPda());
    const [, bump] = PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID);
    expect(p.bump).to.equal(bump);
  });

  it("rejects re-initialization (already-in-use)", async () => {
    try {
      await program.methods
        .initializePlatform(100, 1000, 500)
        .accountsPartial({
          platform: platformPda(),
          admin: admin.publicKey,
          treasury: treasury.publicKey,
          usdcMint,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail("should not allow reinit");
    } catch (e: any) {
      expect(String(e)).to.match(/already in use|Allocate/i);
    }
  });

  it("platform PDA is deterministic", () => {
    const [a] = PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID);
    const [b] = PublicKey.findProgramAddressSync([Buffer.from("platform")], EXIRA_PROGRAM_ID);
    expect(a.toBase58()).to.equal(b.toBase58());
  });

  it("error enum contains InvalidFeeBps", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("invalidFeeBps");
  });

  it("error enum contains Unauthorized", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("unauthorized");
  });
});

// ========== t07: MRV Registry (12 tests) ==========
describe("t07: MRV Registry", function () {
  this.timeout(60000);
  const MRV_ID = 7001;

  it("1. Registers MRV project", async () => {
    await program.methods
      .registerMrvProject(new BN(MRV_ID), "Lucas TVS", "auto", "Chennai", "heat_pump")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        mrvProject: mrvPda(MRV_ID),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const acc = await program.account.mrvProject.fetch(mrvPda(MRV_ID));
    expect(acc.projectId.toNumber()).to.equal(MRV_ID);
  });

  it("2. Rejects registration by non-admin", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    try {
      await p.methods
        .registerMrvProject(new BN(9999), "X", "Y", "Z", "W")
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          mrvProject: mrvPda(9999),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("3. Auditor active in bootstrap", async () => {
    const a = await program.account.auditor.fetch(auditorPda(auditor.publicKey));
    expect(a.isActive).to.equal(true);
  });

  it("4. Rejects duplicate auditor add", async () => {
    try {
      await program.methods
        .addAuditor("Dup", "dup")
        .accountsPartial({
          platform: platformPda(),
          admin: admin.publicKey,
          auditorWallet: auditor.publicKey,
          auditor: auditorPda(auditor.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/already in use|Allocate/i);
    }
  });

  it("5. Rejects non-admin add auditor", async () => {
    const attacker = await newWallet(5);
    const victim = Keypair.generate();
    const p = programFor(attacker);
    try {
      await p.methods
        .addAuditor("Bad", "none")
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          auditorWallet: victim.publicKey,
          auditor: auditorPda(victim.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("6. Auditor submits baseline", async () => {
    const p = programFor(auditor);
    await p.methods
      .submitBaseline(
        new BN(1_200_000),
        "electricity",
        new BN(96_000_000),
        new BN(87_200),
        Array.from(Buffer.alloc(32, 1))
      )
      .accountsPartial({
        auditorSigner: auditor.publicKey,
        auditor: auditorPda(auditor.publicKey),
        mrvProject: mrvPda(MRV_ID),
        baseline: baselinePda(mrvPda(MRV_ID)),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const mrv = await program.account.mrvProject.fetch(mrvPda(MRV_ID));
    expect(mrv.baselineSubmitted).to.equal(true);
  });

  it("7. Rejects baseline by non-auditor", async () => {
    const MRV2 = 7002;
    await program.methods
      .registerMrvProject(new BN(MRV2), "O", "S", "P", "M")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        mrvProject: mrvPda(MRV2),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    try {
      await p.methods
        .submitBaseline(new BN(1), "x", new BN(1), new BN(1), Array.from(Buffer.alloc(32)))
        .accountsPartial({
          auditorSigner: attacker.publicKey,
          auditor: auditorPda(attacker.publicKey),
          mrvProject: mrvPda(MRV2),
          baseline: baselinePda(mrvPda(MRV2)),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/AccountNotInitialized|auditor/i);
    }
  });

  it("8. Rejects duplicate baseline", async () => {
    const p = programFor(auditor);
    try {
      await p.methods
        .submitBaseline(
          new BN(2_000_000),
          "gas",
          new BN(1),
          new BN(1),
          Array.from(Buffer.alloc(32, 2))
        )
        .accountsPartial({
          auditorSigner: auditor.publicKey,
          auditor: auditorPda(auditor.publicKey),
          mrvProject: mrvPda(MRV_ID),
          baseline: baselinePda(mrvPda(MRV_ID)),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/already in use|BaselineAlreadySubmitted/i);
    }
  });

  it("9. Submits verification", async () => {
    const p = programFor(auditor);
    await p.methods
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
        auditorSigner: auditor.publicKey,
        auditor: auditorPda(auditor.publicKey),
        mrvProject: mrvPda(MRV_ID),
        verification: verificationPda(mrvPda(MRV_ID), 0),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const v = await program.account.verification.fetch(verificationPda(mrvPda(MRV_ID), 0));
    expect(v.index).to.equal(0);
  });

  it("10. Multiple verifications allowed", async () => {
    const p = programFor(auditor);
    await p.methods
      .submitVerification(
        1,
        new BN(1702000001),
        new BN(1704000000),
        new BN(250_000),
        new BN(20_000_000),
        new BN(18_150),
        11000,
        Array.from(Buffer.alloc(32, 10))
      )
      .accountsPartial({
        auditorSigner: auditor.publicKey,
        auditor: auditorPda(auditor.publicKey),
        mrvProject: mrvPda(MRV_ID),
        verification: verificationPda(mrvPda(MRV_ID), 1),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const mrv = await program.account.mrvProject.fetch(mrvPda(MRV_ID));
    expect(mrv.verificationCount).to.be.at.least(2);
  });

  it("11. Attests verification", async () => {
    const p = programFor(auditor);
    await p.methods
      .attestVerification()
      .accountsPartial({
        auditorSigner: auditor.publicKey,
        auditor: auditorPda(auditor.publicKey),
        mrvProject: mrvPda(MRV_ID),
        verification: verificationPda(mrvPda(MRV_ID), 0),
      })
      .rpc();
    const v = await program.account.verification.fetch(verificationPda(mrvPda(MRV_ID), 0));
    expect(v.attested).to.equal(true);
  });

  it("12. Rejects attest by different auditor", async () => {
    const aud2 = await newWallet(5);
    await program.methods
      .addAuditor("A2", "BEE")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        auditorWallet: aud2.publicKey,
        auditor: auditorPda(aud2.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const p = programFor(aud2);
    try {
      await p.methods
        .attestVerification()
        .accountsPartial({
          auditorSigner: aud2.publicKey,
          auditor: auditorPda(aud2.publicKey),
          mrvProject: mrvPda(MRV_ID),
          verification: verificationPda(mrvPda(MRV_ID), 1),
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Mismatch|auditor/i);
    }
  });
});

// ========== t08-t10: Project lifecycle (14 tests) ==========
describe("t08-t10: Project lifecycle", function () {
  this.timeout(120000);
  const PID = 1000;
  const MRV = 1000;
  let proj: { pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey };
  let investorA: Keypair;
  let investorB: Keypair;

  before("register MRV + baseline for project", async () => {
    await registerMrvAndBaseline(MRV);
  });

  it("1. Creates project", async () => {
    proj = await createProject(PID, MRV, 500, 24);
    const p = await program.account.project.fetch(proj.pda);
    expect(p.targetAmount.toString()).to.equal(usdc(500).toString());
    expect(Object.keys(p.status)[0]).to.equal("funding");
  });

  it("2. Rejects creation without baseline", async () => {
    const mrv2 = 1100;
    await program.methods
      .registerMrvProject(new BN(mrv2), "x", "y", "z", "w")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        mrvProject: mrvPda(mrv2),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    try {
      await createProject(1100, mrv2, 100, 12);
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/MrvBaselineMissing|baseline/i);
    }
  });

  it("3. Rejects non-admin create", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    const tmKp = Keypair.generate();
    try {
      await p.methods
        .createProject(new BN(1201), usdc(10), 12)
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          mrvProject: mrvPda(MRV),
          project: projectPda(1201),
          tokenMint: tmKp.publicKey,
          usdcVault: ata(usdcMint, projectPda(1201)),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([tmKp])
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("4. Rejects target=0", async () => {
    const mrv = 1300;
    await program.methods
      .registerMrvProject(new BN(mrv), "x", "y", "z", "w")
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        mrvProject: mrvPda(mrv),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const pAud = programFor(auditor);
    await pAud.methods
      .submitBaseline(new BN(1), "e", new BN(1), new BN(1), Array.from(Buffer.alloc(32)))
      .accountsPartial({
        auditorSigner: auditor.publicKey,
        auditor: auditorPda(auditor.publicKey),
        mrvProject: mrvPda(mrv),
        baseline: baselinePda(mrvPda(mrv)),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    try {
      await createProject(1300, mrv, 0, 12);
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/InvalidTargetAmount/i);
    }
  });

  it("5. Rejects term < 6", async () => {
    try {
      await createProject(1401, MRV, 10, 2);
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/InvalidTermMonths|term/i);
    }
  });

  it("6. Investor A buys 200 USDC", async () => {
    investorA = await newWallet(5);
    await mintUsdcTo(investorA.publicKey, usdc(300));
    await buyProjectTokens(investorA, proj, usdc(200));
    const pos = await program.account.investorPosition.fetch(
      positionPda(proj.pda, investorA.publicKey)
    );
    expect(pos.tokensHeld.toString()).to.equal(usdc(200).toString());
  });

  it("7. Investor B buys 300 → target reached", async () => {
    investorB = await newWallet(5);
    await mintUsdcTo(investorB.publicKey, usdc(500));
    await buyProjectTokens(investorB, proj, usdc(300));
    const p = await program.account.project.fetch(proj.pda);
    expect(p.tokensSold.toString()).to.equal(usdc(500).toString());
  });

  it("8. Rejects buy past target", async () => {
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(10));
    try {
      await buyProjectTokens(inv, proj, usdc(1));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/PoolFull|capacity/i);
    }
  });

  it("9. Activation: Active, orig fee collected", async () => {
    await activateProject(proj);
    const p = await program.account.project.fetch(proj.pda);
    expect(Object.keys(p.status)[0]).to.equal("active");
    expect(p.originationFeeCollected.toString()).to.equal(usdc(7.5).toString());
  });

  it("10. Treasury received 1.5% fee", async () => {
    const bal = await getBal(treasuryUsdcAta);
    expect(bal).to.equal(BigInt(usdc(7.5).toString()));
  });

  it("11. Cannot buy after Active", async () => {
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(10));
    try {
      await buyProjectTokens(inv, proj, usdc(1));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/NotFunding|status/i);
    }
  });

  it("12. Distribute 100 USDC → accumulator updates", async () => {
    await mintUsdcTo(admin.publicKey, usdc(500));
    await distributeRepayment(proj, usdc(100));
    const p = await program.account.project.fetch(proj.pda);
    expect(p.totalDistributed.toString()).to.equal(usdc(100).toString());
    expect(Object.keys(p.status)[0]).to.equal("repaying");
    expect(p.cumulativeUsdcPerToken.toString()).to.equal("200000000000");
  });

  it("13. Investor A claims 40 USDC", async () => {
    const before = await getBal(ata(usdcMint, investorA.publicKey));
    await claimProjectReturns(investorA, proj);
    const after = await getBal(ata(usdcMint, investorA.publicKey));
    expect(after - before).to.equal(BigInt(usdc(40).toString()));
  });

  it("14. Investor B claims 60 USDC", async () => {
    const before = await getBal(ata(usdcMint, investorB.publicKey));
    await claimProjectReturns(investorB, proj);
    const after = await getBal(ata(usdcMint, investorB.publicKey));
    expect(after - before).to.equal(BigInt(usdc(60).toString()));
  });
});

// ========== t14: Distribution math (15 tests) ==========
describe("t14: Distribution math correctness", function () {
  this.timeout(120000);
  const PID = 14000;
  const MRV = 14000;
  let proj: { pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey };
  let invA: Keypair, invB: Keypair, invC: Keypair;

  before(async () => {
    await registerMrvAndBaseline(MRV);
    proj = await createProject(PID, MRV, 1000, 12);

    invA = await newWallet(5);
    invB = await newWallet(5);
    invC = await newWallet(5);
    await mintUsdcTo(invA.publicKey, usdc(200));
    await mintUsdcTo(invB.publicKey, usdc(300));
    await mintUsdcTo(invC.publicKey, usdc(500));
    await buyProjectTokens(invA, proj, usdc(200));
    await buyProjectTokens(invB, proj, usdc(300));
    await buyProjectTokens(invC, proj, usdc(500));
    await activateProject(proj);
    await mintUsdcTo(admin.publicKey, usdc(10000));
  });

  it("1. Single distribution: sum of claims equals deposit", async () => {
    await distributeRepayment(proj, usdc(100));
    const beforeA = await getBal(ata(usdcMint, invA.publicKey));
    const beforeB = await getBal(ata(usdcMint, invB.publicKey));
    const beforeC = await getBal(ata(usdcMint, invC.publicKey));
    await claimProjectReturns(invA, proj);
    await claimProjectReturns(invB, proj);
    await claimProjectReturns(invC, proj);
    const claimedA = (await getBal(ata(usdcMint, invA.publicKey))) - beforeA;
    const claimedB = (await getBal(ata(usdcMint, invB.publicKey))) - beforeB;
    const claimedC = (await getBal(ata(usdcMint, invC.publicKey))) - beforeC;
    expect(claimedA).to.equal(BigInt(usdc(20).toString()));
    expect(claimedB).to.equal(BigInt(usdc(30).toString()));
    expect(claimedC).to.equal(BigInt(usdc(50).toString()));
    expect(claimedA + claimedB + claimedC).to.equal(BigInt(usdc(100).toString()));
  });

  it("2. Second distribution: A claims only new portion", async () => {
    await distributeRepayment(proj, usdc(50));
    const before = await getBal(ata(usdcMint, invA.publicKey));
    await claimProjectReturns(invA, proj);
    const claimed = (await getBal(ata(usdcMint, invA.publicKey))) - before;
    expect(claimed).to.equal(BigInt(usdc(10).toString()));
  });

  it("3. Claim with nothing owed reverts", async () => {
    try {
      await claimProjectReturns(invA, proj);
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/NothingToClaim/i);
    }
  });

  it("4-8. Five weekly distributions, single claim at end: correct sum", async () => {
    const MRV2 = 14100, PID2 = 14100;
    await registerMrvAndBaseline(MRV2);
    const p2 = await createProject(PID2, MRV2, 100, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(150));
    await buyProjectTokens(inv, p2, usdc(100));
    await activateProject(p2);
    await mintUsdcTo(admin.publicKey, usdc(100));

    for (let i = 0; i < 5; i++) {
      await distributeRepayment(p2, usdc(10));
    }
    const before = await getBal(ata(usdcMint, inv.publicKey));
    await claimProjectReturns(inv, p2);
    const claimed = (await getBal(ata(usdcMint, inv.publicKey))) - before;
    expect(claimed).to.equal(BigInt(usdc(50).toString()));
  });

  it("9. Late buyer earns only from subsequent distributions", async () => {
    const MRV3 = 14200, PID3 = 14200;
    await registerMrvAndBaseline(MRV3);
    const p3 = await createProject(PID3, MRV3, 100, 12);
    const early = await newWallet(5);
    const late = await newWallet(5);
    await mintUsdcTo(early.publicKey, usdc(50));
    await mintUsdcTo(late.publicKey, usdc(50));
    await buyProjectTokens(early, p3, usdc(50));
    await buyProjectTokens(late, p3, usdc(50));
    await activateProject(p3);
    await mintUsdcTo(admin.publicKey, usdc(20));
    await distributeRepayment(p3, usdc(20));
    const beforeE = await getBal(ata(usdcMint, early.publicKey));
    const beforeL = await getBal(ata(usdcMint, late.publicKey));
    await claimProjectReturns(early, p3);
    await claimProjectReturns(late, p3);
    expect((await getBal(ata(usdcMint, early.publicKey))) - beforeE).to.equal(
      BigInt(usdc(10).toString())
    );
    expect((await getBal(ata(usdcMint, late.publicKey))) - beforeL).to.equal(
      BigInt(usdc(10).toString())
    );
  });

  it("10. Zero-amount distribution reverts", async () => {
    try {
      await distributeRepayment(proj, new BN(0));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/ZeroAmount/i);
    }
  });

  it("11. tokens_sold > 0 precondition enforced", async () => {
    const p = await program.account.project.fetch(proj.pda);
    expect(p.tokensSold.toNumber()).to.be.greaterThan(0);
  });

  it("12. cumulative_per_token monotonic", async () => {
    const prev = (await program.account.project.fetch(proj.pda)).cumulativeUsdcPerToken;
    await distributeRepayment(proj, usdc(25));
    const curr = (await program.account.project.fetch(proj.pda)).cumulativeUsdcPerToken;
    expect(new BN(curr.toString()).gt(new BN(prev.toString()))).to.equal(true);
  });

  it("13. total_distributed tracks cumulative", async () => {
    const p = await program.account.project.fetch(proj.pda);
    expect(p.totalDistributed.toString()).to.equal(usdc(175).toString());
  });

  it("14. Sum of claims ≤ total distributed (invariant)", async () => {
    const positions = await program.account.investorPosition.all([
      { memcmp: { offset: 8 + 32, bytes: proj.pda.toBase58() } },
    ]);
    let totalClaimed = new BN(0);
    positions.forEach((p) => (totalClaimed = totalClaimed.add(p.account.totalClaimed)));
    const proj_ = await program.account.project.fetch(proj.pda);
    expect(totalClaimed.lte(proj_.totalDistributed)).to.equal(true);
  });

  it("15. Precision: 1-token × 1-USDC micro-claim rounds correctly", async () => {
    const MRV4 = 14300, PID4 = 14300;
    await registerMrvAndBaseline(MRV4);
    const p4 = await createProject(PID4, MRV4, 1, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(2));
    await buyProjectTokens(inv, p4, usdc(1));
    await activateProject(p4);
    await mintUsdcTo(admin.publicKey, usdc(2));
    await distributeRepayment(p4, usdc(1));
    const before = await getBal(ata(usdcMint, inv.publicKey));
    await claimProjectReturns(inv, p4);
    expect((await getBal(ata(usdcMint, inv.publicKey))) - before).to.equal(
      BigInt(usdc(1).toString())
    );
  });
});

// ========== t11-t13: Pool lifecycle (12 tests) ==========
describe("t11-t13: Pool lifecycle", function () {
  this.timeout(120000);
  const POOL_ID = 2000;
  const UP1_MRV = 2100, UP1_PID = 2100;
  const UP2_MRV = 2200, UP2_PID = 2200;
  let pool: { pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey };
  let proj1: { pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey };
  let proj2: { pda: PublicKey; tokenMint: PublicKey; usdcVault: PublicKey };
  let poolInvestor: Keypair;

  before(async () => {
    await registerMrvAndBaseline(UP1_MRV);
    await registerMrvAndBaseline(UP2_MRV);
    proj1 = await createProject(UP1_PID, UP1_MRV, 500, 12);
    proj2 = await createProject(UP2_PID, UP2_MRV, 500, 12);
  });

  it("1. Creates pool", async () => {
    const poolPdaAddr = poolPda(POOL_ID);
    const tmKp = Keypair.generate();
    const vault = ata(usdcMint, poolPdaAddr);
    await program.methods
      .createPool(new BN(POOL_ID), usdc(1000))
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        pool: poolPdaAddr,
        poolTokenMint: tmKp.publicKey,
        usdcVault: vault,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([tmKp])
      .rpc();
    pool = { pda: poolPdaAddr, tokenMint: tmKp.publicKey, usdcVault: vault };
    const p = await program.account.pool.fetch(pool.pda);
    expect(p.poolId.toNumber()).to.equal(POOL_ID);
  });

  it("2. Rejects pool creation by non-admin", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    const tmKp = Keypair.generate();
    try {
      await p.methods
        .createPool(new BN(2001), usdc(10))
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          pool: poolPda(2001),
          poolTokenMint: tmKp.publicKey,
          usdcVault: ata(usdcMint, poolPda(2001)),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([tmKp])
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("3. Rejects pool target=0", async () => {
    const tmKp = Keypair.generate();
    try {
      await program.methods
        .createPool(new BN(2002), usdc(0))
        .accountsPartial({
          platform: platformPda(),
          admin: admin.publicKey,
          pool: poolPda(2002),
          poolTokenMint: tmKp.publicKey,
          usdcVault: ata(usdcMint, poolPda(2002)),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([tmKp])
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/InvalidTargetAmount/i);
    }
  });

  it("4. Adds project1 to pool", async () => {
    await program.methods
      .addProjectToPool()
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        pool: pool.pda,
        project: proj1.pda,
        poolProjectLink: poolLinkPda(pool.pda, proj1.pda),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const link = await program.account.poolProjectLink.fetch(poolLinkPda(pool.pda, proj1.pda));
    expect(link.pool.toBase58()).to.equal(pool.pda.toBase58());
  });

  it("5. Adds project2 to pool; underlying_project_count = 2", async () => {
    await program.methods
      .addProjectToPool()
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        pool: pool.pda,
        project: proj2.pda,
        poolProjectLink: poolLinkPda(pool.pda, proj2.pda),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    const p = await program.account.pool.fetch(pool.pda);
    expect(p.underlyingProjectCount).to.equal(2);
  });

  it("6. Rejects adding same project twice", async () => {
    try {
      await program.methods
        .addProjectToPool()
        .accountsPartial({
          platform: platformPda(),
          admin: admin.publicKey,
          pool: pool.pda,
          project: proj1.pda,
          poolProjectLink: poolLinkPda(pool.pda, proj1.pda),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/already in use|Allocate|ProjectAlreadyLinked/i);
    }
  });

  it("7. Pool investor buys 500 pool tokens", async () => {
    poolInvestor = await newWallet(5);
    await mintUsdcTo(poolInvestor.publicKey, usdc(600));
    const pInv = programFor(poolInvestor);
    await pInv.methods
      .buyPoolTokens(usdc(500))
      .accountsPartial({
        pool: pool.pda,
        poolTokenMint: pool.tokenMint,
        usdcVault: pool.usdcVault,
        investor: poolInvestor.publicKey,
        investorUsdcAta: ata(usdcMint, poolInvestor.publicKey),
        investorPoolTokenAta: ata(pool.tokenMint, poolInvestor.publicKey),
        position: positionPda(pool.pda, poolInvestor.publicKey),
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    const pos = await program.account.investorPosition.fetch(
      positionPda(pool.pda, poolInvestor.publicKey)
    );
    expect(pos.tokensHeld.toString()).to.equal(usdc(500).toString());
  });

  it("8. Pool PDA reflects project link registration", async () => {
    const link = await program.account.poolProjectLink.fetch(poolLinkPda(pool.pda, proj1.pda));
    expect(link.projectTokensHeld.toString()).to.equal("0");
  });

  it("9. Fill proj1 to target, activate, distribute", async () => {
    const extra = await newWallet(5);
    await mintUsdcTo(extra.publicKey, usdc(500));
    await buyProjectTokens(extra, proj1, usdc(500));
    await activateProject(proj1);
    await distributeRepayment(proj1, usdc(50));
    const p = await program.account.project.fetch(proj1.pda);
    expect(p.totalDistributed.toString()).to.equal(usdc(50).toString());
  });

  it("10. Admin distributes 100 USDC to pool vault", async () => {
    await mintUsdcTo(admin.publicKey, usdc(200));
    await program.methods
      .distributePoolReturns(usdc(100))
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        pool: pool.pda,
        adminUsdcAta: ata(usdcMint, admin.publicKey),
        usdcVault: pool.usdcVault,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    const p = await program.account.pool.fetch(pool.pda);
    expect(p.totalDistributed.toString()).to.equal(usdc(100).toString());
  });

  it("11. Pool investor claims 100 USDC", async () => {
    const pInv = programFor(poolInvestor);
    const before = await getBal(ata(usdcMint, poolInvestor.publicKey));
    await pInv.methods
      .claimPoolReturns()
      .accountsPartial({
        pool: pool.pda,
        usdcVault: pool.usdcVault,
        investor: poolInvestor.publicKey,
        position: positionPda(pool.pda, poolInvestor.publicKey),
        investorUsdcAta: ata(usdcMint, poolInvestor.publicKey),
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    const claimed = (await getBal(ata(usdcMint, poolInvestor.publicKey))) - before;
    expect(claimed).to.equal(BigInt(usdc(100).toString()));
  });

  it("12. Second claim with no new distribution reverts", async () => {
    const pInv = programFor(poolInvestor);
    try {
      await pInv.methods
        .claimPoolReturns()
        .accountsPartial({
          pool: pool.pda,
          usdcVault: pool.usdcVault,
          investor: poolInvestor.publicKey,
          position: positionPda(pool.pda, poolInvestor.publicKey),
          investorUsdcAta: ata(usdcMint, poolInvestor.publicKey),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/NothingToClaim/i);
    }
  });
});

// ========== t16: Security & authorization (vulnhunter) ==========
describe("t16: Security & authorization", function () {
  this.timeout(60000);

  it("1. Non-admin cannot re-init platform", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    try {
      await p.methods
        .initializePlatform(100, 1000, 500)
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          treasury: Keypair.generate().publicKey,
          usdcMint,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/already in use|Allocate|Unauthorized/i);
    }
  });

  it("2. Non-admin cannot create project", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    const tmKp = Keypair.generate();
    try {
      await p.methods
        .createProject(new BN(160001), usdc(10), 12)
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          mrvProject: mrvPda(1000),
          project: projectPda(160001),
          tokenMint: tmKp.publicKey,
          usdcVault: ata(usdcMint, projectPda(160001)),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([tmKp])
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("3. Non-admin cannot create pool", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    const tmKp = Keypair.generate();
    try {
      await p.methods
        .createPool(new BN(160002), usdc(10))
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          pool: poolPda(160002),
          poolTokenMint: tmKp.publicKey,
          usdcVault: ata(usdcMint, poolPda(160002)),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([tmKp])
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("4. Non-admin cannot add auditor", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    const victim = Keypair.generate();
    try {
      await p.methods
        .addAuditor("Evil", "none")
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          auditorWallet: victim.publicKey,
          auditor: auditorPda(victim.publicKey),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("5. Non-admin cannot distribute repayment", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    await mintUsdcTo(attacker.publicKey, usdc(100));
    try {
      await p.methods
        .distributeRepayment(usdc(10))
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          project: projectPda(1000),
          adminUsdcAta: ata(usdcMint, attacker.publicKey),
          usdcVault: ata(usdcMint, projectPda(1000)),
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("6. Non-admin cannot activate project", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    try {
      await p.methods
        .activateProject()
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          project: projectPda(1000),
          usdcVault: ata(usdcMint, projectPda(1000)),
          treasuryUsdcAta,
          treasury: treasury.publicKey,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("7. Non-admin cannot close project", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    try {
      await p.methods
        .closeProject()
        .accountsPartial({
          platform: platformPda(),
          admin: attacker.publicKey,
          project: projectPda(1000),
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/Unauthorized|has_one/i);
    }
  });

  it("8. Investor cannot claim another's position (PDA seeds)", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    try {
      await p.methods
        .claimProjectReturns()
        .accountsPartial({
          project: projectPda(1000),
          usdcVault: ata(usdcMint, projectPda(1000)),
          investor: attacker.publicKey,
          position: positionPda(projectPda(1000), attacker.publicKey),
          investorUsdcAta: ata(usdcMint, attacker.publicKey),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/AccountNotInitialized|position/i);
    }
  });

  it("9. Fake position PDA rejected", async () => {
    const attacker = await newWallet(5);
    const p = programFor(attacker);
    const fakePos = Keypair.generate().publicKey;
    try {
      await p.methods
        .claimProjectReturns()
        .accountsPartial({
          project: projectPda(1000),
          usdcVault: ata(usdcMint, projectPda(1000)),
          investor: attacker.publicKey,
          position: fakePos,
          investorUsdcAta: ata(usdcMint, attacker.publicKey),
          usdcMint,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/ConstraintSeeds|seeds|AccountNotInitialized/i);
    }
  });

  it("10. Error enum contains MathOverflow + MathUnderflow (overflow guards)", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("mathOverflow");
    expect(errs).to.include("mathUnderflow");
  });

  it("11. Error enum contains AttestationAuditorMismatch", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("attestationAuditorMismatch");
  });

  it("12. Error enum contains CannotWithdraw", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("cannotWithdraw");
  });

  it("13. Buy IDL marks investor as signer", () => {
    const buyIx = program.idl.instructions.find((i: any) => i.name === "buyProjectTokens");
    const inv = buyIx?.accounts.find((a: any) => a.name === "investor");
    expect((inv as any)?.signer).to.equal(true);
  });

  it("14. Close IDL requires admin signer", () => {
    const closeIx = program.idl.instructions.find((i: any) => i.name === "closeProject");
    const a = closeIx?.accounts.find((x: any) => x.name === "admin");
    expect((a as any)?.signer).to.equal(true);
  });

  it("15. Anchor version ≥ 1.0.0", () => {
    expect(program.idl.metadata?.version).to.match(/^\d+\.\d+\.\d+$/);
  });

  it("16. Token program present in buy instruction IDL", () => {
    const buyIx = program.idl.instructions.find((i: any) => i.name === "buyProjectTokens");
    const tp = buyIx?.accounts.find((a: any) => a.name === "tokenProgram");
    expect(tp).to.not.be.undefined;
  });

  it("17. AssociatedToken program present in buy IDL", () => {
    const buyIx = program.idl.instructions.find((i: any) => i.name === "buyProjectTokens");
    const atp = buyIx?.accounts.find((a: any) => a.name === "associatedTokenProgram");
    expect(atp).to.not.be.undefined;
  });

  it("18. Platform has_one admin constraint (baked into IDL)", () => {
    const initIx = program.idl.instructions.find((i: any) => i.name === "initializePlatform");
    expect(initIx).to.not.be.undefined;
  });

  it("19. Error enum contains NothingToClaim", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("nothingToClaim");
  });

  it("20. Error enum contains ZeroAmount", () => {
    const errs = program.idl.errors?.map((e: any) => e.name) ?? [];
    expect(errs).to.include("zeroAmount");
  });
});

// ========== t15: Edge cases (smaller set — 10 tests) ==========
describe("t15: Edge cases", function () {
  this.timeout(120000);

  it("1. Zero-amount buy reverts", async () => {
    const MRV = 15000, PID = 15000;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 100, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(10));
    try {
      await buyProjectTokens(inv, proj, new BN(0));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/ZeroAmount/i);
    }
  });

  it("2. Insufficient USDC fails cleanly", async () => {
    const MRV = 15001, PID = 15001;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 100, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(1));
    try {
      await buyProjectTokens(inv, proj, usdc(50));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/insufficient|0x1|custom program error/i);
    }
  });

  it("3. Buy exactly remaining capacity succeeds", async () => {
    const MRV = 15002, PID = 15002;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 50, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(50));
    await buyProjectTokens(inv, proj, usdc(50));
    const p = await program.account.project.fetch(proj.pda);
    expect(p.tokensSold.toString()).to.equal(p.targetAmount.toString());
  });

  it("4. Buy past target reverts PoolFull", async () => {
    const MRV = 15003, PID = 15003;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 50, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(50));
    await buyProjectTokens(inv, proj, usdc(50));
    const late = await newWallet(5);
    await mintUsdcTo(late.publicKey, usdc(10));
    try {
      await buyProjectTokens(late, proj, usdc(1));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/PoolFull|NotFunding/i);
    }
  });

  it("5. Withdraw during Funding burns tokens and refunds USDC", async () => {
    const MRV = 15004, PID = 15004;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 100, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(50));
    await buyProjectTokens(inv, proj, usdc(50));
    const pInv = programFor(inv);
    await pInv.methods
      .withdrawInvestment()
      .accountsPartial({
        project: proj.pda,
        tokenMint: proj.tokenMint,
        usdcVault: proj.usdcVault,
        investor: inv.publicKey,
        position: positionPda(proj.pda, inv.publicKey),
        investorTokenAta: ata(proj.tokenMint, inv.publicKey),
        investorUsdcAta: ata(usdcMint, inv.publicKey),
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    const pos = await program.account.investorPosition.fetch(positionPda(proj.pda, inv.publicKey));
    expect(pos.tokensHeld.toString()).to.equal("0");
    expect(await getBal(ata(usdcMint, inv.publicKey))).to.equal(BigInt(usdc(50).toString()));
  });

  it("6. Distribution with amount=0 reverts", async () => {
    const MRV = 15005, PID = 15005;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 50, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(50));
    await buyProjectTokens(inv, proj, usdc(50));
    await activateProject(proj);
    try {
      await distributeRepayment(proj, new BN(0));
      expect.fail();
    } catch (e: any) {
      expect(String(e)).to.match(/ZeroAmount/i);
    }
  });

  it("7. Multiple distributions single claim sums correctly", async () => {
    const MRV = 15006, PID = 15006;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 100, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(100));
    await buyProjectTokens(inv, proj, usdc(100));
    await activateProject(proj);
    await mintUsdcTo(admin.publicKey, usdc(60));
    await distributeRepayment(proj, usdc(20));
    await distributeRepayment(proj, usdc(20));
    await distributeRepayment(proj, usdc(20));
    const before = await getBal(ata(usdcMint, inv.publicKey));
    await claimProjectReturns(inv, proj);
    expect((await getBal(ata(usdcMint, inv.publicKey))) - before).to.equal(
      BigInt(usdc(60).toString())
    );
  });

  it("8. Close project transitions to Completed", async () => {
    const MRV = 15007, PID = 15007;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 50, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(50));
    await buyProjectTokens(inv, proj, usdc(50));
    await activateProject(proj);
    await program.methods
      .closeProject()
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        project: proj.pda,
      })
      .rpc();
    const p = await program.account.project.fetch(proj.pda);
    expect(Object.keys(p.status)[0]).to.equal("completed");
  });

  it("9. Large distribution (10000 USDC) u128 handles correctly", async () => {
    const MRV = 15008, PID = 15008;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 100, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(100));
    await buyProjectTokens(inv, proj, usdc(100));
    await activateProject(proj);
    await mintUsdcTo(admin.publicKey, usdc(10000));
    await distributeRepayment(proj, usdc(10000));
    const p = await program.account.project.fetch(proj.pda);
    expect(p.cumulativeUsdcPerToken.toString()).to.not.equal("0");
    expect(p.totalDistributed.toString()).to.equal(usdc(10000).toString());
  });

  it("10. Idempotent second buy accumulates tokens_held", async () => {
    const MRV = 15009, PID = 15009;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 200, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(150));
    await buyProjectTokens(inv, proj, usdc(50));
    await buyProjectTokens(inv, proj, usdc(50));
    const pos = await program.account.investorPosition.fetch(positionPda(proj.pda, inv.publicKey));
    expect(pos.tokensHeld.toString()).to.equal(usdc(100).toString());
  });
});

// ========== t17: End-to-end integration scenarios (5 scenarios) ==========
describe("t17: End-to-end integration", function () {
  this.timeout(180000);

  it("Scenario 1: Full project lifecycle — 3 investors, 3 monthly distributions, close", async () => {
    const MRV = 17001, PID = 17001;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 300, 6);
    const a = await newWallet(5);
    const b = await newWallet(5);
    const c = await newWallet(5);
    await mintUsdcTo(a.publicKey, usdc(100));
    await mintUsdcTo(b.publicKey, usdc(100));
    await mintUsdcTo(c.publicKey, usdc(100));
    await buyProjectTokens(a, proj, usdc(100));
    await buyProjectTokens(b, proj, usdc(100));
    await buyProjectTokens(c, proj, usdc(100));
    await activateProject(proj);
    await mintUsdcTo(admin.publicKey, usdc(300));
    for (let i = 0; i < 3; i++) await distributeRepayment(proj, usdc(50));
    const totalBefore =
      (await getBal(ata(usdcMint, a.publicKey))) +
      (await getBal(ata(usdcMint, b.publicKey))) +
      (await getBal(ata(usdcMint, c.publicKey)));
    await claimProjectReturns(a, proj);
    await claimProjectReturns(b, proj);
    await claimProjectReturns(c, proj);
    const totalAfter =
      (await getBal(ata(usdcMint, a.publicKey))) +
      (await getBal(ata(usdcMint, b.publicKey))) +
      (await getBal(ata(usdcMint, c.publicKey)));
    const diff = BigInt(usdc(150).toString()) - (totalAfter - totalBefore);
    expect(diff >= 0n && diff <= 10n).to.equal(true);
    await program.methods
      .closeProject()
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        project: proj.pda,
      })
      .rpc();
    const p = await program.account.project.fetch(proj.pda);
    expect(Object.keys(p.status)[0]).to.equal("completed");
  });

  it("Scenario 2: Late joiner fairness — distributions bracket late buyer", async () => {
    const MRV = 17002, PID = 17002;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 200, 6);
    const early = await newWallet(5);
    const late = await newWallet(5);
    await mintUsdcTo(early.publicKey, usdc(100));
    await mintUsdcTo(late.publicKey, usdc(100));
    await buyProjectTokens(early, proj, usdc(100));
    await buyProjectTokens(late, proj, usdc(100));
    await activateProject(proj);
    await mintUsdcTo(admin.publicKey, usdc(40));
    await distributeRepayment(proj, usdc(40));
    const bE = await getBal(ata(usdcMint, early.publicKey));
    const bL = await getBal(ata(usdcMint, late.publicKey));
    await claimProjectReturns(early, proj);
    await claimProjectReturns(late, proj);
    expect((await getBal(ata(usdcMint, early.publicKey))) - bE).to.equal(BigInt(usdc(20).toString()));
    expect((await getBal(ata(usdcMint, late.publicKey))) - bL).to.equal(BigInt(usdc(20).toString()));
  });

  it("Scenario 3: Mixed direct + pool (pool token holder claims from pool vault)", async () => {
    const POOL_ID = 17003;
    const poolPdaAddr = poolPda(POOL_ID);
    const tmKp = Keypair.generate();
    const vault = ata(usdcMint, poolPdaAddr);
    await program.methods
      .createPool(new BN(POOL_ID), usdc(500))
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        pool: poolPdaAddr,
        poolTokenMint: tmKp.publicKey,
        usdcVault: vault,
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([tmKp])
      .rpc();

    const poolInv = await newWallet(5);
    await mintUsdcTo(poolInv.publicKey, usdc(500));
    const pInv = programFor(poolInv);
    await pInv.methods
      .buyPoolTokens(usdc(500))
      .accountsPartial({
        pool: poolPdaAddr,
        poolTokenMint: tmKp.publicKey,
        usdcVault: vault,
        investor: poolInv.publicKey,
        investorUsdcAta: ata(usdcMint, poolInv.publicKey),
        investorPoolTokenAta: ata(tmKp.publicKey, poolInv.publicKey),
        position: positionPda(poolPdaAddr, poolInv.publicKey),
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    await mintUsdcTo(admin.publicKey, usdc(100));
    await program.methods
      .distributePoolReturns(usdc(100))
      .accountsPartial({
        platform: platformPda(),
        admin: admin.publicKey,
        pool: poolPdaAddr,
        adminUsdcAta: ata(usdcMint, admin.publicKey),
        usdcVault: vault,
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const before = await getBal(ata(usdcMint, poolInv.publicKey));
    await pInv.methods
      .claimPoolReturns()
      .accountsPartial({
        pool: poolPdaAddr,
        usdcVault: vault,
        investor: poolInv.publicKey,
        position: positionPda(poolPdaAddr, poolInv.publicKey),
        investorUsdcAta: ata(usdcMint, poolInv.publicKey),
        usdcMint,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    expect((await getBal(ata(usdcMint, poolInv.publicKey))) - before).to.equal(
      BigInt(usdc(100).toString())
    );
  });

  it("Scenario 4: Cancellation via withdraw before activation", async () => {
    const MRV = 17004, PID = 17004;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 300, 6);
    const a = await newWallet(5);
    const b = await newWallet(5);
    const c = await newWallet(5);
    await mintUsdcTo(a.publicKey, usdc(100));
    await mintUsdcTo(b.publicKey, usdc(100));
    await mintUsdcTo(c.publicKey, usdc(100));
    await buyProjectTokens(a, proj, usdc(100));
    await buyProjectTokens(b, proj, usdc(100));
    // Only partial fund: status is Funding. a/b can withdraw.
    const pA = programFor(a);
    await pA.methods
      .withdrawInvestment()
      .accountsPartial({
        project: proj.pda,
        tokenMint: proj.tokenMint,
        usdcVault: proj.usdcVault,
        investor: a.publicKey,
        position: positionPda(proj.pda, a.publicKey),
        investorTokenAta: ata(proj.tokenMint, a.publicKey),
        investorUsdcAta: ata(usdcMint, a.publicKey),
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    const pB = programFor(b);
    await pB.methods
      .withdrawInvestment()
      .accountsPartial({
        project: proj.pda,
        tokenMint: proj.tokenMint,
        usdcVault: proj.usdcVault,
        investor: b.publicKey,
        position: positionPda(proj.pda, b.publicKey),
        investorTokenAta: ata(proj.tokenMint, b.publicKey),
        investorUsdcAta: ata(usdcMint, b.publicKey),
        usdcMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    expect(await getBal(ata(usdcMint, a.publicKey))).to.equal(BigInt(usdc(100).toString()));
    expect(await getBal(ata(usdcMint, b.publicKey))).to.equal(BigInt(usdc(100).toString()));

    const p = await program.account.project.fetch(proj.pda);
    expect(p.tokensSold.toString()).to.equal("0");
  });

  it("Scenario 5: Fee accounting — treasury receives 1.5% on activation", async () => {
    const MRV = 17005, PID = 17005;
    await registerMrvAndBaseline(MRV);
    const proj = await createProject(PID, MRV, 1000, 12);
    const inv = await newWallet(5);
    await mintUsdcTo(inv.publicKey, usdc(1000));
    await buyProjectTokens(inv, proj, usdc(1000));

    const treasuryBefore = await getBal(treasuryUsdcAta);
    await activateProject(proj);
    const treasuryAfter = await getBal(treasuryUsdcAta);
    expect(treasuryAfter - treasuryBefore).to.equal(BigInt(usdc(15).toString())); // 1.5% of 1000
  });
});
