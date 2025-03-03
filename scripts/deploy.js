const { ethers } = require("hardhat");

async function main() {
  const AvatarMinter = await ethers.getContractFactory("AvatarMinter");
  const myAvatarMinter = await AvatarMinter.deploy();
  await myAvatarMinter.deployed();

  console.log("Avatar deployed to:", myAvatarMinter.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
