// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DisasterReliefAccessControl
 * @dev Extended AccessControl contract for disaster relief system
 * Defines all roles and provides role management functionality
 */
contract DisasterReliefAccessControl is AccessControl {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant BENEFICIARY_ROLE = keccak256("BENEFICIARY_ROLE");
    bytes32 public constant VENDOR_ROLE = keccak256("VENDOR_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Events for role management
    event RoleGrantedWithReason(bytes32 indexed role, address indexed account, address indexed sender, string reason);
    event RoleRevokedWithReason(bytes32 indexed role, address indexed account, address indexed sender, string reason);
    
    /**
     * @dev Constructor sets up the contract with initial admin
     * @param admin Address that will have admin role
     */
    constructor(address admin) {
        require(admin != address(0), "Admin cannot be zero address");
        
        // Grant admin role to the specified address
        _grantRole(ADMIN_ROLE, admin);
        
        // Set up role hierarchies
        _setRoleAdmin(VERIFIER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(BENEFICIARY_ROLE, VERIFIER_ROLE);
        _setRoleAdmin(VENDOR_ROLE, VERIFIER_ROLE);
        _setRoleAdmin(MINTER_ROLE, ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, ADMIN_ROLE);
    }
    
    /**
     * @dev Grant role with reason for transparency
     * @param role Role to grant
     * @param account Account to grant role to
     * @param reason Reason for granting the role
     */
    function grantRoleWithReason(
        bytes32 role, 
        address account, 
        string memory reason
    ) public onlyRole(getRoleAdmin(role)) {
        require(account != address(0), "Cannot grant role to zero address");
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        _grantRole(role, account);
        emit RoleGrantedWithReason(role, account, msg.sender, reason);
    }
    
    /**
     * @dev Revoke role with reason for transparency
     * @param role Role to revoke
     * @param account Account to revoke role from
     * @param reason Reason for revoking the role
     */
    function revokeRoleWithReason(
        bytes32 role, 
        address account, 
        string memory reason
    ) public onlyRole(getRoleAdmin(role)) {
        require(bytes(reason).length > 0, "Reason cannot be empty");
        
        _revokeRole(role, account);
        emit RoleRevokedWithReason(role, account, msg.sender, reason);
    }
    
    /**
     * @dev Check if account has any of the specified roles
     * @param roles Array of roles to check
     * @param account Account to check
     * @return bool True if account has any of the roles
     */
    function hasAnyRole(bytes32[] memory roles, address account) public view returns (bool) {
        for (uint256 i = 0; i < roles.length; i++) {
            if (hasRole(roles[i], account)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Get all role members for a specific role (simplified version)
     * Note: This is a basic implementation. For production, consider using AccessControlEnumerable
     * @param role Role to get members for
     * @return members Array of addresses with the role (limited implementation)
     */
    function getRoleMembers(bytes32 role) public view returns (address[] memory members) {
        // This is a simplified implementation
        // In production, you should use AccessControlEnumerable for this functionality
        members = new address[](0);
        return members;
    }
    
    /**
     * @dev Check if account is admin
     * @param account Account to check
     * @return bool True if account is admin
     */
    function isAdmin(address account) public view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }
    
    /**
     * @dev Check if account is verifier
     * @param account Account to check
     * @return bool True if account is verifier
     */
    function isVerifier(address account) public view returns (bool) {
        return hasRole(VERIFIER_ROLE, account);
    }
    
    /**
     * @dev Check if account is beneficiary
     * @param account Account to check
     * @return bool True if account is beneficiary
     */
    function isBeneficiary(address account) public view returns (bool) {
        return hasRole(BENEFICIARY_ROLE, account);
    }
    
    /**
     * @dev Check if account is vendor
     * @param account Account to check
     * @return bool True if account is vendor
     */
    function isVendor(address account) public view returns (bool) {
        return hasRole(VENDOR_ROLE, account);
    }
    
    /**
     * @dev Check if account can mint tokens
     * @param account Account to check
     * @return bool True if account can mint
     */
    function canMint(address account) public view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Check if account can pause system
     * @param account Account to check
     * @return bool True if account can pause
     */
    function canPause(address account) public view returns (bool) {
        return hasRole(PAUSER_ROLE, account);
    }
    
    /**
     * @dev Modifier to check if caller has verifier role or higher
     */
    modifier onlyVerifierOrAdmin() {
        require(
            hasRole(VERIFIER_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Caller must be verifier or admin"
        );
        _;
    }
    
    /**
     * @dev Modifier to check if caller has beneficiary role
     */
    modifier onlyBeneficiary() {
        require(hasRole(BENEFICIARY_ROLE, msg.sender), "Caller must be beneficiary");
        _;
    }
    
    /**
     * @dev Modifier to check if caller has vendor role
     */
    modifier onlyVendor() {
        require(hasRole(VENDOR_ROLE, msg.sender), "Caller must be vendor");
        _;
    }
}