/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "hedera-agent-kit",
    "@hashgraph/sdk",
    "@aws-sdk/client-kms",
    "asn1.js",
    "elliptic",
    "keccak256",
  ],
};

export default nextConfig;
