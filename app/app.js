// Exira Devnet Test UI
// Uses Phantom wallet, calls the deployed Exira program on Solana Devnet.
// Build: none — served as static file + CDN imports.

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Keypair,
} from "https://esm.sh/@solana/web3.js@1.98.2";

import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "https://esm.sh/@solana/spl-token@0.4.9";

import { BN, AnchorProvider, Program, Wallet } from "https://esm.sh/@anchor-lang/core@1.0.1";

import idl from "./exira.json" assert { type: "json" };

// ---------- Constants ----------
const EXIRA_PROGRAM_ID = new PublicKey("J7z1a2bwMEC8MchgZwskJZ8PzXg4UG674VgD8DuotJn2");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const RPC = "https://api.devnet.solana.com";
const connection = new Connection(RPC, "confirmed");

const PLATFORM_SEED = new TextEncoder().encode("platform");
const PROJECT_SEED = new TextEncoder().encode("project");
const POSITION_SEED = new TextEncoder().encode("position");
const MRV_PROJECT_SEED = new TextEncoder().encode("mrv_project");
const BASELINE_SEED = new TextEncoder().encode("baseline");
const AUDITOR_SEED = new TextEncoder().encode("auditor");

// Update explorer link
document.getElementById("explorerLink").href =
  `https://explorer.solana.com/address/${EXIRA_PROGRAM_ID.toBase58()}?cluster=devnet`;

// ---------- State ----------
let wallet = null;
let provider = null;
let program = null;

