// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AvatarAccessories is ERC1155, Ownable, ReentrancyGuard {
    // Mapping to store accessory metadata URIs
    mapping(uint256 => string) private _accessoryURIs;
    
    // Mapping to track which accessories are equipped to which avatars
    // avatarId => accessoryId => isEquipped
    mapping(uint256 => mapping(uint256 => bool)) public equippedAccessories;

    // Events
    event AccessoryMinted(uint256 indexed id, uint256 amount, string metadataURI);
    event AccessoryEquipped(uint256 indexed avatarId, uint256 indexed accessoryId);
    event AccessoryUnequipped(uint256 indexed avatarId, uint256 indexed accessoryId);
    event BatchTransferred(address indexed operator, address[] recipients, uint256[] accessoryIds);

    constructor() ERC1155("") Ownable(msg.sender) {}

    /**
     * @dev Mint new accessories
     * @param id Accessory type ID
     * @param amount Number of accessories to mint
     * @param metadataURI URI for accessory metadata
     */
    function mintAccessory(
        uint256 id,
        uint256 amount,
        string memory metadataURI
    ) external onlyOwner {
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");
        require(bytes(_accessoryURIs[id]).length == 0, "Accessory ID already exists");

        _mint(msg.sender, id, amount, "");
        _accessoryURIs[id] = metadataURI;

        emit AccessoryMinted(id, amount, metadataURI);
    }

    /**
     * @dev Equip an accessory to an avatar
     * @param avatarId The avatar NFT ID
     * @param accessoryId The accessory ID to equip
     */
    function equipAccessory(uint256 avatarId, uint256 accessoryId) external nonReentrant {
        require(balanceOf(msg.sender, accessoryId) > 0, "Caller does not own accessory");
        require(!equippedAccessories[avatarId][accessoryId], "Accessory already equipped");

        equippedAccessories[avatarId][accessoryId] = true;
        emit AccessoryEquipped(avatarId, accessoryId);
    }

    /**
     * @dev Unequip an accessory from an avatar
     * @param avatarId The avatar NFT ID
     * @param accessoryId The accessory ID to unequip
     */
    function unequipAccessory(uint256 avatarId, uint256 accessoryId) external nonReentrant {
        require(balanceOf(msg.sender, accessoryId) > 0, "Caller does not own accessory");
        require(equippedAccessories[avatarId][accessoryId], "Accessory not equipped");

        equippedAccessories[avatarId][accessoryId] = false;
        emit AccessoryUnequipped(avatarId, accessoryId);
    }

    /**
     * @dev Batch transfer accessories to multiple recipients
     * @param recipients Array of recipient addresses
     * @param accessoryIds Array of accessory IDs
     * @param amounts Array of amounts to transfer
     */
    function batchTransfer(
        address[] memory recipients,
        uint256[] memory accessoryIds,
        uint256[] memory amounts
    ) external nonReentrant {
        require(recipients.length == accessoryIds.length && recipients.length == amounts.length, 
            "Array lengths must match");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Cannot transfer to zero address");
            require(amounts[i] <= balanceOf(msg.sender, accessoryIds[i]), "Insufficient balance");
            
            _safeTransferFrom(msg.sender, recipients[i], accessoryIds[i], amounts[i], "");
        }

        emit BatchTransferred(msg.sender, recipients, accessoryIds);
    }

    /**
     * @dev Get accessory metadata URI
     * @param accessoryId The accessory ID
     */
    function uri(uint256 accessoryId) public view virtual override returns (string memory) {
        return _accessoryURIs[accessoryId];
    }

    /**
     * @dev Check if an accessory is equipped to an avatar
     * @param avatarId The avatar ID
     * @param accessoryId The accessory ID
     */
    function isAccessoryEquipped(uint256 avatarId, uint256 accessoryId) 
        external view returns (bool) {
        return equippedAccessories[avatarId][accessoryId];
    }
}