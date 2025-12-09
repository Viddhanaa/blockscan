Blueprint: Viddhana Private Chain & Blockscan Explorer
1. System Architecture Overview
The system consists of a private EVM-compatible blockchain (Viddhana Chain) running Proof of Authority (PoA) for speed and efficiency, integrated with a full-stack Block Explorer and a Middleware API for specific KYC logic.

Core Protocol: Go-Ethereum (geth)

Consensus: Clique (Proof-of-Authority) - Ideal for private 2-node setups.

Explorer: Blockscout (EVM Explorer for real-time tracking, verification, and interaction).

Native Coin: BTCD (BTC Diamond).

Custom Feature: On-chain KYC Registry via Smart Contract + Middleware RPC.

2. Phase 1: Blockchain Network Setup (Geth)
We will set up a private network with 2 nodes: Node A (Bootnode/Sealer) and Node B (Peer/Sealer).

2.1. Genesis Configuration (genesis.json)
We define the chain specs and the BTCD coin.
JSON

{
  "config": {
    "chainId": 1337, 
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    "istanbulBlock": 0,
    "clique": {
      "period": 5, 
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "8000000",
  "alloc": {
    "0xYourAdminAddress...": { "balance": "1000000000000000000000000" } 
  },
  "coinbase": "0x0000000000000000000000000000000000000000",
  "extraData": "0x00...[Signer Address]...00" 
}
Note: alloc pre-funds your wallet with BTCD.

2.2. Node Configuration (Docker/Command Line)
Node 1 (Sealer/RPC Endpoint): Exposes RPC and WebSocket (WS) for real-time Blockscout updates.
Bash

geth --datadir ./node1 \
  --networkid 1337 \
  --http --http.addr "0.0.0.0" --http.port 8545 --http.corsdomain "*" --http.api "eth,net,web3,personal,miner,clique,txpool,debug" \
  --ws --ws.addr "0.0.0.0" --ws.port 8546 --ws.origins "*" --ws.api "eth,net,web3,personal,miner,clique,txpool,debug" \
  --allow-insecure-unlock \
  --mine --miner.etherbase "0xYourSignerAddress" \
  --unlock "0xYourSignerAddress" --password ./password.txt
Node 2 (Peer/Redundancy): Connects to Node 1 via bootnodes or admin.addPeer.
Bash

geth --datadir ./node2 \
  --networkid 1337 \
  --port 30304 \
  --bootnodes "enode://[Node1_PublicKey]@[Node1_IP]:30303" \
  --mine --miner.etherbase "0xYourSignerAddress2"
3. Phase 2: KYC Logic & Custom RPC Layer
To satisfy the requirement: "RPC xác định 1 địa chỉ nó đã kyc chưa và api để kyc", we will not modify the Geth source code (which is risky). Instead, we deploy a System Smart Contract and wrap it in a lightweight Middleware API.

3.1. On-Chain KYC Registry (Smart Contract)
Deploy this contract immediately after network launch. It serves as the single source of truth.

Solidity

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ViddhanaKYC is Ownable {
    mapping(address => bool) public kycStatus;
    event KYCUpdated(address indexed user, bool status);

    function setKYC(address _user, bool _status) external onlyOwner {
        kycStatus[_user] = _status;
        emit KYCUpdated(_user, _status);
    }

    function isKYC(address _user) external view returns (bool) {
        return kycStatus[_user];
    }
}
3.2. Middleware API (Node.js/Python)
This acts as your custom RPC provider.

Endpoint 1: Check KYC Status (Custom RPC)

Request: GET /rpc/check_kyc?address=0x123...

Logic: Calls ViddhanaKYC.isKYC(address) on-chain via Geth RPC.

Response: { "address": "0x123...", "is_kyc": true }

Endpoint 2: Perform KYC (Admin Action)

Request: POST /api/approve_kyc (Payload: { address: "0x123..." })

Logic: Server wallet (Owner) calls ViddhanaKYC.setKYC(address, true).

Response: { "tx_hash": "0xabc...", "status": "pending" }

4. Phase 3: Viddhana Blockscan (Block Explorer)
We will use Blockscout configured to look like the "ASD Explorer" (Image 2).

4.1. Blockscout Configuration (Docker Compose)
Key environment variables to ensure real-time updates and contract verification.

YAML

version: '3.8'
services:
  blockscout:
    image: blockscout/blockscout:latest
    environment:
      - ETHEREUM_JSONRPC_VARIANT=geth
      - ETHEREUM_JSONRPC_HTTP_URL=http://node1:8545
      - ETHEREUM_JSONRPC_WS_URL=ws://node1:8546  # Critical for Real-Time updates
      - CHAIN_ID=1337
      - NETWORK_NAME=Viddhana Chain
      - SUBNETWORK=Private
      - COIN=BTCD
      - SHOW_PRICE_CHART=false # Disable external price fetching for private coin
      - DISABLE_EXCHANGE_RATES=true
      # Contract Verification Settings
      - MICROSERVICE_SC_VERIFIER_ENABLED=true
      - MICROSERVICE_SC_VERIFIER_URL=http://smart-contract-verifier:8050
      # UI Customization (To match Image 2)
      - BRAND_NAME=Viddhana Blockscan
      - COLOR_THEME=blue # Adjusting CSS to match the blue/white gradient
4.2. Functional Requirements Implementation
Deploy & Verify Contracts:

Users deploy via Remix/Hardhat pointing to http://[Node1_IP]:8545.

On Blockscout, they navigate to the contract address -> Tab "Contract" -> "Verify & Publish".

Blockscout recompiles the code and matches bytecode.

Interact with Contracts (Read/Write):

Once verified, Blockscout automatically generates a UI.

Read Contract: Query data (e.g., check balanceOf, isKYC).

Write Contract: Connect MetaMask (configured to Viddhana Chain) to call functions (e.g., transfer, updateProfile).

5. Phase 4: Frontend UI/UX Design (Matching Image 2)
We will build a custom landing wrapper or customize the Blockscout CSS/Elixir templates to match the "ASD Explorer" visual exactly.

5.1. Visual Blueprint (Based on Image 2)
Color Palette:

Primary: Ocean Blue Gradient (linear-gradient(90deg, #4A90E2 0%, #00C6FF 100%)) - Matches the header background.

Secondary: Clean White (#FFFFFF) for cards.

Text: Dark Grey (#333333) for readability.

Layout Structure:

Header Section (The Blue Bar):

Logo: "Viddhana Blockscan" (Left aligned).

Connect Wallet Button: (Top Right) - Connects MetaMask to Viddhana Chain ID 1337.

Search Bar: Large, centered. Placeholder: "Search by address / txn hash / block / token..."

Dashboard Stats (The Cards):

Total Blocks: Real-time counter from Geth.

Avg Block Time: Calculated (e.g., 5.0s).

Total Transactions: Cumulative count.

Wallet Addresses: Count of unique addresses seen.

Gas Tracker: Display current gas price (e.g., 11 Gwei).

Real-Time Feeds (Live Updates):

Latest Blocks: Left column. Shows Block #, Validator (Miner), Reward, Timestamp. Updates via WebSocket without refresh.

Latest Transactions: Right column. Shows Tx Hash, From/To, Value (in BTCD).

KYC Badge: (Custom) If an address is KYC'd (checked via our API), add a small "Verified Checkmark" next to the address in the list.

5.2. Functional Flows
Contract Deployment:

User -> Remix IDE -> Deploy to Viddhana Chain (Metamask).

Explorer updates "Latest Transactions" instantly (Real-time).

Verification:

User clicks Contract Address on Explorer -> Click "Verify".

Upload source code -> Success -> "Green Checkmark" appears.

Interaction:

User goes to "Write Contract" tab.

Calls setKYC("0xUser...", true).

Metamask pops up to sign transaction in BTCD.
6. Summary of DeliverablesComponentTechnologySpecificationBlockchainGeth (Go-Ethereum)Private, 2 Nodes, Clique PoA, ChainID 1337.CoinNative CoinName: BTC Diamond, Symbol: BTCD.ExplorerBlockscoutCustomized UI ("ASD style"), Contract Verification enabled.Real-timeWebSockets (WS)Enabled on Geth & Blockscout for live dashboard updates.KYCSolidity + NodeJSOn-chain registry + API wrapper to check/set status.Contract FeaturesStandard EVMDeploy, Verify, Read, Write (Execute On-Chain).