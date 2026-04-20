import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const SOLANA_RPC =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

let _connection: Connection | null = null;
let _keypair: Keypair | null = null;

function getConnection(): Connection {
  if (!_connection) _connection = new Connection(SOLANA_RPC, "confirmed");
  return _connection;
}

function getKeypair(): Keypair | null {
  if (!_keypair) {
    const raw = process.env.SOLANA_PRIVATE_KEY;
    if (!raw) {
      console.warn(
        "[Solana] No SOLANA_PRIVATE_KEY set — skipping chain logging"
      );
      return null;
    }
    _keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }
  return _keypair;
}

interface SolanaLogParams {
  userId: string;
  action: string;
  plotId: string;
  points: number;
}

export async function logToSolana({
  userId,
  action,
  plotId,
  points,
}: SolanaLogParams): Promise<string | null> {
  const keypair = getKeypair();
  if (!keypair) return null;

  try {
    const conn = getConnection();

    const memo = JSON.stringify({
      u: userId.slice(0, 16),
      a: action,
      pl: plotId,
      pts: points,
      t: Math.floor(Date.now() / 1000),
    });

    const ix = new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM,
      data: Buffer.from(memo, "utf-8"),
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(conn, tx, [keypair]);

    console.log(`[Solana] Action logged: ${sig}`);
    return sig;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[Solana] Log failed:", msg);
    return null;
  }
}
