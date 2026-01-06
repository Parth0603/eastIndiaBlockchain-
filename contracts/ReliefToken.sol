// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./AccessControl.sol";

/**
 * @title ReliefToken
 * @dev ERC20 token for disaster relief distribution
 * Features:
 * - Controlled minting by authorized contracts
 * - Burnable tokens for completed distributions
 * - Role-based access control
 * - Pausable for emergency situations
 */
contract ReliefToken is ERC20, ERC20Burnable, Pausable {
    DisasterReliefAccessControl public accessControl;
    
    uint8 private _decimals;
    uint256 public totalMinted;
    uint256 public totalBurned;
    
    // Mapping to track minting purposes for transparency
    mapping(address => string[]) public mintingHistory;
    mapping(address => string[]) public burningHistory;
    
    event TokensMinted(address indexed to, uint256 amount, string purpose, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount, string reason, address indexed burner);
    event AccessControlUpdated(address indexed oldAccessControl, address indexed newAccessControl);
    
    /**
     * @dev Constructor sets up the token with initial parameters
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Token decimals
     * @param accessControlAddress Address of the access control contract
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        address accessControlAddress
    ) ERC20(name, symbol) {
        require(accessControlAddress != address(0), "Access control cannot be zero address");
        
        _decimals = decimals_;
        accessControl = DisasterReliefAccessControl(accessControlAddress);
    }
    
    /**
     * @dev Returns the number of decimals used for token amounts
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mints tokens for disaster relief purposes
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     * @param purpose Purpose of minting (for transparency)
     */
    function mint(address to, uint256 amount, string memory purpose) 
        public 
        whenNotPaused 
    {
        require(accessControl.canMint(msg.sender), "Caller cannot mint tokens");
        require(to != address(0), "ReliefToken: mint to zero address");
        require(amount > 0, "ReliefToken: mint amount must be positive");
        require(bytes(purpose).length > 0, "Purpose cannot be empty");
        
        _mint(to, amount);
        totalMinted += amount;
        
        // Record minting history
        mintingHistory[to].push(purpose);
        
        emit TokensMinted(to, amount, purpose, msg.sender);
    }
    
    /**
     * @dev Burns tokens with a reason for transparency
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burnWithReason(uint256 amount, string memory reason) 
        public 
        whenNotPaused 
    {
        require(amount > 0, "ReliefToken: burn amount must be positive");
        require(balanceOf(msg.sender) >= amount, "ReliefToken: insufficient balance");
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        _burn(msg.sender, amount);
        totalBurned += amount;
        
        // Record burning history
        burningHistory[msg.sender].push(reason);
        
        emit TokensBurned(msg.sender, amount, reason, msg.sender);
    }
    
    /**
     * @dev Burns tokens from a specific address (admin function)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burnFrom(address from, uint256 amount, string memory reason) 
        public 
        whenNotPaused 
    {
        require(accessControl.isAdmin(msg.sender), "Only admin can burn from address");
        require(amount > 0, "ReliefToken: burn amount must be positive");
        require(balanceOf(from) >= amount, "ReliefToken: insufficient balance");
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        _burn(from, amount);
        totalBurned += amount;
        
        // Record burning history
        burningHistory[from].push(reason);
        
        emit TokensBurned(from, amount, reason, msg.sender);
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
     * @dev Update access control contract (admin only)
     * @param newAccessControl Address of new access control contract
     */
    function updateAccessControl(address newAccessControl) 
        public 
    {
        require(accessControl.isAdmin(msg.sender), "Only admin can update access control");
        require(newAccessControl != address(0), "New access control cannot be zero address");
        
        address oldAccessControl = address(accessControl);
        accessControl = DisasterReliefAccessControl(newAccessControl);
        
        emit AccessControlUpdated(oldAccessControl, newAccessControl);
    }
    
    /**
     * @dev Get minting history for an address
     * @param account Address to get history for
     * @return Array of minting purposes
     */
    function getMintingHistory(address account) 
        public 
        view 
        returns (string[] memory) 
    {
        return mintingHistory[account];
    }
    
    /**
     * @dev Get burning history for an address
     * @param account Address to get history for
     * @return Array of burning reasons
     */
    function getBurningHistory(address account) 
        public 
        view 
        returns (string[] memory) 
    {
        return burningHistory[account];
    }
    
    /**
     * @dev Get token statistics
     * @return totalSupply_ Current total supply
     * @return totalMinted_ Total tokens ever minted
     * @return totalBurned_ Total tokens ever burned
     */
    function getTokenStats() 
        public 
        view 
        returns (uint256 totalSupply_, uint256 totalMinted_, uint256 totalBurned_) 
    {
        return (totalSupply(), totalMinted, totalBurned);
    }
    
    /**
     * @dev Override transfer to add pause functionality
     */
    function transfer(address to, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add pause functionality
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Override approve to add pause functionality
     */
    function approve(address spender, uint256 amount) 
        public 
        virtual 
        override 
        whenNotPaused 
        returns (bool) 
    {
        return super.approve(spender, amount);
    }
}