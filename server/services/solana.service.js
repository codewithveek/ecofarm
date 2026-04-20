// server/services/solana.service.js
// Logs farm actions as Solana memos — lightweight, cheap, verifiable.
// Uses @solana/web3.js (already in package.json).

import {
  Connection, Keypair, Transaction,
  TransactionInstruction, PublicKey, sendAndConfirmTransaction,
} from '@solana/web3.js'

// Devnet for hackathon; swap to mainnet-beta for production
const SOLANA_RPC   = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

let _connection = null
let _keypair    = null

function getConnection() {
  if (!_connection) _connection = new Connection(SOLANA_RPC, 'confirmed')
  return _connection
}

function getKeypair() {
  if (!_keypair) {
    // Store the private key as a JSON array in SOLANA_PRIVATE_KEY env var
    // Generate with: solana-keygen new --outfile keypair.json
    const raw = process.env.SOLANA_PRIVATE_KEY
    if (!raw) {
      console.warn('[Solana] No SOLANA_PRIVATE_KEY set — skipping chain logging')
      return null
    }
    _keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)))
  }
  return _keypair
}

/**
 * Log a farm action as a Solana memo transaction.
 * The memo is a compact JSON string: { u, a, p, t }
 * (userId, action, points, timestamp)
 *
 * This gives verifiable, timestamped proof of every agent action —
 * critical for the leaderboard's trustworthiness.
 *
 * @returns {Promise<string|null>} transaction signature or null if skipped
 */
export async function logToSolana({ userId, action, plotId, points }) {
  const keypair = getKeypair()
  if (!keypair) return null   // gracefully skip if not configured

  try {
    const conn = getConnection()

    // Compact memo payload (keep under 566 bytes — Solana memo limit)
    const memo = JSON.stringify({
      u: userId.slice(0, 16),   // truncate for space
      a: action,
      pl: plotId,
      pts: points,
      t: Math.floor(Date.now() / 1000),
    })

    const ix = new TransactionInstruction({
      keys:      [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM,
      data:      Buffer.from(memo, 'utf-8'),
    })

    const tx  = new Transaction().add(ix)
    const sig = await sendAndConfirmTransaction(conn, tx, [keypair])

    console.log(`[Solana] Action logged: ${sig}`)
    return sig
  } catch (e) {
    // Non-fatal — don't crash the agent run if Solana is down
    console.warn('[Solana] Log failed:', e.message)
    return null
  }
}
