import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractFactory, Contract, Signer } from "ethers";

describe("AvatarMinter Contract", () => {
  let AvatarMinter: ContractFactory;
  let avatarMinter: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  const MINT_PRICE = ethers.parseEther("0.01");
  const SAMPLE_TOKEN_URI = "ipfs://bafkreihfg4oqrd6t6jr4oyqzsmtngxkfoyjx7iope5vaahakwr53aqrn5q";
  const SAMPLE_ANIMATION_URL = "ipfs://bafybeih3.../model.glb";

  // Adjusted sample metadata to match contract struct
  const sampleMetadata = {
    name: "Cool Avatar #1",
    description: "A unique 3D avatar for the metaverse",
    image: "ipfs://bafybeih3.../image.png",
    external_url: "https://example.com/avatar/1",
    attributes: [
      { trait_type: "Background", value: "Blue" },
      { trait_type: "Skin", value: "Green" }
    ],
    animation_url: SAMPLE_ANIMATION_URL,
  };

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    AvatarMinter = await ethers.getContractFactory("AvatarMinter");
    const avatarMinterDeploy = await AvatarMinter.deploy();
    avatarMinter = await avatarMinterDeploy.waitForDeployment();
  });

  describe("Deployment", () => {
    it("Should deploy correctly and set owner", async () => {
      expect(await avatarMinter.owner()).to.equal(await owner.getAddress());
    });

    it("Should initialize with zero total supply", async () => {
      expect(await avatarMinter.totalSupply()).to.equal(0);
    });

    it("Should set initial mint price", async () => {
      expect(await avatarMinter.mintPrice()).to.equal(MINT_PRICE);
    });
  });

  describe("Minting", () => {
    it("Should allow owner to mint avatar NFT", async () => {
      const recipient = await addr1.getAddress();
      const tx = await avatarMinter.mintAvatar(recipient, SAMPLE_TOKEN_URI, true, {
        value: MINT_PRICE,
      });
      const receipt = await tx.wait();

      expect(await avatarMinter.ownerOf(1)).to.equal(recipient);
      expect(await avatarMinter.tokenURI(1)).to.equal(SAMPLE_TOKEN_URI);
      expect(await avatarMinter.totalSupply()).to.equal(1);

      const metadata = await avatarMinter.getMetadata(1);
      expect(metadata.soulbound).to.be.true;
      expect(metadata.creator).to.equal(recipient);
      expect(metadata.timestamp).to.be.gt(0);

      const event = receipt.logs.find((log: any) => log.fragment?.name === "AvatarMinted");
      expect(event.args.recipient).to.equal(recipient);
      expect(event.args.tokenId).to.equal(1);
      expect(event.args.tokenURI).to.equal(SAMPLE_TOKEN_URI);
      expect(event.args.soulbound).to.be.true;
    });

    it("Should allow setting metadata after minting", async () => {
      const recipient = await addr1.getAddress();
      await avatarMinter.mintAvatar(recipient, SAMPLE_TOKEN_URI, true, {
        value: MINT_PRICE,
      });

      const attributes = sampleMetadata.attributes.map(attr => ({
        trait_type: attr.trait_type,
        value: attr.value
      }));

      await avatarMinter.setAvatarMetadata(
        1,
        sampleMetadata.name,
        sampleMetadata.description,
        sampleMetadata.image,
        sampleMetadata.external_url,
        attributes,
        sampleMetadata.animation_url
      );

      const metadata = await avatarMinter.getMetadata(1);
      expect(metadata.name).to.equal(sampleMetadata.name);
      expect(metadata.description).to.equal(sampleMetadata.description);
      expect(metadata.image).to.equal(sampleMetadata.image);
      expect(metadata.external_url).to.equal(sampleMetadata.external_url);
      expect(metadata.animation_url).to.equal(sampleMetadata.animation_url);
      expect(metadata.attributes.length).to.equal(2);
      expect(metadata.attributes[0].trait_type).to.equal("Background");
      expect(metadata.attributes[0].value).to.equal("Blue");
    });

    it("Should fail if insufficient payment", async () => {
      await expect(
        avatarMinter.mintAvatar(await addr1.getAddress(), SAMPLE_TOKEN_URI, true, {
          value: ethers.parseEther("0.005"),
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail if not owner", async () => {
      await expect(
        avatarMinter.connect(addr1).mintAvatar(await addr1.getAddress(), SAMPLE_TOKEN_URI, true, {
          value: MINT_PRICE,
        })
      ).to.be.revertedWithCustomError(avatarMinter, "OwnableUnauthorizedAccount");
    });

    it("Should fail if recipient is zero address", async () => {
      await expect(
        avatarMinter.mintAvatar(ethers.ZeroAddress, SAMPLE_TOKEN_URI, true, {
          value: MINT_PRICE,
        })
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should fail if token URI is empty", async () => {
      await expect(
        avatarMinter.mintAvatar(await addr1.getAddress(), "", true, {
          value: MINT_PRICE,
        })
      ).to.be.revertedWith("Token URI cannot be empty");
    });
  });

  describe("Soulbound Functionality", () => {
    it("Should prevent transfer of soulbound token", async () => {
      const addr1Addr = await addr1.getAddress();
      const addr2Addr = await addr2.getAddress();
      
      await avatarMinter.mintAvatar(addr1Addr, SAMPLE_TOKEN_URI, true, {
        value: MINT_PRICE,
      });

      await expect(
        avatarMinter.connect(addr1).transferFrom(addr1Addr, addr2Addr, 1)
      ).to.be.revertedWith("Soulbound tokens cannot be transferred");
    });

    it("Should allow transfer of non-soulbound token", async () => {
      const addr1Addr = await addr1.getAddress();
      const addr2Addr = await addr2.getAddress();
      
      await avatarMinter.mintAvatar(addr1Addr, SAMPLE_TOKEN_URI, false, {
        value: MINT_PRICE,
      });

      await avatarMinter.connect(addr1).transferFrom(addr1Addr, addr2Addr, 1);
      expect(await avatarMinter.ownerOf(1)).to.equal(addr2Addr);
    });
  });

  describe("Mint Price", () => {
    it("Should allow owner to update mint price", async () => {
      const newPrice = ethers.parseEther("0.02");
      await avatarMinter.setMintPrice(newPrice);
      expect(await avatarMinter.mintPrice()).to.equal(newPrice);
      
      await expect(
        avatarMinter.mintAvatar(await addr1.getAddress(), SAMPLE_TOKEN_URI, true, {
          value: MINT_PRICE,
        })
      ).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail if non-owner tries to update mint price", async () => {
      await expect(
        avatarMinter.connect(addr1).setMintPrice(ethers.parseEther("0.02"))
      ).to.be.revertedWithCustomError(avatarMinter, "OwnableUnauthorizedAccount");
    });
  });

  describe("Withdrawal", () => {
    it("Should allow owner to withdraw funds", async () => {
      await avatarMinter.mintAvatar(await addr1.getAddress(), SAMPLE_TOKEN_URI, true, {
        value: MINT_PRICE,
      });

      const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
      const tx = await avatarMinter.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await ethers.provider.getBalance(await owner.getAddress());

      expect(finalBalance).to.equal(initialBalance + MINT_PRICE - gasUsed);
    });

    it("Should fail if no funds to withdraw", async () => {
      await expect(avatarMinter.withdraw()).to.be.revertedWith("No funds to withdraw");
    });

    it("Should fail if non-owner tries to withdraw", async () => {
      await avatarMinter.mintAvatar(await addr1.getAddress(), SAMPLE_TOKEN_URI, true, {
        value: MINT_PRICE,
      });
      await expect(
        avatarMinter.connect(addr1).withdraw()
      ).to.be.revertedWithCustomError(avatarMinter, "OwnableUnauthorizedAccount");
    });
  });
});