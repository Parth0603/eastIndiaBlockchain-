// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ReliefToken
 * @dev ERC20 token for disaster relief distribution
 * Features:
 * - Controlled minting by authorized contracts
 * - Burnable tokens for completed distributions
 * - Role-based access control
 */
contract ReliefToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    
    uint8 private _decimals;
    
    event TokensMinted(address indexed to, uint256 amount, string purpose);
    event TokensBurned(address indexed from, uint256 amount, string reason);
    
    /**
     * @dev Constructor sets up the token with initial parameters
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals_ Token decimals
     * @param admin Address that will have admin role
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        address admin
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
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
        onlyRole(MINTER_ROLE) 
    {
        require(to != address(0), "ReliefToken: mint to zero address");
        require(amount > 0, "ReliefToken: mint amount must be positive");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, purpose);
    }
    
    /**
     * @dev Burns tokens with a reason for transparency
     * @param amount Amount of tokens to burn
     * @param reason Reason for burning
     */
    function burnWithReason(uint256 amount, string memory reason) public {
        require(amount > 0, "ReliefToken: burn amount must be positive");
        require(balanceOf(msg.sender) >= amount, "ReliefToken: insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, reason);
    }
    
    /**
     * @dev Grants distributor role to an address
     * @param distributor Address to grant distributor role
     */
    function grantDistributorRole(address distributor) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _grantRole(DISTRIBUTOR_ROLE, distributor);
    }
    
    /**
     * @dev Revokes distributor role from an address
     * @param distributor Address to revoke distributor role
     */
    function revokeDistributorRole(address distributor) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _revokeRole(DISTRIBUTOR_ROLE, distributor);
    }
    
    /**
     * @dev Override transfer to add distributor restrictions if needed
     */
    function transfer(address to, uint256 amount) 
        public 
        virtual 
        override 
        returns (bool) 
    {
        // Add any transfer restrictions here if needed
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom to add distributor restrictions if needed
     */
    function transferFrom(address from, address to, uint256 amount) 
        public 
        virtual 
        override 
        returns (bool) 
    {
        // Add any transfer restrictions here if needed
        return super.transferFrom(from, to, amount);
    }
}