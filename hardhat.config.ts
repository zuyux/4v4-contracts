import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://scroll-sepolia.g.alchemy.com/v2/S2beFNr_vQ-flhSczWB-q6cOkHDbNlRf",
      accounts: ["0x4e0da662d81daee3e5eb2c845f4d2d960bb43d2d048f78f33f92c2882603f895"]
    },  }
};

export default config;
