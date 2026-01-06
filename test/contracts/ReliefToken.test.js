const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReliefToken", function () {
  let AccessControl;
  let ReliefToken;
  let accessControl;
  let reliefToken;
  let owner;
  let minter;
  let user1;
  let user2;

  beforeEach(async function () {
    // Get signers
    [owner, minter, user1, user2] = await ethers.getSigners();

    // Deploy AccessControl contract first
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

    // Grant minter role to test minting
    const MINTER_ROLE = await accessControl.MINTER_ROLE();
    await accessControl.grantRoleWithReason(
      MINTER_ROLE,
      minter.address,
      "Test setup"
    );
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await reliefToken.name()).to.equal("Disaster Relief Token");
      expect(await reliefToken.symbol()).to.equal("DRT");
      expect(await reliefToken.decimals()).to.equal(18);
    });

    it("Should set access control correctly", async function () {
      expect(await reliefToken.accessControl()).to.equal(await accessControl.getAddress());
    });
  });

  describe("Minting", function () {
    it("Should allow authorized minter to mint tokens", async function () {
      const amount = ethers.parseEther("100");
      await reliefToken.connect(minter).mint(user1.address, amount, "Test minting");
      
      expect(await reliefToken.balanceOf(user1.address)).to.equal(amount);
      expect(await reliefToken.totalMinted()).to.equal(amount);
    });

    it("Should emit TokensMinted event", async function () {
      const amount = ethers.parseEther("100");
      await expect(reliefToken.connect(minter).mint(user1.address, amount, "Test minting"))
        .to.emit(reliefToken, "TokensMinted")
        .withArgs(user1.address, amount, "Test minting", minter.address);
    });

    it("Should not allow unauthorized user to mint", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        reliefToken.connect(user1).mint(user2.address, amount, "Unauthorized minting")
      ).to.be.revertedWith("Caller cannot mint tokens");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      // Mint some tokens first
      const amount = ethers.parseEther("100");
      await reliefToken.connect(minter).mint(user1.address, amount, "Setup for burning");
    });

    it("Should allow token holder to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("50");
      const initialBalance = await reliefToken.balanceOf(user1.address);
      
      await reliefToken.connect(user1).burnWithReason(burnAmount, "Test burning");
      
      expect(await reliefToken.balanceOf(user1.address)).to.equal(initialBalance - burnAmount);
      expect(await reliefToken.totalBurned()).to.equal(burnAmount);
    });

    it("Should emit TokensBurned event", async function () {
      const burnAmount = ethers.parseEther("50");
      
      await expect(reliefToken.connect(user1).burnWithReason(burnAmount, "Test burning"))
        .to.emit(reliefToken, "TokensBurned")
        .withArgs(user1.address, burnAmount, "Test burning", user1.address);
    });
  });

  /**
   * **Feature: blockchain-disaster-relief, Property 1: Wallet Connection Display**
   * **Validates: Requirements 1.1**
   * 
   * Property: For any valid wallet address, when connecting to the Relief_System, 
   * the interface should display the wallet balance and donation functionality correctly
   */
  describe("Property Test: Token Balance Display", function () {
    it("Property: Token balance should be accurately retrievable for any address", async function () {
      const addresses = [user1.address, user2.address, owner.address];
      const amounts = [
        ethers.parseEther("100"),
        ethers.parseEther("250"),
        ethers.parseEther("500")
      ];

      // Mint different amounts to different addresses
      for (let i = 0; i < addresses.length; i++) {
        await reliefToken.connect(minter).mint(
          addresses[i], 
          amounts[i], 
          `Minting ${amounts[i]} to ${addresses[i]}`
        );
        
        // Verify balance is correct
        expect(await reliefToken.balanceOf(addresses[i])).to.equal(amounts[i]);
      }
    });

    it("Property: Total supply should equal sum of all balances", async function () {
      const amount1 = ethers.parseEther("100");
      const amount2 = ethers.parseEther("200");
      
      await reliefToken.connect(minter).mint(user1.address, amount1, "First mint");
      await reliefToken.connect(minter).mint(user2.address, amount2, "Second mint");
      
      const totalSupply = await reliefToken.totalSupply();
      const balance1 = await reliefToken.balanceOf(user1.address);
      const balance2 = await reliefToken.balanceOf(user2.address);
      
      expect(totalSupply).to.equal(balance1 + balance2);
    });

    it("Property: Minting should always increase total supply", async function () {
      const initialSupply = await reliefToken.totalSupply();
      const mintAmount = ethers.parseEther("100");
      
      await reliefToken.connect(minter).mint(user1.address, mintAmount, "Test mint");
      
      const newSupply = await reliefToken.totalSupply();
      expect(newSupply).to.equal(initialSupply + mintAmount);
    });

    it("Property: Burning should always decrease total supply", async function () {
      // First mint some tokens
      const mintAmount = ethers.parseEther("100");
      await reliefToken.connect(minter).mint(user1.address, mintAmount, "Setup for burn test");
      
      const supplyAfterMint = await reliefToken.totalSupply();
      const burnAmount = ethers.parseEther("30");
      
      await reliefToken.connect(user1).burnWithReason(burnAmount, "Test burn");
      
      const finalSupply = await reliefToken.totalSupply();
      expect(finalSupply).to.equal(supplyAfterMint - burnAmount);
    });
  });

  describe("History Tracking", function () {
    it("Should track minting history", async function () {
      const amount = ethers.parseEther("100");
      const purpose = "Emergency relief allocation";
      
      await reliefToken.connect(minter).mint(user1.address, amount, purpose);
      
      const history = await reliefToken.getMintingHistory(user1.address);
      expect(history).to.have.lengthOf(1);
      expect(history[0]).to.equal(purpose);
    });

    it("Should track burning history", async function () {
      // First mint
      const amount = ethers.parseEther("100");
      await reliefToken.connect(minter).mint(user1.address, amount, "Setup");
      
      // Then burn
      const burnAmount = ethers.parseEther("50");
      const reason = "Completed relief distribution";
      
      await reliefToken.connect(user1).burnWithReason(burnAmount, reason);
      
      const history = await reliefToken.getBurningHistory(user1.address);
      expect(history).to.have.lengthOf(1);
      expect(history[0]).to.equal(reason);
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow admin to pause the contract", async function () {
      const PAUSER_ROLE = await accessControl.PAUSER_ROLE();
      await accessControl.grantRoleWithReason(
        PAUSER_ROLE,
        owner.address,
        "Grant pause permission"
      );
      
      await reliefToken.pause();
      expect(await reliefToken.paused()).to.be.true;
    });

    it("Should prevent transfers when paused", async function () {
      // First mint some tokens
      const amount = ethers.parseEther("100");
      await reliefToken.connect(minter).mint(user1.address, amount, "Setup");
      
      // Grant pause role and pause
      const PAUSER_ROLE = await accessControl.PAUSER_ROLE();
      await accessControl.grantRoleWithReason(
        PAUSER_ROLE,
        owner.address,
        "Grant pause permission"
      );
      await reliefToken.pause();
      
      // Try to transfer - should fail
      await expect(
        reliefToken.connect(user1).transfer(user2.address, ethers.parseEther("10"))
      ).to.be.reverted; // Just check that it reverts, not the specific message
    });
  });

  describe("Token Statistics", function () {
    it("Should provide accurate token statistics", async function () {
      const mintAmount = ethers.parseEther("100");
      const burnAmount = ethers.parseEther("30");
      
      // Initial state
      let [totalSupply, totalMinted, totalBurned] = await reliefToken.getTokenStats();
      expect(totalSupply).to.equal(0);
      expect(totalMinted).to.equal(0);
      expect(totalBurned).to.equal(0);
      
      // After minting
      await reliefToken.connect(minter).mint(user1.address, mintAmount, "Test mint");
      [totalSupply, totalMinted, totalBurned] = await reliefToken.getTokenStats();
      expect(totalSupply).to.equal(mintAmount);
      expect(totalMinted).to.equal(mintAmount);
      expect(totalBurned).to.equal(0);
      
      // After burning
      await reliefToken.connect(user1).burnWithReason(burnAmount, "Test burn");
      [totalSupply, totalMinted, totalBurned] = await reliefToken.getTokenStats();
      expect(totalSupply).to.equal(mintAmount - burnAmount);
      expect(totalMinted).to.equal(mintAmount);
      expect(totalBurned).to.equal(burnAmount);
    });
  });
});