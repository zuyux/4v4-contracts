const { ethers } = require("hardhat");

async function main() {
  const My4V4 = await ethers.getContractFactory("my4v4");
  const my4V4 = await My4V4.deploy();
  await my4V4.deployed();

  console.log("MyNFT deployed to:", my4V4.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
