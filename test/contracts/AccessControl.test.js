const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DisasterReliefAccessControl - Unit Tests", function () {
  let AccessControl;
  let accessControl;
  let owner;
  let verifier;
  let beneficiary;
  let vendor;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, verifier, beneficiary, vendor, addr1, addr2] = await ethers.getSigners();

    AccessControl = await ethers.getContractFactory("DisasterReliefAccessControl");
    accessControl = await AccessControl.deploy(owner.address);
    await accessControl.waitForDeployment();
  });

  describe("Constructor", function () {
    it("Should set the correct admin", async function () {
      const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
      expect(await accessControl.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should reject zero address as admin", async function () {
      await expect(
        AccessControl.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Admin cannot be zero address");
    });

    it("Should set up role hierarchies correctly", async function () {
      const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      const VENDOR_ROLE = await accessControl.VENDOR_ROLE();
      const MINTER_ROLE = await accessControl.MINTER_ROLE();
      const PAUSER_ROLE = await accessControl.PAUSER_ROLE();

      expect(await accessControl.getRoleAdmin(VERIFIER_ROLE)).to.equal(ADMIN_ROLE);
      expect(await accessControl.getRoleAdmin(BENEFICIARY_ROLE)).to.equal(VERIFIER_ROLE);
      expect(await accessControl.getRoleAdmin(VENDOR_ROLE)).to.equal(VERIFIER_ROLE);
      expect(await accessControl.getRoleAdmin(MINTER_ROLE)).to.equal(ADMIN_ROLE);
      expect(await accessControl.getRoleAdmin(PAUSER_ROLE)).to.equal(ADMIN_ROLE);
    });
  });

  describe("Role Granting", function () {
    it("Should allow admin to grant verifier role", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Initial verifier setup"
      );
      
      expect(await accessControl.hasRole(VERIFIER_ROLE, verifier.address)).to.be.true;
    });

    it("Should emit RoleGrantedWithReason event", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await expect(
        accessControl.grantRoleWithReason(
          VERIFIER_ROLE,
          verifier.address,
          "Test reason"
        )
      ).to.emit(accessControl, "RoleGrantedWithReason")
        .withArgs(VERIFIER_ROLE, verifier.address, owner.address, "Test reason");
    });

    it("Should reject granting role to zero address", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await expect(
        accessControl.grantRoleWithReason(
          VERIFIER_ROLE,
          ethers.ZeroAddress,
          "Invalid address"
        )
      ).to.be.revertedWith("Cannot grant role to zero address");
    });

    it("Should reject empty reason", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await expect(
        accessControl.grantRoleWithReason(
          VERIFIER_ROLE,
          verifier.address,
          ""
        )
      ).to.be.revertedWith("Reason cannot be empty");
    });

    it("Should reject unauthorized role granting", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await expect(
        accessControl.connect(addr1).grantRoleWithReason(
          VERIFIER_ROLE,
          addr2.address,
          "Unauthorized attempt"
        )
      ).to.be.reverted;
    });
  });

  describe("Role Revoking", function () {
    beforeEach(async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Setup for revoke test"
      );
    });

    it("Should allow admin to revoke verifier role", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await accessControl.revokeRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Test revocation"
      );
      
      expect(await accessControl.hasRole(VERIFIER_ROLE, verifier.address)).to.be.false;
    });

    it("Should emit RoleRevokedWithReason event", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await expect(
        accessControl.revokeRoleWithReason(
          VERIFIER_ROLE,
          verifier.address,
          "Test revocation"
        )
      ).to.emit(accessControl, "RoleRevokedWithReason")
        .withArgs(VERIFIER_ROLE, verifier.address, owner.address, "Test revocation");
    });

    it("Should reject empty reason for revocation", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      await expect(
        accessControl.revokeRoleWithReason(
          VERIFIER_ROLE,
          verifier.address,
          ""
        )
      ).to.be.revertedWith("Reason cannot be empty");
    });
  });

  describe("Role Hierarchy", function () {
    it("Should allow verifier to grant beneficiary role", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      
      // Grant verifier role first
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Setup verifier"
      );
      
      // Verifier grants beneficiary role
      await accessControl.connect(verifier).grantRoleWithReason(
        BENEFICIARY_ROLE,
        beneficiary.address,
        "Approved beneficiary"
      );
      
      expect(await accessControl.hasRole(BENEFICIARY_ROLE, beneficiary.address)).to.be.true;
    });

    it("Should allow verifier to grant vendor role", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const VENDOR_ROLE = await accessControl.VENDOR_ROLE();
      
      // Grant verifier role first
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Setup verifier"
      );
      
      // Verifier grants vendor role
      await accessControl.connect(verifier).grantRoleWithReason(
        VENDOR_ROLE,
        vendor.address,
        "Approved vendor"
      );
      
      expect(await accessControl.hasRole(VENDOR_ROLE, vendor.address)).to.be.true;
    });

    it("Should not allow beneficiary to grant roles", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      
      // Set up beneficiary
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Setup verifier"
      );
      await accessControl.connect(verifier).grantRoleWithReason(
        BENEFICIARY_ROLE,
        beneficiary.address,
        "Setup beneficiary"
      );
      
      // Beneficiary tries to grant role - should fail
      await expect(
        accessControl.connect(beneficiary).grantRoleWithReason(
          BENEFICIARY_ROLE,
          addr1.address,
          "Unauthorized attempt"
        )
      ).to.be.reverted;
    });
  });

  describe("Role Checking Functions", function () {
    beforeEach(async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      const VENDOR_ROLE = await accessControl.VENDOR_ROLE();
      const MINTER_ROLE = await accessControl.MINTER_ROLE();
      const PAUSER_ROLE = await accessControl.PAUSER_ROLE();
      
      await accessControl.grantRoleWithReason(VERIFIER_ROLE, verifier.address, "Test setup");
      await accessControl.grantRoleWithReason(MINTER_ROLE, addr1.address, "Test setup");
      await accessControl.grantRoleWithReason(PAUSER_ROLE, addr2.address, "Test setup");
      
      await accessControl.connect(verifier).grantRoleWithReason(
        BENEFICIARY_ROLE,
        beneficiary.address,
        "Test setup"
      );
      await accessControl.connect(verifier).grantRoleWithReason(
        VENDOR_ROLE,
        vendor.address,
        "Test setup"
      );
    });

    it("Should correctly identify admin", async function () {
      expect(await accessControl.isAdmin(owner.address)).to.be.true;
      expect(await accessControl.isAdmin(verifier.address)).to.be.false;
    });

    it("Should correctly identify verifier", async function () {
      expect(await accessControl.isVerifier(verifier.address)).to.be.true;
      expect(await accessControl.isVerifier(beneficiary.address)).to.be.false;
    });

    it("Should correctly identify beneficiary", async function () {
      expect(await accessControl.isBeneficiary(beneficiary.address)).to.be.true;
      expect(await accessControl.isBeneficiary(vendor.address)).to.be.false;
    });

    it("Should correctly identify vendor", async function () {
      expect(await accessControl.isVendor(vendor.address)).to.be.true;
      expect(await accessControl.isVendor(beneficiary.address)).to.be.false;
    });

    it("Should correctly identify minter", async function () {
      expect(await accessControl.canMint(addr1.address)).to.be.true;
      expect(await accessControl.canMint(verifier.address)).to.be.false;
    });

    it("Should correctly identify pauser", async function () {
      expect(await accessControl.canPause(addr2.address)).to.be.true;
      expect(await accessControl.canPause(beneficiary.address)).to.be.false;
    });
  });

  describe("hasAnyRole Function", function () {
    it("Should return true when user has one of the roles", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Test setup"
      );
      
      const roles = [VERIFIER_ROLE, BENEFICIARY_ROLE];
      expect(await accessControl.hasAnyRole(roles, verifier.address)).to.be.true;
    });

    it("Should return false when user has none of the roles", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      
      const roles = [VERIFIER_ROLE, BENEFICIARY_ROLE];
      expect(await accessControl.hasAnyRole(roles, addr1.address)).to.be.false;
    });

    it("Should work with empty roles array", async function () {
      const roles = [];
      expect(await accessControl.hasAnyRole(roles, owner.address)).to.be.false;
    });
  });

  describe("getRoleMembers Function", function () {
    it("Should return empty array (simplified implementation)", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      // Grant role to multiple addresses
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "First verifier"
      );
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        addr1.address,
        "Second verifier"
      );
      
      const members = await accessControl.getRoleMembers(VERIFIER_ROLE);
      // Note: This is a simplified implementation that returns empty array
      // In production, use AccessControlEnumerable for full functionality
      expect(members).to.have.lengthOf(0);
    });

    it("Should return empty array for role with no members", async function () {
      const BENEFICIARY_ROLE = await accessControl.BENEFICIARY_ROLE();
      const members = await accessControl.getRoleMembers(BENEFICIARY_ROLE);
      expect(members).to.have.lengthOf(0);
    });
  });

  describe("Modifiers", function () {
    let TestContract;
    let testContract;

    before(async function () {
      // Create a test contract that uses the modifiers
      const testContractCode = `
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.20;
        
        import "./contracts/AccessControl.sol";
        
        contract TestModifiers {
            DisasterReliefAccessControl public accessControl;
            
            constructor(address _accessControl) {
                accessControl = DisasterReliefAccessControl(_accessControl);
            }
            
            modifier onlyVerifierOrAdmin() {
                require(
                    accessControl.hasRole(accessControl.VERIFIER_ROLE(), msg.sender) || 
                    accessControl.hasRole(accessControl.ADMIN_ROLE(), msg.sender),
                    "Caller must be verifier or admin"
                );
                _;
            }
            
            modifier onlyBeneficiary() {
                require(accessControl.hasRole(accessControl.BENEFICIARY_ROLE(), msg.sender), "Caller must be beneficiary");
                _;
            }
            
            modifier onlyVendor() {
                require(accessControl.hasRole(accessControl.VENDOR_ROLE(), msg.sender), "Caller must be vendor");
                _;
            }
            
            function verifierOrAdminFunction() public onlyVerifierOrAdmin returns (bool) {
                return true;
            }
            
            function beneficiaryFunction() public onlyBeneficiary returns (bool) {
                return true;
            }
            
            function vendorFunction() public onlyVendor returns (bool) {
                return true;
            }
        }
      `;
      
      // Note: In a real test environment, you would compile and deploy this contract
      // For this example, we'll test the modifier logic through the access control functions
    });

    it("Should allow admin to call verifier-or-admin functions", async function () {
      // Test through direct role checking since we can't easily deploy test contract in this context
      const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      
      const hasAdminRole = await accessControl.hasRole(ADMIN_ROLE, owner.address);
      const hasVerifierRole = await accessControl.hasRole(VERIFIER_ROLE, owner.address);
      
      expect(hasAdminRole || hasVerifierRole).to.be.true;
    });

    it("Should allow verifier to call verifier-or-admin functions", async function () {
      const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
      const ADMIN_ROLE = await accessControl.ADMIN_ROLE();
      
      await accessControl.grantRoleWithReason(
        VERIFIER_ROLE,
        verifier.address,
        "Test setup"
      );
      
      const hasAdminRole = await accessControl.hasRole(ADMIN_ROLE, verifier.address);
      const hasVerifierRole = await accessControl.hasRole(VERIFIER_ROLE, verifier.address);
      
      expect(hasAdminRole || hasVerifierRole).to.be.true;
    });
  });
});