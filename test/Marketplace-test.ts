import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractFactory, Contract, Signer } from "ethers";

describe("Marketplace Contract", () => {
  let Marketplace: ContractFactory;
  let AvatarMinter: ContractFactory;
  let AvatarAccessories: ContractFactory;
  let marketplace: Contract;
  let avatarMinter: Contract;
  let accessories: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  const PRICE = ethers.parseEther("1.0");
  const TOKEN_URI = "ipfs://bafkreihfg4oqrd6t6jr4oyqzsmtngxkfoyjx7iope5vaahakwr53aqrn5q";
  const ACCESSORY_URI = "ipfs://QmAccessoryMetadataHash";

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    AvatarMinter = await ethers.getContractFactory("AvatarMinter");
    const avatarMinterDeploy = await AvatarMinter.deploy();
    avatarMinter = await avatarMinterDeploy.waitForDeployment();

    AvatarAccessories = await ethers.getContractFactory("AvatarAccessories");
    const accessoriesDeploy = await AvatarAccessories.deploy();
    accessories = await accessoriesDeploy.waitForDeployment();

    Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplaceDeploy = await Marketplace.deploy(await avatarMinter.getAddress(), await accessories.getAddress());
    marketplace = await marketplaceDeploy.waitForDeployment();

    await avatarMinter.mintAvatar(await addr1.getAddress(), TOKEN_URI, false, { value: ethers.parseEther("0.01") });
    await accessories.mintAccessory(1, 5, ACCESSORY_URI);
    await avatarMinter.connect(addr1).approve(await marketplace.getAddress(), 1);
    await accessories.setApprovalForAll(await marketplace.getAddress(), true);
  });

  describe("Listing", () => {
    it("Should allow listing an avatar for fixed price", async () => {
      const tx = await marketplace.connect(addr1).listItem(1, PRICE, ethers.ZeroAddress, false);
      const receipt = await tx.wait();

      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(await addr1.getAddress());
      expect(listing.price).to.equal(PRICE);
      expect(listing.isAuction).to.be.false;
      expect(listing.active).to.be.true;
      expect(listing.creator).to.equal(await addr1.getAddress());
    });

    it("Should allow listing an accessory for auction", async () => {
      const tx = await marketplace.listItem(1, PRICE, ethers.ZeroAddress, true);
      const receipt = await tx.wait();

      const listing = await marketplace.listings(1);
      expect(listing.seller).to.equal(await owner.getAddress());
      expect(listing.isAuction).to.be.true;
      expect(listing.isERC721).to.be.false;
    });

    it("Should fail if price is zero", async () => {
      await expect(
        marketplace.connect(addr1).listItem(1, 0, ethers.ZeroAddress, false)
      ).to.be.revertedWith("Price must be greater than zero");
    });
  });

  describe("Buying", () => {
    it("Should allow buying a fixed price item", async () => {
      await marketplace.connect(addr1).listItem(1, PRICE, ethers.ZeroAddress, false);
      const addr2Addr = await addr2.getAddress();

      const tx = await marketplace.connect(addr2).buyItem(1, PRICE, { value: PRICE });
      await tx.wait();

      expect(await avatarMinter.ownerOf(1)).to.equal(addr2Addr);
      const listing = await marketplace.listings(1);
      expect(listing.active).to.be.false;
    });

    it("Should handle royalties", async () => {
      await marketplace.setRoyalty(1, 10); // 10% royalty
      await marketplace.connect(addr1).listItem(1, PRICE, ethers.ZeroAddress, false);

      const addr1Addr = await addr1.getAddress();
      const initialCreatorBalance = await ethers.provider.getBalance(addr1Addr);
      
      const tx = await marketplace.connect(addr2).buyItem(1, PRICE, { value: PRICE });
      const receipt = await tx.wait();

      const finalCreatorBalance = await ethers.provider.getBalance(addr1Addr);
      const royaltyAmount = PRICE * BigInt(10) / BigInt(100); // 0.1 ETH
      const sellerAmount = PRICE - royaltyAmount; // 0.9 ETH
      
      // Since addr1 is both creator and seller, they receive the full PRICE
      const expectedBalanceIncrease = sellerAmount + royaltyAmount;
      
      // Account for some variance due to gas costs in previous transactions
      expect(finalCreatorBalance - initialCreatorBalance).to.equal(expectedBalanceIncrease);
    });
  });

  describe("Auction", () => {
    beforeEach(async () => {
      await marketplace.connect(addr1).listItem(1, PRICE, ethers.ZeroAddress, true);
    });

    it("Should allow placing bids", async () => {
      const bidAmount = ethers.parseEther("1.5");
      await marketplace.connect(addr2).placeBid(1, { value: bidAmount });

      const listing = await marketplace.listings(1);
      expect(listing.highestBid).to.equal(bidAmount);
      expect(listing.highestBidder).to.equal(await addr2.getAddress());
    });

    it("Should refund previous bidder", async () => {
      await marketplace.connect(addr2).placeBid(1, { value: ethers.parseEther("1.5") });
      const initialBalance = await ethers.provider.getBalance(await addr2.getAddress());
      
      await marketplace.connect(owner).placeBid(1, { value: ethers.parseEther("2.0") });
      const finalBalance = await ethers.provider.getBalance(await addr2.getAddress());
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should allow finalizing auction", async () => {
      await marketplace.connect(addr2).placeBid(1, { value: ethers.parseEther("1.5") });
      await marketplace.connect(addr1).finalizeSale(1);

      expect(await avatarMinter.ownerOf(1)).to.equal(await addr2.getAddress());
      const listing = await marketplace.listings(1);
      expect(listing.active).to.be.false;
    });
  });

  describe("Royalties", () => {
    it("Should allow owner to set royalty", async () => {
      await marketplace.setRoyalty(1, 10);
      expect(await marketplace.royalties(1)).to.equal(10);
    });

    it("Should fail if non-owner tries to set royalty", async () => {
      await expect(
        marketplace.connect(addr1).setRoyalty(1, 10)
      ).to.be.revertedWithCustomError(marketplace, "OwnableUnauthorizedAccount");
    });
  });
});