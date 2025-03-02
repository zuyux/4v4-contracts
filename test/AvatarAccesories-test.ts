import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractFactory, Contract, Signer } from "ethers";

describe("AvatarAccessories Contract", () => {
  let AvatarAccessories: ContractFactory;
  let accessories: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  const SAMPLE_URI = "ipfs://QmAccessoryMetadataHash";
  const ACCESSORY_ID = 1;
  const AVATAR_ID = 100;
  const MINT_AMOUNT = 5;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    AvatarAccessories = await ethers.getContractFactory("AvatarAccessories");
    const accessoriesDeploy = await AvatarAccessories.deploy();
    accessories = await accessoriesDeploy.waitForDeployment();
  });

  describe("Deployment", () => {
    it("Should deploy correctly and set owner", async () => {
      expect(await accessories.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Minting", () => {
    it("Should allow owner to mint new accessories", async () => {
      const ownerAddr = await owner.getAddress();
      const tx = await accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI);
      const receipt = await tx.wait();

      expect(await accessories.balanceOf(ownerAddr, ACCESSORY_ID)).to.equal(MINT_AMOUNT);
      expect(await accessories.uri(ACCESSORY_ID)).to.equal(SAMPLE_URI);

      const event = receipt.logs.find((log: any) => log.fragment?.name === "AccessoryMinted");
      expect(event.args.id).to.equal(ACCESSORY_ID);
      expect(event.args.amount).to.equal(MINT_AMOUNT);
      expect(event.args.metadataURI).to.equal(SAMPLE_URI);
    });

    it("Should fail if not owner", async () => {
      await expect(
        accessories.connect(addr1).mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI)
      ).to.be.revertedWithCustomError(accessories, "OwnableUnauthorizedAccount");
    });

    it("Should fail if metadata URI is empty", async () => {
      await expect(
        accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, "")
      ).to.be.revertedWith("Metadata URI cannot be empty");
    });

    it("Should fail if accessory ID already exists", async () => {
      await accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI);
      await expect(
        accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI)
      ).to.be.revertedWith("Accessory ID already exists");
    });
  });

  describe("Equipping", () => {
    beforeEach(async () => {
      await accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI);
    });

    it("Should allow owner to equip accessory", async () => {
      const tx = await accessories.equipAccessory(AVATAR_ID, ACCESSORY_ID);
      const receipt = await tx.wait();

      expect(await accessories.isAccessoryEquipped(AVATAR_ID, ACCESSORY_ID)).to.be.true;

      const event = receipt.logs.find((log: any) => log.fragment?.name === "AccessoryEquipped");
      expect(event.args.avatarId).to.equal(AVATAR_ID);
      expect(event.args.accessoryId).to.equal(ACCESSORY_ID);
    });

    it("Should fail if caller doesn't own accessory", async () => {
      await expect(
        accessories.connect(addr1).equipAccessory(AVATAR_ID, ACCESSORY_ID)
      ).to.be.revertedWith("Caller does not own accessory");
    });

    it("Should fail if accessory already equipped", async () => {
      await accessories.equipAccessory(AVATAR_ID, ACCESSORY_ID);
      await expect(
        accessories.equipAccessory(AVATAR_ID, ACCESSORY_ID)
      ).to.be.revertedWith("Accessory already equipped");
    });
  });

  describe("Unequipping", () => {
    beforeEach(async () => {
      await accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI);
      await accessories.equipAccessory(AVATAR_ID, ACCESSORY_ID);
    });

    it("Should allow owner to unequip accessory", async () => {
      const tx = await accessories.unequipAccessory(AVATAR_ID, ACCESSORY_ID);
      const receipt = await tx.wait();

      expect(await accessories.isAccessoryEquipped(AVATAR_ID, ACCESSORY_ID)).to.be.false;

      const event = receipt.logs.find((log: any) => log.fragment?.name === "AccessoryUnequipped");
      expect(event.args.avatarId).to.equal(AVATAR_ID);
      expect(event.args.accessoryId).to.equal(ACCESSORY_ID);
    });

    it("Should fail if accessory not equipped", async () => {
      await accessories.unequipAccessory(AVATAR_ID, ACCESSORY_ID);
      await expect(
        accessories.unequipAccessory(AVATAR_ID, ACCESSORY_ID)
      ).to.be.revertedWith("Accessory not equipped");
    });
  });

  describe("Batch Transfer", () => {
    beforeEach(async () => {
      await accessories.mintAccessory(ACCESSORY_ID, MINT_AMOUNT, SAMPLE_URI);
    });

    it("Should allow batch transfer to multiple recipients", async () => {
      const addr1Addr = await addr1.getAddress();
      const addr2Addr = await addr2.getAddress();
      const recipients = [addr1Addr, addr2Addr];
      const ids = [ACCESSORY_ID, ACCESSORY_ID];
      const amounts = [2, 2];

      const tx = await accessories.batchTransfer(recipients, ids, amounts);
      const receipt = await tx.wait();

      expect(await accessories.balanceOf(addr1Addr, ACCESSORY_ID)).to.equal(2);
      expect(await accessories.balanceOf(addr2Addr, ACCESSORY_ID)).to.equal(2);

      const event = receipt.logs.find((log: any) => log.fragment?.name === "BatchTransferred");
      expect(event.args.operator).to.equal(await owner.getAddress());
      expect(event.args.recipients).to.deep.equal(recipients);
      expect(event.args.accessoryIds).to.deep.equal(ids);
    });

    it("Should fail if arrays mismatch", async () => {
      await expect(
        accessories.batchTransfer(
          [await addr1.getAddress()],
          [ACCESSORY_ID, ACCESSORY_ID],
          [1]
        )
      ).to.be.revertedWith("Array lengths must match");
    });

    it("Should fail if insufficient balance", async () => {
      const recipients = [await addr1.getAddress()];
      const ids = [ACCESSORY_ID];
      const amounts = [10];

      await expect(
        accessories.batchTransfer(recipients, ids, amounts)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should fail if transferring to zero address", async () => {
      const recipients = [ethers.ZeroAddress];
      const ids = [ACCESSORY_ID];
      const amounts = [1];

      await expect(
        accessories.batchTransfer(recipients, ids, amounts)
      ).to.be.revertedWith("Cannot transfer to zero address");
    });
  });
});