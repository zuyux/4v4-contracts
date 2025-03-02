// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SubscriptionMonetization is Ownable, ReentrancyGuard {
    struct Subscription {
        uint256 expiry;      // Timestamp when subscription expires
        uint256 amountPaid;  // Total amount paid for the subscription
    }

    // User subscriptions
    mapping(address => Subscription) public subscriptions;
    
    // Feature prices (featureId => price in wei)
    mapping(uint256 => uint256) public featurePrices;
    
    // Events
    event Subscribed(address indexed user, uint256 duration, uint256 amount, uint256 expiry);
    event FeaturePaid(address indexed user, uint256 indexed featureId, uint256 amount);
    event FeaturePriceSet(uint256 indexed featureId, uint256 price);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Subscribe or renew subscription
     * @param user Address of the subscriber
     * @param duration Duration in seconds to extend subscription
     * @param amount Amount to pay in wei
     */
    function subscribe(address user, uint256 duration, uint256 amount) 
        external payable nonReentrant {
        require(user != address(0), "Invalid user address");
        require(duration > 0, "Duration must be greater than zero");
        require(msg.value == amount, "Incorrect payment amount");

        Subscription storage sub = subscriptions[user];
        uint256 newExpiry = block.timestamp + duration;
        
        // If existing subscription is active, extend it; otherwise start new
        if (sub.expiry > block.timestamp) {
            newExpiry = sub.expiry + duration;
        }
        
        subscriptions[user] = Subscription({
            expiry: newExpiry,
            amountPaid: sub.amountPaid + amount
        });

        emit Subscribed(user, duration, amount, newExpiry);
    }

    /**
     * @dev Pay for a specific premium feature
     * @param user Address of the user
     * @param featureId ID of the feature to unlock
     * @param amount Amount to pay in wei
     */
    function payForFeature(address user, uint256 featureId, uint256 amount) 
        external payable nonReentrant {
        require(user != address(0), "Invalid user address");
        require(featurePrices[featureId] > 0, "Feature not available");
        require(msg.value == amount && amount >= featurePrices[featureId], 
            "Incorrect payment amount");

        emit FeaturePaid(user, featureId, amount);
    }

    /**
     * @dev Check if a user's subscription is active
     * @param user Address to check
     * @return bool Whether the subscription is active
     */
    function checkSubscriptionStatus(address user) external view returns (bool) {
        return subscriptions[user].expiry > block.timestamp;
    }

    /**
     * @dev Set price for a premium feature
     * @param featureId ID of the feature
     * @param price Price in wei
     */
    function setFeaturePrice(uint256 featureId, uint256 price) external onlyOwner {
        featurePrices[featureId] = price;
        emit FeaturePriceSet(featureId, price);
    }

    /**
     * @dev Withdraw contract balance to owner
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "Failed to send Ether");
        
        emit FundsWithdrawn(owner(), balance);
    }

    function getSubscriptionDetails(address user) 
        external view returns (uint256 expiry, uint256 amountPaid) {
        Subscription memory sub = subscriptions[user];
        return (sub.expiry, sub.amountPaid);
    }
}