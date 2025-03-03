```markdown
# 4V4 - Avatar Creation & Ecosystem

## Introduction
**4V4** is a decentralized application (dApp) designed for creating, customizing, and exporting 3D avatars as NFTs. This repository focuses on the **smart contract suite**, which is deployed on Scroll zkEVM for fast, low-cost, and scalable transactions. While the project has a Next.js-powered web interface (with Three.js and Babylon.js) for real-time 3D rendering, **this README is dedicated to the contracts** that manage avatar minting, accessories, marketplace trading, and subscription/monetization.

---

## Features

### Web Interface (for reference)
- **Avatar Creation:** Intuitive UI to design and customize 3D avatars.
- **Real-Time Rendering:** Three.js and Babylon.js for high-quality 3D visuals.
- **NFT Export:** Mint avatars as NFTs directly from the interface.

*(Note: This repo only contains the contracts. The web interface is in a separate repository.)*

### Smart Contracts
1. **AvatarMinter (ERC-721):**
   - Mint unique 3D avatars as NFTs.
   - Supports soulbound (non-transferable) options.
   - Stores metadata on-chain or via IPFS.

2. **AvatarAccessories (ERC-1155):**
   - Manages semi-fungible accessories (wearables, skins, animations).
   - Allows batch minting and equipping/unequipping to avatars.

3. **Marketplace:**
   - Facilitates buying, selling, and auctioning of avatars/accessories.
   - Implements creator royalties on resales.

4. **SubscriptionMonetization:**
   - Manages subscriptions and microtransactions for premium features.
   - Optimized for Scroll L2 gas efficiency.

---

## Blockchain
- **Scroll zkEVM:** Leverages Layer 2 scaling for low-cost, fast transactions while maintaining Ethereum security.

---

## Prerequisites
- **Node.js:** v16 or higher
- **Hardhat:** For smart contract development/testing
- **OpenZeppelin Contracts:** Dependency for ERC-721 and ERC-1155 standards
- **Scroll zkEVM:** Configure for deployment (mainnet chain ID: `534352`)

---

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/zuyux/4v4-contracts.git
   cd 4v4-contracts
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   npm install @openzeppelin/contracts
   ```

3. **Configure Hardhat:**
   Update `hardhat.config.ts` (or `.js`) with your Scroll zkEVM network details:
   ```ts
   networks: {
     scroll: {
       url: "https://rpc.scroll.io", 
       accounts: [process.env.PRIVATE_KEY],
       chainId: 534352,
     },
   }
   ```

4. **Compile Contracts:**
   ```bash
   npx hardhat compile
   ```

---

## Testing
Run the full test suite to verify contract functionality:
```bash
npx hardhat test
```
- **Total Tests:** 53 passing  
- **Coverage:**
  - AvatarMinter: 17 tests
  - AvatarAccessories: 14 tests
  - Marketplace: 10 tests
  - SubscriptionMonetization: 12 tests

---

## Smart Contracts Overview

### 1. AvatarMinter.sol
- **Purpose:** Mints 3D avatars as ERC-721 NFTs.  
- **Key Functions:**
  - `mintAvatar(address recipient, string tokenURI, bool soulbound)`: Creates a new avatar.  
  - `setAvatarMetadata(...)`: Sets detailed metadata post-mint.  
  - `getMetadata(uint256 tokenId)`: Retrieves avatar metadata.
- **Features:** Soulbound support, metadata storage.

### 2. AvatarAccessories.sol
- **Purpose:** Manages accessories as ERC-1155 semi-fungible tokens.
- **Key Functions:**
  - `mintAccessory(uint256 id, uint256 amount, string metadataURI)`: Mints accessories.
  - `equipAccessory(uint256 avatarId, uint256 accessoryId)`: Links an accessory to an avatar.
  - `batchTransfer(address[] recipients, uint256[] accessoryIds, uint256[] amounts)`: Bulk transfers.
- **Features:** Batch operations, equipment tracking.

### 3. Marketplace.sol
- **Purpose:** Trading platform for avatars and accessories.
- **Key Functions:**
  - `listItem(uint256 tokenId, uint256 price, address currency, bool isAuction)`: Lists an item.
  - `buyItem(uint256 listingId, uint256 amount)`: Purchases fixed-price items.
  - `placeBid(uint256 listingId)`: Bids on auctions.
  - `setRoyalty(uint256 tokenId, uint256 percentage)`: Sets creator royalties.
- **Features:** Fixed-price & auctions, royalty support.

### 4. SubscriptionMonetization.sol
- **Purpose:** Manages subscriptions and microtransactions for premium features.
- **Key Functions:**
  - `subscribe(address user, uint256 duration, uint256 amount)`: Creates/extends subscriptions.
  - `payForFeature(address user, uint256 featureId, uint256 amount)`: Pays for premium features.
  - `checkSubscriptionStatus(address user)`: Verifies active subscriptions.
- **Features:** Gas-efficient design for Scroll L2.

---

## Deployment

1. **Set Environment Variables:**
   Create a `.env` file with your private key:
   ```bash
   PRIVATE_KEY=your_private_key_here
   ```

2. **Deploy to Scroll zkEVM:**
   ```bash
   npx hardhat run scripts/deploy.js --network scroll
   ```
   *(You'll need to create a `deploy.js` script tailored to your deployment needs.)*

---

## Integration with Web Interface
- **Frontend Setup:** Typically Next.js with `ethers.js` or `wagmi` for blockchain interaction.
- **3D Rendering:** Three.js/Babylon.js to display avatars based on contract metadata.
- **Contract Interaction:**
  - Call `mintAvatar` to create NFTs from the UI.
  - Use Marketplace functions for trading.
  - Check subscriptions via `checkSubscriptionStatus`.

---

## Usage Example

### Minting an Avatar
```js
const avatarMinter = new ethers.Contract(avatarMinterAddress, AvatarMinterABI, signer);

await avatarMinter.mintAvatar(
  userAddress, 
  "ipfs://metadata",
  false,
  { value: ethers.parseEther("0.01") }
);
```

### Subscribing
```js
const subscription = new ethers.Contract(subscriptionAddress, SubscriptionMonetizationABI, signer);

await subscription.subscribe(
  userAddress, 
  2592000, 
  ethers.parseEther("0.1"), 
  { value: ethers.parseEther("0.1") }
);
```

---

## Contributing

1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/new-feature`)  
3. Commit changes (`git commit -m "Add new feature"`)  
4. Push to the branch (`git push origin feature/new-feature`)  
5. Open a Pull Request  

---

## License
This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments
- **OpenZeppelin** for contract standards  
- **Scroll zkEVM** for L2 scaling  
- **Three.js & Babylon.js** for 3D rendering  