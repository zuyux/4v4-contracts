// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AvatarMinter is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIds;
    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public mintPrice = 0.01 ether;

    event AvatarMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        string tokenURI,
        bool soulbound
    );

    // Adjusted struct to match sample metadata
    struct AvatarMetadata {
        string name;
        string description;
        string image;
        string external_url;
        Attribute[] attributes;
        string animation_url;
        address creator;
        bool soulbound;
        uint256 timestamp;
    }

    // Separate struct for attributes to match JSON format
    struct Attribute {
        string trait_type;
        string value;
    }

    mapping(uint256 => AvatarMetadata) public tokenMetadata;

    constructor() ERC721("4V4Avatar", "4V4A") Ownable(msg.sender) {
        _tokenIds = 0;
    }

    function mintAvatar(
        address recipient,
        string memory tokenURI,
        bool soulbound
    ) external payable onlyOwner nonReentrant returns (uint256) {
        require(recipient != address(0), "Cannot mint to zero address");
        require(_tokenIds < MAX_SUPPLY, "Maximum supply reached");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");
        require(msg.value >= mintPrice, "Insufficient payment");

        _tokenIds += 1;
        uint256 newItemId = _tokenIds;

        _safeMint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        tokenMetadata[newItemId].soulbound = soulbound;
        tokenMetadata[newItemId].creator = recipient;
        tokenMetadata[newItemId].timestamp = block.timestamp;

        emit AvatarMinted(recipient, newItemId, tokenURI, soulbound);

        return newItemId;
    }

    function setAvatarMetadata(
        uint256 tokenId,
        string memory name,
        string memory description,
        string memory image,
        string memory external_url,
        Attribute[] memory attributes,
        string memory animation_url
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        AvatarMetadata storage metadata = tokenMetadata[tokenId];
        metadata.name = name;
        metadata.description = description;
        metadata.image = image;
        metadata.external_url = external_url;
        metadata.animation_url = animation_url;
        
        // Clear existing attributes and set new ones
        delete metadata.attributes;
        for (uint256 i = 0; i < attributes.length; i++) {
            metadata.attributes.push(attributes[i]);
        }
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "Failed to send Ether");
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }

    function getMetadata(uint256 tokenId) external view returns (AvatarMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenMetadata[tokenId];
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0) && to != address(0) && tokenMetadata[tokenId].soulbound) {
            revert("Soulbound tokens cannot be transferred");
        }
        
        return super._update(to, tokenId, auth);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return "";
    }
}