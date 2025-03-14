// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const AvatarMinter = await hre.ethers.getContractFactory("AvatarMinter");
  const avatarMinter = await AvatarMinter.deploy();

  await avatarMinter.waitForDeployment();

  console.log("AvatarMinter deployed to:", await avatarMinter.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});