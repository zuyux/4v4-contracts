// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is Ownable, ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        address currency; // Address(0) for ETH, ERC20 token address otherwise
        bool isAuction;
        bool active;
        uint256 highestBid;
        address highestBidder;
        address creator; // Added to track original creator for royalties
        bool isERC721; // Added to distinguish between ERC-721 and ERC-1155
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public royalties; // tokenId => royalty percentage
    uint256 public listingCount;

    IERC721 public avatarNFT;
    IERC1155 public accessoryNFT;

    event ItemListed(uint256 indexed listingId, address indexed seller, uint256 tokenId, uint256 price, bool isAuction);
    event ItemSold(uint256 indexed listingId, address indexed buyer, uint256 amount);
    event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount);
    event SaleFinalized(uint256 indexed listingId, address indexed buyer, uint256 amount);
    event RoyaltySet(uint256 indexed tokenId, uint256 percentage);

    constructor(address _avatarNFT, address _accessoryNFT) Ownable(msg.sender) {
        avatarNFT = IERC721(_avatarNFT);
        accessoryNFT = IERC1155(_accessoryNFT);
    }

    function listItem(
        uint256 tokenId,
        uint256 price,
        address currency,
        bool isAuction
    ) external nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than zero");
        bool isERC721 = avatarNFT.ownerOf(tokenId) == msg.sender;
        require(isERC721 || accessoryNFT.balanceOf(msg.sender, tokenId) > 0, 
            "Caller does not own item");

        listingCount++;
        listings[listingCount] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            currency: currency,
            isAuction: isAuction,
            active: true,
            highestBid: 0,
            highestBidder: address(0),
            creator: msg.sender, // Store the original creator
            isERC721: isERC721
        });

        // Transfer NFT to marketplace
        if (isERC721) {
            avatarNFT.transferFrom(msg.sender, address(this), tokenId);
        } else {
            accessoryNFT.safeTransferFrom(msg.sender, address(this), tokenId, 1, "");
        }

        emit ItemListed(listingCount, msg.sender, tokenId, price, isAuction);
        return listingCount;
    }

    function buyItem(uint256 listingId, uint256 amount) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(!listing.isAuction, "Item is in auction");
        require(msg.value == amount && amount >= listing.price, "Incorrect payment amount");

        listing.active = false;
        address seller = listing.seller;
        uint256 tokenId = listing.tokenId;

        // Handle royalty
        uint256 royaltyAmount = (amount * royalties[tokenId]) / 100;
        uint256 sellerAmount = amount - royaltyAmount;

        // Transfer funds
        if (royaltyAmount > 0 && listing.creator != address(0)) {
            payable(listing.creator).transfer(royaltyAmount);
        }
        payable(seller).transfer(sellerAmount);

        // Transfer NFT
        if (listing.isERC721) {
            avatarNFT.transferFrom(address(this), msg.sender, tokenId);
        } else {
            accessoryNFT.safeTransferFrom(address(this), msg.sender, tokenId, 1, "");
        }

        emit ItemSold(listingId, msg.sender, amount);
    }

    function placeBid(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.isAuction, "Item not in auction");
        require(msg.value > listing.highestBid, "Bid must be higher than current highest");

        // Refund previous bidder
        if (listing.highestBidder != address(0)) {
            payable(listing.highestBidder).transfer(listing.highestBid);
        }

        listing.highestBid = msg.value;
        listing.highestBidder = msg.sender;

        emit BidPlaced(listingId, msg.sender, msg.value);
    }

    function finalizeSale(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.isAuction, "Item not in auction");
        require(listing.highestBidder != address(0), "No bids placed");
        require(msg.sender == listing.seller || msg.sender == listing.highestBidder, 
            "Only seller or highest bidder can finalize");

        listing.active = false;
        address buyer = listing.highestBidder;
        uint256 amount = listing.highestBid;
        uint256 tokenId = listing.tokenId;

        // Handle royalty
        uint256 royaltyAmount = (amount * royalties[tokenId]) / 100;
        uint256 sellerAmount = amount - royaltyAmount;

        // Transfer funds
        if (royaltyAmount > 0 && listing.creator != address(0)) {
            payable(listing.creator).transfer(royaltyAmount);
        }
        payable(listing.seller).transfer(sellerAmount);

        // Transfer NFT
        if (listing.isERC721) {
            avatarNFT.transferFrom(address(this), buyer, tokenId);
        } else {
            accessoryNFT.safeTransferFrom(address(this), buyer, tokenId, 1, "");
        }

        emit SaleFinalized(listingId, buyer, amount);
    }

    function setRoyalty(uint256 tokenId, uint256 percentage) external onlyOwner {
        require(percentage <= 100, "Royalty percentage too high");
        royalties[tokenId] = percentage;
        emit RoyaltySet(tokenId, percentage);
    }

    function onERC1155Received(
        address, address, uint256, uint256, bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
}