// ---------- Helpers ----------
function u64Le(n) {
  const bn = new BN(n);
  return Uint8Array.from(bn.toArray("le", 8));
}
function platformPda() {
  return PublicKey.findProgramAddressSync([PLATFORM_SEED], EXIRA_PROGRAM_ID)[0];
}
function projectPda(id) {
  return PublicKey.findProgramAddressSync([PROJECT_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
}
function positionPda(target, owner) {
  return PublicKey.findProgramAddressSync(
    [POSITION_SEED, target.toBuffer(), owner.toBuffer()],
    EXIRA_PROGRAM_ID
  )[0];
}
function mrvPda(id) {
  return PublicKey.findProgramAddressSync([MRV_PROJECT_SEED, u64Le(id)], EXIRA_PROGRAM_ID)[0];
}
function baselinePda(mrv) {
  return PublicKey.findProgramAddressSync([BASELINE_SEED, mrv.toBuffer()], EXIRA_PROGRAM_ID)[0];
}
function auditorPda(w) {
  return PublicKey.findProgramAddressSync([AUDITOR_SEED, w.toBuffer()], EXIRA_PROGRAM_ID)[0];
}
function ata(mint, owner) {
  return getAssociatedTokenAddressSync(mint, owner, true);
}
function usdc(n) {
  return new BN(Math.round(Number(n) * 1_000_000));
}

// ---------- Logging ----------
function log(msg, cls = "") {
  const el = document.getElementById("log");
  const entry = document.createElement("div");
  entry.className = "log-entry " + cls;
  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `<span style="color:var(--muted)">[${timestamp}]</span> ${msg}`;
  el.prepend(entry);
}
function logTx(txSig) {
  log(
    `Tx: <a href="https://explorer.solana.com/tx/${txSig}?cluster=devnet" target="_blank" style="color:var(--accent)">${txSig.slice(0, 16)}...</a>`,
    "success"
  );
}

// ---------- Wallet connect ----------
async function connectPhantom() {
  if (!window.solana || !window.solana.isPhantom) {
    alert("Phantom wallet not found. Install: https://phantom.app");
    return;
  }
  try {
    const resp = await window.solana.connect();
    wallet = {
      publicKey: resp.publicKey,
      signTransaction: (tx) => window.solana.signTransaction(tx),
      signAllTransactions: (txs) => window.solana.signAllTransactions(txs),
    };
    provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    program = new Program(idl, provider);

    document.getElementById("connectBtn").textContent = "Connected";
    document.getElementById("connectBtn").disabled = true;
    document.getElementById("walletInfo").textContent = resp.publicKey.toBase58();
    log(`Connected Phantom: ${resp.publicKey.toBase58()}`, "success");
    refreshPlatform();
  } catch (e) {
    log(`Connect error: ${e.message}`, "error");
  }
}

// ---------- Actions ----------
async function refreshPlatform() {
  try {
    const p = await program.account.platform.fetch(platformPda());
    const bal = await connection.getBalance(wallet.publicKey);
    document.getElementById("platformStatus").innerHTML = `
      <div><b>admin:</b> <span class="addr">${p.admin.toBase58()}</span></div>
      <div><b>treasury:</b> <span class="addr">${p.treasury.toBase58()}</span></div>
      <div><b>usdc_mint:</b> <span class="addr">${p.usdcMint.toBase58()}</span></div>
      <div><b>fees (bps):</b> orig=${p.originationFeeBps}, carry=${p.performanceFeeBps}, hurdle=${p.hurdleRateBps}</div>
      <div><b>counters:</b> projects=${p.projectCount}, pools=${p.poolCount}</div>
      <div><b>your SOL balance:</b> ${(bal / 1e9).toFixed(4)} SOL</div>
    `;
  } catch (e) {
    document.getElementById("platformStatus").textContent = "Platform not initialized yet.";
  }
}

async function requestAirdrop() {
  try {
    const sig = await connection.requestAirdrop(wallet.publicKey, 2 * 1e9);
    await connection.confirmTransaction(sig, "confirmed");
    log(`Airdropped 2 SOL.`, "success");
    logTx(sig);
    refreshPlatform();
  } catch (e) {
    log(`Airdrop failed: ${e.message} (rate limit? try https://faucet.solana.com)`, "error");
  }
}

async function registerMrv() {
  try {
    const id = Number(document.getElementById("mrvId").value);
    const name = document.getElementById("mrvName").value || `MSME ${id}`;
    const tx = await program.methods
      .registerMrvProject(new BN(id), name, "sector", "location", "upgrade_type")
      .accountsPartial({
        platform: platformPda(),
        admin: wallet.publicKey,
        mrvProject: mrvPda(id),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    log(`Registered MRV project ${id}: ${name}`, "success");
    logTx(tx);
  } catch (e) {
    log(`registerMrv error: ${e.message}`, "error");
  }
}

async function addAuditorSelf() {
  try {
    const tx = await program.methods
      .addAuditor("Self Auditor", "BEE_test")
      .accountsPartial({
        platform: platformPda(),
        admin: wallet.publicKey,
        auditorWallet: wallet.publicKey,
        auditor: auditorPda(wallet.publicKey),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    log(`Added self as auditor.`, "success");
    logTx(tx);
  } catch (e) {
    log(`addAuditor error: ${e.message}`, "error");
  }
}

async function submitBaseline() {
  try {
    const id = Number(document.getElementById("bMrvId").value);
    const mrv = mrvPda(id);
    const tx = await program.methods
      .submitBaseline(
        new BN(1_000_000),
        "electricity",
        new BN(80_000_000),
        new BN(72_700),
        Array.from(new Uint8Array(32).fill(1))
      )
      .accountsPartial({
        auditorSigner: wallet.publicKey,
        auditor: auditorPda(wallet.publicKey),
        mrvProject: mrv,
        baseline: baselinePda(mrv),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    log(`Baseline submitted for MRV ${id}`, "success");
    logTx(tx);
  } catch (e) {
    log(`submitBaseline error: ${e.message}`, "error");
  }
}

async function createProjectTx() {
  try {
    const mrvId = Number(document.getElementById("pMrvId").value);
    const pid = Number(document.getElementById("pPid").value);
    const target = usdc(document.getElementById("pTarget").value);
    const term = Number(document.getElementById("pTerm").value);
    const pda = projectPda(pid);
    const tokenMintKp = Keypair.generate();

    const tx = await program.methods
      .createProject(new BN(pid), target, term)
      .accountsPartial({
        platform: platformPda(),
        admin: wallet.publicKey,
        mrvProject: mrvPda(mrvId),
        project: pda,
        tokenMint: tokenMintKp.publicKey,
        usdcVault: ata(USDC_MINT, pda),
        usdcMint: USDC_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([tokenMintKp])
      .rpc();
    log(`Project ${pid} created. token_mint=${tokenMintKp.publicKey.toBase58()}`, "success");
    logTx(tx);
  } catch (e) {
    log(`createProject error: ${e.message}`, "error");
  }
}

async function activateProjectTx() {
  try {
    const pid = Number(document.getElementById("aPid").value);
    const platform = await program.account.platform.fetch(platformPda());
    const project = projectPda(pid);
    const pData = await program.account.project.fetch(project);
    const tx = await program.methods
      .activateProject()
      .accountsPartial({
        platform: platformPda(),
        admin: wallet.publicKey,
        project,
        usdcVault: pData.usdcVault,
        treasuryUsdcAta: ata(USDC_MINT, platform.treasury),
        treasury: platform.treasury,
        usdcMint: USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    log(`Project ${pid} activated.`, "success");
    logTx(tx);
  } catch (e) {
    log(`activate error: ${e.message}`, "error");
  }
}

async function distributeTx() {
  try {
    const pid = Number(document.getElementById("dPid").value);
    const amt = usdc(document.getElementById("dAmt").value);
    const project = projectPda(pid);
    const pData = await program.account.project.fetch(project);
    const tx = await program.methods
      .distributeRepayment(amt)
      .accountsPartial({
        platform: platformPda(),
        admin: wallet.publicKey,
        project,
        adminUsdcAta: ata(USDC_MINT, wallet.publicKey),
        usdcVault: pData.usdcVault,
        usdcMint: USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    log(`Distributed ${document.getElementById("dAmt").value} USDC to project ${pid}`, "success");
    logTx(tx);
  } catch (e) {
    log(`distribute error: ${e.message}`, "error");
  }
}

async function buyTokensTx() {
  try {
    const pid = Number(document.getElementById("bPid").value);
    const amt = usdc(document.getElementById("bAmt").value);
    const project = projectPda(pid);
    const pData = await program.account.project.fetch(project);
    const tx = await program.methods
      .buyProjectTokens(amt)
      .accountsPartial({
        project,
        tokenMint: pData.tokenMint,
        usdcVault: pData.usdcVault,
        investor: wallet.publicKey,
        investorUsdcAta: ata(USDC_MINT, wallet.publicKey),
        investorTokenAta: ata(pData.tokenMint, wallet.publicKey),
        position: positionPda(project, wallet.publicKey),
        usdcMint: USDC_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    log(`Bought ${document.getElementById("bAmt").value} USDC of project ${pid}`, "success");
    logTx(tx);
  } catch (e) {
    log(`buy error: ${e.message}`, "error");
  }
}

async function claimTx() {
  try {
    const pid = Number(document.getElementById("cPid").value);
    const project = projectPda(pid);
    const pData = await program.account.project.fetch(project);
    const tx = await program.methods
      .claimProjectReturns()
      .accountsPartial({
        project,
        usdcVault: pData.usdcVault,
        investor: wallet.publicKey,
        position: positionPda(project, wallet.publicKey),
        investorUsdcAta: ata(USDC_MINT, wallet.publicKey),
        usdcMint: USDC_MINT,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    log(`Claimed returns from project ${pid}`, "success");
    logTx(tx);
  } catch (e) {
    log(`claim error: ${e.message}`, "error");
  }
}

async function withdrawTx() {
  try {
    const pid = Number(document.getElementById("wPid").value);
    const project = projectPda(pid);
    const pData = await program.account.project.fetch(project);
    const tx = await program.methods
      .withdrawInvestment()
      .accountsPartial({
        project,
        tokenMint: pData.tokenMint,
        usdcVault: pData.usdcVault,
        investor: wallet.publicKey,
        position: positionPda(project, wallet.publicKey),
        investorTokenAta: ata(pData.tokenMint, wallet.publicKey),
        investorUsdcAta: ata(USDC_MINT, wallet.publicKey),
        usdcMint: USDC_MINT,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    log(`Withdrew from project ${pid}`, "success");
    logTx(tx);
  } catch (e) {
    log(`withdraw error: ${e.message}`, "error");
  }
}

async function inspectProject() {
  try {
    const pid = Number(document.getElementById("iPid").value);
    const p = await program.account.project.fetch(projectPda(pid));
    document.getElementById("projectData").textContent = JSON.stringify(
      {
        project_id: p.projectId.toString(),
        token_mint: p.tokenMint.toBase58(),
        usdc_vault: p.usdcVault.toBase58(),
        target_amount: p.targetAmount.toString(),
        tokens_sold: p.tokensSold.toString(),
        total_distributed: p.totalDistributed.toString(),
        cumulative_usdc_per_token: p.cumulativeUsdcPerToken.toString(),
        term_months: p.termMonths,
        status: Object.keys(p.status)[0],
        activated_at: p.activatedAt.toString(),
        origination_fee_collected: p.originationFeeCollected.toString(),
      },
      null,
      2
    );
  } catch (e) {
    document.getElementById("projectData").textContent = `Error: ${e.message}`;
  }
}

// ---------- Wire up ----------
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", connectPhantom);
});

// Expose for inline onclick handlers
window.refreshPlatform = refreshPlatform;
window.requestAirdrop = requestAirdrop;
window.registerMrv = registerMrv;
window.addAuditorSelf = addAuditorSelf;
window.submitBaseline = submitBaseline;
window.createProjectTx = createProjectTx;
window.activateProjectTx = activateProjectTx;
window.distributeTx = distributeTx;
window.buyTokensTx = buyTokensTx;
window.claimTx = claimTx;
window.withdrawTx = withdrawTx;
window.inspectProject = inspectProject;
