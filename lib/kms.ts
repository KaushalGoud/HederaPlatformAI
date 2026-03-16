import {
  KMSClient,
  SignCommand,
  GetPublicKeyCommand,
} from "@aws-sdk/client-kms";
import { PublicKey } from "@hashgraph/sdk";

const elliptic = require("elliptic");
const ec = new elliptic.ec("secp256k1");
const keccak256 = require("keccak256");
const asn1 = require("asn1.js");

function getKmsClient() {
  return new KMSClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const EcdsaSigAsnParse = asn1.define("EcdsaSig", function (this: any) {
  this.seq().obj(this.key("r").int(), this.key("s").int());
});

let signCount = 0; // track how many times KMS signs per transaction

export async function getKmsPublicKey(): Promise<PublicKey> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🔑 [KMS] Key ID     : ${process.env.AWS_KMS_KEY_ID}`);

  const command = new GetPublicKeyCommand({
    KeyId: process.env.AWS_KMS_KEY_ID!,
  });

  const response = await getKmsClient().send(command);

  let hexPublicKey = Buffer.from(response.PublicKey!).toString("hex");
  hexPublicKey = hexPublicKey.replace(
    "3056301006072a8648ce3d020106052b8104000a034200",
    ""
  );

  const kmsKey = ec.keyFromPublic(hexPublicKey, "hex");
  const compressedHex = kmsKey.getPublic().encodeCompressed("hex");

  console.log(`🔑 [KMS] Public Key : ${compressedHex}`);
  console.log(`🔗 [KMS] HashScan   : https://hashscan.io/testnet/account/${process.env.HEDERA_ACCOUNT_ID}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Reset sign counter for new transaction
  signCount = 0;

  return PublicKey.fromBytesECDSA(Buffer.from(compressedHex, "hex"));
}

export async function kmsSign(bytesToSign: Uint8Array): Promise<Uint8Array> {
  signCount++;

  const dataHex = Buffer.from(bytesToSign).toString("hex");
  const hash = keccak256(Buffer.from(dataHex, "hex"));

  const command = new SignCommand({
    KeyId: process.env.AWS_KMS_KEY_ID!,
    Message: hash,
    MessageType: "DIGEST",
    SigningAlgorithm: "ECDSA_SHA_256",
  });

  const response = await getKmsClient().send(command);

  // Only log on first sign — rest are duplicate node signatures
  if (signCount === 1) {
    console.log(`🔐 [KMS] Signing via AWS KMS (ECDSA_SHA_256)...`);
    console.log(`🔐 [KMS] Sign #${signCount} — CloudTrail logged ✅`);
  } else {
    console.log(`🔐 [KMS] Sign #${signCount} — node ${signCount} ✅`);
  }

  const decoded = EcdsaSigAsnParse.decode(
    Buffer.from(response.Signature!),
    "der"
  );

  const r = decoded.r.toArray("be", 32);
  const s = decoded.s.toArray("be", 32);

  const result = new Uint8Array(64);
  result.set(r, 0);
  result.set(s, 32);

  return result;
}