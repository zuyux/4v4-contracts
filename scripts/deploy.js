// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy AvatarNFT (Ejemplo, necesitas reemplazar con tu contrato ERC721)
    const AvatarNFT = await hre.ethers.getContractFactory("MockERC721");
    const avatarNFT = await AvatarNFT.deploy("AvatarNFT", "AVT");
    await avatarNFT.deployed();

    console.log("AvatarNFT deployed to:", avatarNFT.address);
    
    // Deploy AccessoryNFT (Ejemplo, necesitas reemplazar con tu contrato ERC1155)
    const AccessoryNFT = await hre.ethers.getContractFactory("MockERC1155");
    const accessoryNFT = await AccessoryNFT.deploy();
    await accessoryNFT.deployed();

    console.log("AccessoryNFT deployed to:", accessoryNFT.address);

  // Deploy Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(avatarNFT.address, accessoryNFT.address);

  await marketplace.deployed();

  console.log("Marketplace deployed to:", marketplace.address);

  // Deploy SubscriptionMonetization
  const SubscriptionMonetization = await hre.ethers.getContractFactory("SubscriptionMonetization");
  const subscriptionMonetization = await SubscriptionMonetization.deploy();

  await subscriptionMonetization.deployed();

  console.log("SubscriptionMonetization deployed to:", subscriptionMonetization.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });