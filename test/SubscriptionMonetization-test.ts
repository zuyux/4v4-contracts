import { ethers } from "hardhat";
import { expect } from "chai";
import { ContractFactory, Contract, Signer } from "ethers";

describe("SubscriptionMonetization Contract", () => {
  let SubscriptionMonetization: ContractFactory;
  let subscription: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  const SUBSCRIPTION_AMOUNT = ethers.parseEther("0.1"); // 0.1 ETH
  const DURATION = 30 * 24 * 60 * 60; // 30 days in seconds
  const FEATURE_ID = 1;
  const FEATURE_PRICE = ethers.parseEther("0.05"); // 0.05 ETH

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    SubscriptionMonetization = await ethers.getContractFactory("SubscriptionMonetization");
    const subscriptionDeploy = await SubscriptionMonetization.deploy();
    subscription = await subscriptionDeploy.waitForDeployment();
  });

  describe("Deployment", () => {
    it("Should deploy correctly and set owner", async () => {
      expect(await subscription.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("Subscriptions", () => {
    it("Should allow subscribing", async () => {
      const addr1Addr = await addr1.getAddress();
      const tx = await subscription.subscribe(addr1Addr, DURATION, SUBSCRIPTION_AMOUNT, {
        value: SUBSCRIPTION_AMOUNT,
      });
      const receipt = await tx.wait();

      const [expiry] = await subscription.getSubscriptionDetails(addr1Addr);
      expect(await subscription.checkSubscriptionStatus(addr1Addr)).to.be.true;
      expect(expiry).to.be.closeTo(
        BigInt(Math.floor(Date.now() / 1000) + DURATION),
        300 // Increased to 300 seconds (5 minutes) variance
      );

      const event = receipt.logs.find((log: any) => log.fragment?.name === "Subscribed");
      expect(event.args.user).to.equal(addr1Addr);
      expect(event.args.amount).to.equal(SUBSCRIPTION_AMOUNT);
    });

    it("Should extend existing subscription", async () => {
      const addr1Addr = await addr1.getAddress();
      await subscription.subscribe(addr1Addr, DURATION, SUBSCRIPTION_AMOUNT, {
        value: SUBSCRIPTION_AMOUNT,
      });
      const [initialExpiry] = await subscription.getSubscriptionDetails(addr1Addr);

      await subscription.subscribe(addr1Addr, DURATION, SUBSCRIPTION_AMOUNT, {
        value: SUBSCRIPTION_AMOUNT,
      });
      const [newExpiry] = await subscription.getSubscriptionDetails(addr1Addr);

      expect(newExpiry).to.be.closeTo(initialExpiry + BigInt(DURATION), 300);
    });

    it("Should fail if payment amount incorrect", async () => {
      await expect(
        subscription.subscribe(await addr1.getAddress(), DURATION, SUBSCRIPTION_AMOUNT, {
          value: ethers.parseEther("0.05"), // Less than required
        })
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should fail if duration is zero", async () => {
      await expect(
        subscription.subscribe(await addr1.getAddress(), 0, SUBSCRIPTION_AMOUNT, {
          value: SUBSCRIPTION_AMOUNT,
        })
      ).to.be.revertedWith("Duration must be greater than zero");
    });
  });

  describe("Feature Payments", () => {
    beforeEach(async () => {
      await subscription.setFeaturePrice(FEATURE_ID, FEATURE_PRICE);
    });

    it("Should allow paying for a feature", async () => {
      const addr1Addr = await addr1.getAddress();
      const tx = await subscription.payForFeature(addr1Addr, FEATURE_ID, FEATURE_PRICE, {
        value: FEATURE_PRICE,
      });
      const receipt = await tx.wait();

      const event = receipt.logs.find((log: any) => log.fragment?.name === "FeaturePaid");
      expect(event.args.user).to.equal(addr1Addr);
      expect(event.args.featureId).to.equal(FEATURE_ID);
      expect(event.args.amount).to.equal(FEATURE_PRICE);
    });

    it("Should fail if feature not available", async () => {
      await expect(
        subscription.payForFeature(await addr1.getAddress(), 999, FEATURE_PRICE, {
          value: FEATURE_PRICE,
        })
      ).to.be.revertedWith("Feature not available");
    });

    it("Should fail if payment amount insufficient", async () => {
      await expect(
        subscription.payForFeature(await addr1.getAddress(), FEATURE_ID, FEATURE_PRICE, {
          value: ethers.parseEther("0.01"), // Less than price
        })
      ).to.be.revertedWith("Incorrect payment amount");
    });
  });

  describe("Feature Price Management", () => {
    it("Should allow owner to set feature price", async () => {
      await subscription.setFeaturePrice(FEATURE_ID, FEATURE_PRICE);
      expect(await subscription.featurePrices(FEATURE_ID)).to.equal(FEATURE_PRICE);
    });

    it("Should fail if non-owner tries to set price", async () => {
      await expect(
        subscription.connect(addr1).setFeaturePrice(FEATURE_ID, FEATURE_PRICE)
      ).to.be.revertedWithCustomError(subscription, "OwnableUnauthorizedAccount");
    });
  });

  describe("Withdrawal", () => {
    it("Should allow owner to withdraw funds", async () => {
      await subscription.subscribe(await addr1.getAddress(), DURATION, SUBSCRIPTION_AMOUNT, {
        value: SUBSCRIPTION_AMOUNT,
      });
      
      const initialBalance = await ethers.provider.getBalance(await owner.getAddress());
      const tx = await subscription.withdraw();
      const receipt = await tx.wait();
      
      const gasCost = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await ethers.provider.getBalance(await owner.getAddress());
      
      expect(finalBalance).to.equal(initialBalance + SUBSCRIPTION_AMOUNT - gasCost);
    });

    it("Should fail if no funds to withdraw", async () => {
      await expect(subscription.withdraw()).to.be.revertedWith("No funds to withdraw");
    });

    it("Should fail if non-owner tries to withdraw", async () => {
      await subscription.subscribe(await addr1.getAddress(), DURATION, SUBSCRIPTION_AMOUNT, {
        value: SUBSCRIPTION_AMOUNT,
      });
      await expect(
        subscription.connect(addr1).withdraw()
      ).to.be.revertedWithCustomError(subscription, "OwnableUnauthorizedAccount");
    });
  });
});