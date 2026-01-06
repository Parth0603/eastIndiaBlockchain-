const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReliefDistribution", function () {
  let AccessControl;
  let ReliefToken;
  let ReliefDistribution;
  let accessControl;
  let reliefToken;
  let reliefDistribution;
  let owner;
  let verifier;
  let beneficiary;
  let vendor;
  let donor;
  let addr1;

  beforeEach(async function () {
    // Get signers
    [owner, verifier, beneficiary, vendor, donor, addr1] = await ethers.getSigners();

    // Deploy AccessControl contract
    AccessControl = await ethers.getContractFactory("DisasterReliefAccessControl");
    accessControl = await AccessControl.deploy(owner.address);
    await accessControl.waitForDeployment();

    // Deploy ReliefToken contract
    ReliefToken = await ethers.getContractFactory("ReliefToken");
    reliefToken = await ReliefToken.deploy(
      "Disaster Relief Token",
      "DRT",
      18,
      await accessControl.getAddress()
    );
    await reliefToken.waitForDeployment();

    // Deploy ReliefDistribution contract
    ReliefDistribution = await ethers.getContractFactory("ReliefDistribution");
    reliefDistribution = await ReliefDistribution.deploy(
      await accessControl.getAddress(),
      await reliefToken.getAddress()
    );
    await reliefDistribution.waitForDeployment();

    // Set up roles
    const VERIFIER_ROLE = await accessControl.VERIFIER_ROLE();
    const MINTER_ROLE = await accessControl.MINTER_ROLE();
    const PAUSER_ROLE = await accessControl.PAUSER_ROLE();

    await accessControl.grantRoleWithReason(
      VERIFIER_ROLE,
      verifier.address,
      "Test verifier setup"
    );

    await accessControl.grantRoleWithReason(
      MINTER_ROLE,
      owner.address,
      "Test minter setup"
    );

    await accessControl.grantRoleWithReason(
      PAUSER_ROLE,
      owner.address,
      "Test pauser setup"
    );

    // Grant the distribution contract permission to manage beneficiary and vendor roles
    await accessControl.grantRoleWithReason(
      VERIFIER_ROLE,
      await reliefDistribution.getAddress(),
      "Allow distribution contract to manage roles"
    );

    // Mint some tokens for testing
    const initialAmount = ethers.parseEther("10000");
    await reliefToken.mint(donor.address, initialAmount, "Initial test tokens");
    await reliefToken.mint(await reliefDistribution.getAddress(), initialAmount, "Contract funding");
  });

  describe("Deployment", function () {
    it("Should set the right access control and token addresses", async function () {
      expect(await reliefDistribution.accessControl()).to.equal(await accessControl.getAddress());
      expect(await reliefDistribution.reliefToken()).to.equal(await reliefToken.getAddress());
    });

    it("Should initialize essential categories", async function () {
      const categories = await reliefDistribution.getEssentialCategories();
      expect(categories).to.include("food");
      expect(categories).to.include("medicine");
      expect(categories).to.include("shelter");
      expect(categories).to.include("clothing");
      expect(categories).to.include("water");
    });
  });

  describe("Donation Processing", function () {
    it("Should process donations correctly", async function () {
      const donationAmount = ethers.parseEther("100");
      
      // Approve tokens for transfer
      await reliefToken.connect(donor).approve(
        await reliefDistribution.getAddress(),
        donationAmount
      );
      
      // Process donation
      await reliefDistribution.connect(donor).donate(donationAmount, "Test donation");
      
      // Check contract balance increased
      const contractBalance = await reliefToken.balanceOf(await reliefDistribution.getAddress());
      expect(contractBalance).to.be.gte(donationAmount);
      
      // Check donation count
      expect(await reliefDistribution.getDonationCount()).to.equal(1);
    });

    it("Should emit DonationReceived event", async function () {
      const donationAmount = ethers.parseEther("100");
      
      await reliefToken.connect(donor).approve(
        await reliefDistribution.getAddress(),
        donationAmount
      );
      
      await expect(
        reliefDistribution.connect(donor).donate(donationAmount, "Test donation")
      ).to.emit(reliefDistribution, "DonationReceived");
    });
  });

  describe("Beneficiary Management", function () {
    it("Should allow beneficiary registration", async function () {
      await reliefDistribution.connect(beneficiary).registerBeneficiary(
        "earthquake",
        "Test City"
      );
      
      const beneficiaryData = await reliefDistribution.beneficiaries(beneficiary.address);
      expect(beneficiaryData.disasterType).to.equal("earthquake");
      expect(beneficiaryData.location).to.equal("Test City");
      expect(beneficiaryData.isApproved).to.be.false;
    });

    it("Should allow verifier to approve beneficiary", async function () {
      // Register beneficiary first
      await reliefDistribution.connect(beneficiary).registerBeneficiary(
        "earthquake",
        "Test City"
      );
      
      const allocationAmount = ethers.parseEther("500");
      
      // Approve beneficiary
      await reliefDistribution.connect(verifier).approveBeneficiary(
        beneficiary.address,
        allocationAmount
      );
      
      const beneficiaryData = await reliefDistribution.beneficiaries(beneficiary.address);
      expect(beneficiaryData.isApproved).to.be.true;
      expect(beneficiaryData.allocatedAmount).to.equal(allocationAmount);
      
      // Check beneficiary received tokens
      const beneficiaryBalance = await reliefToken.balanceOf(beneficiary.address);
      expect(beneficiaryBalance).to.equal(allocationAmount);
    });
  });

  describe("Vendor Management", function () {
    it("Should allow vendor registration", async function () {
      await reliefDistribution.connect(vendor).registerVendor("Test Store");
      
      const vendorData = await reliefDistribution.vendors(vendor.address);
      expect(vendorData.businessName).to.equal("Test Store");
      expect(vendorData.isApproved).to.be.false;
    });

    it("Should allow verifier to approve vendor", async function () {
      // Register vendor first
      await reliefDistribution.connect(vendor).registerVendor("Test Store");
      
      const categories = ["food", "medicine"];
      
      // Approve vendor
      await reliefDistribution.connect(verifier).approveVendor(
        vendor.address,
        categories
      );
      
      const vendorData = await reliefDistribution.vendors(vendor.address);
      expect(vendorData.isApproved).to.be.true;
      
      const vendorCategories = await reliefDistribution.getVendorCategories(vendor.address);
      expect(vendorCategories).to.deep.equal(categories);
    });
  });

  /**
   * **Feature: blockchain-disaster-relief, Property 27: Automated Fund Management**
   * **Validates: Requirements 7.3, 7.4**
   * 
   * Property: For any verified beneficiary need and spending attempt, the Distribution_Contract 
   * should allocate funds automatically and validate purchases against essential categories
   */
  describe("Property Test: Automated Fund Management", function () {
    beforeEach(async function () {
      // Set up a complete scenario
      await reliefDistribution.connect(beneficiary).registerBeneficiary(
        "earthquake",
        "Test City"
      );
      
      await reliefDistribution.connect(vendor).registerVendor("Test Store");
      
      const allocationAmount = ethers.parseEther("500");
      await reliefDistribution.connect(verifier).approveBeneficiary(
        beneficiary.address,
        allocationAmount
      );
      
      const categories = ["food", "medicine"];
      await reliefDistribution.connect(verifier).approveVendor(
        vendor.address,
        categories
      );
    });

    it("Property: Fund allocation should always equal approved amount", async function () {
      const beneficiaryData = await reliefDistribution.beneficiaries(beneficiary.address);
      const beneficiaryBalance = await reliefToken.balanceOf(beneficiary.address);
      
      expect(beneficiaryBalance).to.equal(beneficiaryData.allocatedAmount);
    });

    it("Property: Valid purchases should always succeed for approved categories", async function () {
      const purchaseAmount = ethers.parseEther("50");
      
      // Approve distribution contract to spend beneficiary's tokens
      await reliefToken.connect(beneficiary).approve(
        await reliefDistribution.getAddress(), 
        purchaseAmount
      );
      
      // Process purchase in approved category
      await expect(
        reliefDistribution.connect(beneficiary).processPurchase(
          vendor.address,
          purchaseAmount,
          "food",
          "Emergency food supplies"
        )
      ).to.not.be.reverted;
      
      // Check spending was recorded
      const beneficiaryData = await reliefDistribution.beneficiaries(beneficiary.address);
      expect(beneficiaryData.spentAmount).to.equal(purchaseAmount);
    });

    it("Property: Purchases in non-essential categories should always fail", async function () {
      const purchaseAmount = ethers.parseEther("50");
      
      await reliefToken.connect(beneficiary).approve(vendor.address, purchaseAmount);
      
      // Try to purchase in non-essential category
      await expect(
        reliefDistribution.connect(beneficiary).processPurchase(
          vendor.address,
          purchaseAmount,
          "luxury",
          "Non-essential item"
        )
      ).to.be.revertedWith("Invalid category");
    });

    it("Property: Purchases from unapproved vendors should always fail", async function () {
      const purchaseAmount = ethers.parseEther("50");
      
      await reliefToken.connect(beneficiary).approve(addr1.address, purchaseAmount);
      
      // Try to purchase from unapproved vendor
      await expect(
        reliefDistribution.connect(beneficiary).processPurchase(
          addr1.address,
          purchaseAmount,
          "food",
          "Food from unapproved vendor"
        )
      ).to.be.revertedWith("Vendor not approved or inactive");
    });

    it("Property: Spending should never exceed allocated amount", async function () {
      const beneficiaryData = await reliefDistribution.beneficiaries(beneficiary.address);
      const excessiveAmount = beneficiaryData.allocatedAmount + ethers.parseEther("1");
      
      // Try to spend more than allocated - should fail because of insufficient balance
      // (since beneficiary only has exactly their allocated amount)
      await expect(
        reliefDistribution.connect(beneficiary).processPurchase(
          vendor.address,
          excessiveAmount,
          "food",
          "Excessive purchase"
        )
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Property: Total spent should never exceed total allocated across all beneficiaries", async function () {
      // Register and approve another beneficiary
      await reliefDistribution.connect(addr1).registerBeneficiary(
        "flood",
        "Another City"
      );
      
      const secondAllocation = ethers.parseEther("300");
      await reliefDistribution.connect(verifier).approveBeneficiary(
        addr1.address,
        secondAllocation
      );
      
      // Get system stats
      const [, totalAllocated, totalSpent] = await reliefDistribution.getSystemStats();
      
      // Total spent should never exceed total allocated
      expect(totalSpent).to.be.lte(totalAllocated);
    });

    it("Property: Purchase processing should maintain transaction integrity", async function () {
      const purchaseAmount = ethers.parseEther("100");
      const initialVendorBalance = await reliefToken.balanceOf(vendor.address);
      const initialBeneficiaryBalance = await reliefToken.balanceOf(beneficiary.address);
      
      // Approve the distribution contract to spend beneficiary's tokens
      await reliefToken.connect(beneficiary).approve(
        await reliefDistribution.getAddress(), 
        purchaseAmount
      );
      
      await reliefDistribution.connect(beneficiary).processPurchase(
        vendor.address,
        purchaseAmount,
        "food",
        "Food purchase"
      );
      
      const finalVendorBalance = await reliefToken.balanceOf(vendor.address);
      const finalBeneficiaryBalance = await reliefToken.balanceOf(beneficiary.address);
      
      // Vendor should receive the tokens
      expect(finalVendorBalance).to.equal(initialVendorBalance + purchaseAmount);
      
      // Beneficiary should lose the tokens
      expect(finalBeneficiaryBalance).to.equal(initialBeneficiaryBalance - purchaseAmount);
    });
  });

  describe("System Statistics", function () {
    it("Should provide accurate system statistics", async function () {
      // Initial stats should be zero
      let [totalDonations, totalAllocated, totalSpent, activeBeneficiaries, activeVendors] = 
        await reliefDistribution.getSystemStats();
      
      expect(totalDonations).to.equal(0);
      expect(totalAllocated).to.equal(0);
      expect(totalSpent).to.equal(0);
      expect(activeBeneficiaries).to.equal(0);
      expect(activeVendors).to.equal(0);
    });

    it("Should update statistics after operations", async function () {
      // Process a donation
      const donationAmount = ethers.parseEther("100");
      await reliefToken.connect(donor).approve(
        await reliefDistribution.getAddress(),
        donationAmount
      );
      await reliefDistribution.connect(donor).donate(donationAmount, "Test donation");
      
      // Register and approve beneficiary
      await reliefDistribution.connect(beneficiary).registerBeneficiary(
        "earthquake",
        "Test City"
      );
      const allocationAmount = ethers.parseEther("500");
      await reliefDistribution.connect(verifier).approveBeneficiary(
        beneficiary.address,
        allocationAmount
      );
      
      // Check updated stats
      let [totalDonations, totalAllocated, , activeBeneficiaries] = 
        await reliefDistribution.getSystemStats();
      
      expect(totalDonations).to.equal(donationAmount);
      expect(totalAllocated).to.equal(allocationAmount);
      expect(activeBeneficiaries).to.equal(1);
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow authorized users to pause the contract", async function () {
      await reliefDistribution.pause();
      expect(await reliefDistribution.paused()).to.be.true;
    });

    it("Should prevent operations when paused", async function () {
      await reliefDistribution.pause();
      
      await expect(
        reliefDistribution.connect(beneficiary).registerBeneficiary(
          "earthquake",
          "Test City"
        )
      ).to.be.reverted; // Just check that it reverts
    });
  });
});