// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReliefToken.sol";
import "./AccessControl.sol";

/**
 * @title ReliefDistribution
 * @dev Main contract for managing disaster relief distribution
 * Features:
 * - Beneficiary registration and approval
 * - Fund allocation and spending validation
 * - Vendor management and payment processing
 * - Emergency controls and system pause
 */
contract ReliefDistribution is Pausable, ReentrancyGuard {
    DisasterReliefAccessControl public accessControl;
    ReliefToken public reliefToken;
    
    // Essential spending categories
    mapping(string => bool) public essentialCategories;
    string[] public categoryList;
    
    // Beneficiary data
    struct Beneficiary {
        bool isApproved;
        uint256 allocatedAmount;
        uint256 spentAmount;
        string disasterType;
        string location;
        uint256 registrationTime;
        address approvedBy;
        bool isActive;
    }
    
    // Vendor data
    struct Vendor {
        bool isApproved;
        string businessName;
        string[] approvedCategories;
        uint256 totalReceived;
        uint256 registrationTime;
        address approvedBy;
        bool isActive;
    }
    
    // Purchase record
    struct Purchase {
        address beneficiary;
        address vendor;
        uint256 amount;
        string category;
        string description;
        uint256 timestamp;
        bool isValid;
    }
    
    // Donation record
    struct Donation {
        address donor;
        uint256 amount;
        string message;
        uint256 timestamp;
    }
    
    mapping(address => Beneficiary) public beneficiaries;
    mapping(address => Vendor) public vendors;
    mapping(bytes32 => Purchase) public purchases;
    mapping(bytes32 => Donation) public donations;
    
    address[] public beneficiaryList;
    address[] public vendorList;
    bytes32[] public purchaseList;
    bytes32[] public donationList;
    
    // Statistics
    uint256 public totalDonations;
    uint256 public totalAllocated;
    uint256 public totalSpent;
    uint256 public activeBeneficiaries;
    uint256 public activeVendors;
    
    // Events
    event DonationReceived(bytes32 indexed donationId, address indexed donor, uint256 amount, string message);
    event BeneficiaryRegistered(address indexed beneficiary, string disasterType, string location);
    event BeneficiaryApproved(address indexed beneficiary, uint256 amount, address indexed approver);
    event BeneficiaryDeactivated(address indexed beneficiary, address indexed deactivatedBy, string reason);
    event VendorRegistered(address indexed vendor, string businessName);
    event VendorApproved(address indexed vendor, address indexed approver);
    event VendorDeactivated(address indexed vendor, address indexed deactivatedBy, string reason);
    event FundsAllocated(address indexed beneficiary, uint256 amount);
    event PurchaseProcessed(bytes32 indexed purchaseId, address indexed beneficiary, address indexed vendor, uint256 amount, string category);
    event CategoryAdded(string category, address indexed addedBy);
    event CategoryRemoved(string category, address indexed removedBy);
    event SuspiciousActivityFlagged(address indexed flaggedAddress, string reason, address indexed flaggedBy);
    
    /**
     * @dev Constructor sets up the contract with initial parameters
     * @param _accessControl Address of the access control contract
     * @param _reliefToken Address of the ReliefToken contract
     */
    constructor(address _accessControl, address _reliefToken) {
        require(_accessControl != address(0), "Access control cannot be zero address");
        require(_reliefToken != address(0), "Relief token cannot be zero address");
        
        accessControl = DisasterReliefAccessControl(_accessControl);
        reliefToken = ReliefToken(_reliefToken);
        
        // Initialize essential categories
        _addEssentialCategory("food");
        _addEssentialCategory("medicine");
        _addEssentialCategory("shelter");
        _addEssentialCategory("clothing");
        _addEssentialCategory("water");
    }
    
    /**
     * @dev Process a donation to the relief fund
     * @param amount Amount to donate
     * @param message Optional message from donor
     */
    function donate(uint256 amount, string memory message) 
        public 
        whenNotPaused 
        nonReentrant 
    {
        require(amount > 0, "Donation amount must be positive");
        require(reliefToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Transfer tokens to this contract
        require(
            reliefToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        // Create donation record
        bytes32 donationId = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp, donationList.length));
        donations[donationId] = Donation({
            donor: msg.sender,
            amount: amount,
            message: message,
            timestamp: block.timestamp
        });
        
        donationList.push(donationId);
        totalDonations += amount;
        
        emit DonationReceived(donationId, msg.sender, amount, message);
    }
    
    /**
     * @dev Register as a beneficiary
     * @param disasterType Type of disaster affected by
     * @param location Location of the beneficiary
     */
    function registerBeneficiary(string memory disasterType, string memory location) 
        public 
        whenNotPaused 
    {
        require(!beneficiaries[msg.sender].isApproved, "Already registered and approved");
        require(bytes(disasterType).length > 0, "Disaster type required");
        require(bytes(location).length > 0, "Location required");
        
        beneficiaries[msg.sender] = Beneficiary({
            isApproved: false,
            allocatedAmount: 0,
            spentAmount: 0,
            disasterType: disasterType,
            location: location,
            registrationTime: block.timestamp,
            approvedBy: address(0),
            isActive: true
        });
        
        beneficiaryList.push(msg.sender);
        emit BeneficiaryRegistered(msg.sender, disasterType, location);
    }
    
    /**
     * @dev Approve a beneficiary and allocate funds
     * @param beneficiary Address of the beneficiary to approve
     * @param amount Amount to allocate
     */
    function approveBeneficiary(address beneficiary, uint256 amount) 
        public 
        whenNotPaused 
    {
        require(accessControl.isVerifier(msg.sender) || accessControl.isAdmin(msg.sender), "Only verifier or admin");
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Amount must be positive");
        require(!beneficiaries[beneficiary].isApproved, "Already approved");
        require(beneficiaries[beneficiary].isActive, "Beneficiary not active");
        
        // Check if contract has enough balance
        require(reliefToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        beneficiaries[beneficiary].isApproved = true;
        beneficiaries[beneficiary].allocatedAmount = amount;
        beneficiaries[beneficiary].approvedBy = msg.sender;
        
        // Grant beneficiary role
        accessControl.grantRoleWithReason(
            accessControl.BENEFICIARY_ROLE(),
            beneficiary,
            "Approved for disaster relief"
        );
        
        // Transfer tokens to beneficiary
        require(reliefToken.transfer(beneficiary, amount), "Token transfer failed");
        
        totalAllocated += amount;
        activeBeneficiaries++;
        
        emit BeneficiaryApproved(beneficiary, amount, msg.sender);
        emit FundsAllocated(beneficiary, amount);
    }
    
    /**
     * @dev Register as a vendor
     * @param businessName Name of the business
     */
    function registerVendor(string memory businessName) 
        public 
        whenNotPaused 
    {
        require(!vendors[msg.sender].isApproved, "Already registered and approved");
        require(bytes(businessName).length > 0, "Business name required");
        
        vendors[msg.sender] = Vendor({
            isApproved: false,
            businessName: businessName,
            approvedCategories: new string[](0),
            totalReceived: 0,
            registrationTime: block.timestamp,
            approvedBy: address(0),
            isActive: true
        });
        
        vendorList.push(msg.sender);
        emit VendorRegistered(msg.sender, businessName);
    }
    
    /**
     * @dev Approve a vendor for specific categories
     * @param vendor Address of the vendor to approve
     * @param categories Categories the vendor is approved for
     */
    function approveVendor(address vendor, string[] memory categories) 
        public 
        whenNotPaused 
    {
        require(accessControl.isVerifier(msg.sender) || accessControl.isAdmin(msg.sender), "Only verifier or admin");
        require(vendor != address(0), "Invalid vendor address");
        require(categories.length > 0, "At least one category required");
        require(!vendors[vendor].isApproved, "Already approved");
        require(vendors[vendor].isActive, "Vendor not active");
        
        // Validate all categories are essential
        for (uint i = 0; i < categories.length; i++) {
            require(essentialCategories[categories[i]], "Invalid category");
        }
        
        vendors[vendor].isApproved = true;
        vendors[vendor].approvedCategories = categories;
        vendors[vendor].approvedBy = msg.sender;
        
        // Grant vendor role
        accessControl.grantRoleWithReason(
            accessControl.VENDOR_ROLE(),
            vendor,
            "Approved vendor for disaster relief"
        );
        
        activeVendors++;
        
        emit VendorApproved(vendor, msg.sender);
    }
    
    /**
     * @dev Process a purchase from beneficiary to vendor
     * @param vendor Address of the vendor
     * @param amount Amount to pay
     * @param category Category of the purchase
     * @param description Description of the purchase
     */
    function processPurchase(
        address vendor,
        uint256 amount,
        string memory category,
        string memory description
    ) 
        public 
        whenNotPaused 
        nonReentrant 
    {
        require(accessControl.isBeneficiary(msg.sender), "Only approved beneficiaries");
        require(vendors[vendor].isApproved && vendors[vendor].isActive, "Vendor not approved or inactive");
        require(amount > 0, "Amount must be positive");
        require(essentialCategories[category], "Invalid category");
        require(_isVendorApprovedForCategory(vendor, category), "Vendor not approved for category");
        require(reliefToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Check if beneficiary has enough allocated funds
        Beneficiary storage beneficiary = beneficiaries[msg.sender];
        require(beneficiary.isApproved && beneficiary.isActive, "Beneficiary not approved or inactive");
        require(beneficiary.spentAmount + amount <= beneficiary.allocatedAmount, "Exceeds allocated amount");
        
        // Process the payment - distribution contract transfers from beneficiary to vendor
        require(
            reliefToken.transferFrom(msg.sender, vendor, amount), 
            "Token transfer failed"
        );
        
        // Update records
        beneficiary.spentAmount += amount;
        vendors[vendor].totalReceived += amount;
        totalSpent += amount;
        
        // Create purchase record
        bytes32 purchaseId = keccak256(abi.encodePacked(msg.sender, vendor, amount, block.timestamp, purchaseList.length));
        purchases[purchaseId] = Purchase({
            beneficiary: msg.sender,
            vendor: vendor,
            amount: amount,
            category: category,
            description: description,
            timestamp: block.timestamp,
            isValid: true
        });
        
        purchaseList.push(purchaseId);
        
        emit PurchaseProcessed(purchaseId, msg.sender, vendor, amount, category);
    }
    
    /**
     * @dev Add an essential category
     * @param category Category to add
     */
    function addEssentialCategory(string memory category) 
        public 
    {
        require(accessControl.isAdmin(msg.sender), "Only admin can add categories");
        _addEssentialCategory(category);
        emit CategoryAdded(category, msg.sender);
    }
    
    /**
     * @dev Remove an essential category
     * @param category Category to remove
     */
    function removeEssentialCategory(string memory category) 
        public 
    {
        require(accessControl.isAdmin(msg.sender), "Only admin can remove categories");
        require(essentialCategories[category], "Category does not exist");
        
        essentialCategories[category] = false;
        
        // Remove from category list
        for (uint i = 0; i < categoryList.length; i++) {
            if (keccak256(bytes(categoryList[i])) == keccak256(bytes(category))) {
                categoryList[i] = categoryList[categoryList.length - 1];
                categoryList.pop();
                break;
            }
        }
        
        emit CategoryRemoved(category, msg.sender);
    }
    
    /**
     * @dev Flag suspicious activity
     * @param flaggedAddress Address to flag
     * @param reason Reason for flagging
     */
    function flagSuspiciousActivity(address flaggedAddress, string memory reason) 
        public 
    {
        require(accessControl.isVerifier(msg.sender) || accessControl.isAdmin(msg.sender), "Only verifier or admin");
        require(flaggedAddress != address(0), "Invalid address");
        require(bytes(reason).length > 0, "Reason required");
        
        emit SuspiciousActivityFlagged(flaggedAddress, reason, msg.sender);
    }
    
    /**
     * @dev Deactivate a beneficiary
     * @param beneficiary Address to deactivate
     * @param reason Reason for deactivation
     */
    function deactivateBeneficiary(address beneficiary, string memory reason) 
        public 
    {
        require(accessControl.isVerifier(msg.sender) || accessControl.isAdmin(msg.sender), "Only verifier or admin");
        require(beneficiaries[beneficiary].isActive, "Already inactive");
        
        beneficiaries[beneficiary].isActive = false;
        if (beneficiaries[beneficiary].isApproved) {
            activeBeneficiaries--;
        }
        
        emit BeneficiaryDeactivated(beneficiary, msg.sender, reason);
    }
    
    /**
     * @dev Deactivate a vendor
     * @param vendor Address to deactivate
     * @param reason Reason for deactivation
     */
    function deactivateVendor(address vendor, string memory reason) 
        public 
    {
        require(accessControl.isVerifier(msg.sender) || accessControl.isAdmin(msg.sender), "Only verifier or admin");
        require(vendors[vendor].isActive, "Already inactive");
        
        vendors[vendor].isActive = false;
        if (vendors[vendor].isApproved) {
            activeVendors--;
        }
        
        emit VendorDeactivated(vendor, msg.sender, reason);
    }
    
    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() public {
        require(accessControl.canPause(msg.sender), "Caller cannot pause contract");
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() public {
        require(accessControl.canPause(msg.sender), "Caller cannot unpause contract");
        _unpause();
    }
    
    /**
     * @dev Get system statistics
     */
    function getSystemStats() 
        public 
        view 
        returns (
            uint256 _totalDonations,
            uint256 _totalAllocated,
            uint256 _totalSpent,
            uint256 _activeBeneficiaries,
            uint256 _activeVendors,
            uint256 _contractBalance
        ) 
    {
        return (
            totalDonations,
            totalAllocated,
            totalSpent,
            activeBeneficiaries,
            activeVendors,
            reliefToken.balanceOf(address(this))
        );
    }
    
    /**
     * @dev Get beneficiary count
     */
    function getBeneficiaryCount() public view returns (uint256) {
        return beneficiaryList.length;
    }
    
    /**
     * @dev Get vendor count
     */
    function getVendorCount() public view returns (uint256) {
        return vendorList.length;
    }
    
    /**
     * @dev Get purchase count
     */
    function getPurchaseCount() public view returns (uint256) {
        return purchaseList.length;
    }
    
    /**
     * @dev Get donation count
     */
    function getDonationCount() public view returns (uint256) {
        return donationList.length;
    }
    
    /**
     * @dev Get all essential categories
     */
    function getEssentialCategories() public view returns (string[] memory) {
        return categoryList;
    }
    
    /**
     * @dev Get vendor's approved categories
     */
    function getVendorCategories(address vendor) public view returns (string[] memory) {
        return vendors[vendor].approvedCategories;
    }
    
    // Internal functions
    
    function _addEssentialCategory(string memory category) internal {
        require(!essentialCategories[category], "Category already exists");
        require(bytes(category).length > 0, "Category cannot be empty");
        
        essentialCategories[category] = true;
        categoryList.push(category);
    }
    
    function _isVendorApprovedForCategory(address vendor, string memory category) 
        internal 
        view 
        returns (bool) 
    {
        string[] memory approvedCategories = vendors[vendor].approvedCategories;
        for (uint i = 0; i < approvedCategories.length; i++) {
            if (keccak256(bytes(approvedCategories[i])) == keccak256(bytes(category))) {
                return true;
            }
        }
        return false;
    }
}