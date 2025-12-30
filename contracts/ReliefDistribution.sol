// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReliefToken.sol";

/**
 * @title ReliefDistribution
 * @dev Main contract for managing disaster relief distribution
 * Features:
 * - Beneficiary registration and approval
 * - Fund allocation and spending validation
 * - Vendor management and payment processing
 * - Emergency controls and system pause
 */
contract ReliefDistribution is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant BENEFICIARY_ROLE = keccak256("BENEFICIARY_ROLE");
    bytes32 public constant VENDOR_ROLE = keccak256("VENDOR_ROLE");
    
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
    }
    
    // Vendor data
    struct Vendor {
        bool isApproved;
        string businessName;
        string[] approvedCategories;
        uint256 totalReceived;
        uint256 registrationTime;
        address approvedBy;
    }
    
    // Purchase record
    struct Purchase {
        address beneficiary;
        address vendor;
        uint256 amount;
        string category;
        string description;
        uint256 timestamp;
    }
    
    mapping(address => Beneficiary) public beneficiaries;
    mapping(address => Vendor) public vendors;
    mapping(bytes32 => Purchase) public purchases;
    
    address[] public beneficiaryList;
    address[] public vendorList;
    bytes32[] public purchaseList;
    
    // Events
    event BeneficiaryRegistered(address indexed beneficiary, string disasterType, string location);
    event BeneficiaryApproved(address indexed beneficiary, uint256 amount, address indexed approver);
    event VendorRegistered(address indexed vendor, string businessName);
    event VendorApproved(address indexed vendor, address indexed approver);
    event FundsAllocated(address indexed beneficiary, uint256 amount);
    event PurchaseProcessed(bytes32 indexed purchaseId, address indexed beneficiary, address indexed vendor, uint256 amount, string category);
    event CategoryAdded(string category);
    event CategoryRemoved(string category);
    
    /**
     * @dev Constructor sets up the contract with initial parameters
     * @param _reliefToken Address of the ReliefToken contract
     * @param admin Address that will have admin role
     */
    constructor(address _reliefToken, address admin) {
        reliefToken = ReliefToken(_reliefToken);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        
        // Initialize essential categories
        _addEssentialCategory("food");
        _addEssentialCategory("medicine");
        _addEssentialCategory("shelter");
        _addEssentialCategory("clothing");
        _addEssentialCategory("water");
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
            approvedBy: address(0)
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
        onlyRole(VERIFIER_ROLE) 
        whenNotPaused 
    {
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(amount > 0, "Amount must be positive");
        require(!beneficiaries[beneficiary].isApproved, "Already approved");
        
        beneficiaries[beneficiary].isApproved = true;
        beneficiaries[beneficiary].allocatedAmount = amount;
        beneficiaries[beneficiary].approvedBy = msg.sender;
        
        _grantRole(BENEFICIARY_ROLE, beneficiary);
        
        // Mint tokens for the beneficiary
        reliefToken.mint(beneficiary, amount, "Disaster relief allocation");
        
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
            approvedBy: address(0)
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
        onlyRole(VERIFIER_ROLE) 
        whenNotPaused 
    {
        require(vendor != address(0), "Invalid vendor address");
        require(categories.length > 0, "At least one category required");
        require(!vendors[vendor].isApproved, "Already approved");
        
        // Validate all categories are essential
        for (uint i = 0; i < categories.length; i++) {
            require(essentialCategories[categories[i]], "Invalid category");
        }
        
        vendors[vendor].isApproved = true;
        vendors[vendor].approvedCategories = categories;
        vendors[vendor].approvedBy = msg.sender;
        
        _grantRole(VENDOR_ROLE, vendor);
        
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
        onlyRole(BENEFICIARY_ROLE) 
        whenNotPaused 
        nonReentrant 
    {
        require(vendors[vendor].isApproved, "Vendor not approved");
        require(amount > 0, "Amount must be positive");
        require(essentialCategories[category], "Invalid category");
        require(_isVendorApprovedForCategory(vendor, category), "Vendor not approved for category");
        require(reliefToken.balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Check if beneficiary has enough allocated funds
        Beneficiary storage beneficiary = beneficiaries[msg.sender];
        require(beneficiary.spentAmount + amount <= beneficiary.allocatedAmount, "Exceeds allocated amount");
        
        // Process the payment
        reliefToken.transferFrom(msg.sender, vendor, amount);
        
        // Update records
        beneficiary.spentAmount += amount;
        vendors[vendor].totalReceived += amount;
        
        // Create purchase record
        bytes32 purchaseId = keccak256(abi.encodePacked(msg.sender, vendor, amount, block.timestamp));
        purchases[purchaseId] = Purchase({
            beneficiary: msg.sender,
            vendor: vendor,
            amount: amount,
            category: category,
            description: description,
            timestamp: block.timestamp
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
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _addEssentialCategory(category);
    }
    
    /**
     * @dev Remove an essential category
     * @param category Category to remove
     */
    function removeEssentialCategory(string memory category) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
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
        
        emit CategoryRemoved(category);
    }
    
    /**
     * @dev Pause the contract (emergency function)
     */
    function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
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
     * @dev Get all essential categories
     */
    function getEssentialCategories() public view returns (string[] memory) {
        return categoryList;
    }
    
    // Internal functions
    
    function _addEssentialCategory(string memory category) internal {
        require(!essentialCategories[category], "Category already exists");
        require(bytes(category).length > 0, "Category cannot be empty");
        
        essentialCategories[category] = true;
        categoryList.push(category);
        
        emit CategoryAdded(category);
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