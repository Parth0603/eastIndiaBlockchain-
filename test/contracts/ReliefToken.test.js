const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReliefToken", function () {
  let ReliefToken;
  let reliefToken;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy contract
    ReliefToken = await ethers.getContractFactory("ReliefToken");
    reliefToken = await ReliefToken.deploy(
      "Disaster Relief Token",
      "DRT",
      18,
      owner.address
    );
    await reliefToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await reliefToken.name()).to.equal("Disaster Relief Token");
      expect(await reliefToken.symbol()).to.equal("DRT");
      expect(await reliefToken.decimals()).to.equal(18);
    });

    it("Should grant admin role to owner", async function () {
      const DEFAULT_ADMIN_ROLE = await reliefToken.DEFAULT_ADMIN_ROLE();
      expect(await reliefToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const amount = ethers.parseEther("100");
      await reliefToken.mint(addr1.address, amount, "Test minting");
      
      expect(await reliefToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should emit TokensMinted event", async function () {
      const amount = ethers.parseEther("100");
      await expect(reliefToken.mint(addr1.address, amount, "Test minting"))
        .to.emit(reliefToken, "TokensMinted")
        .withArgs(addr1.address, amount, "Test minting");
    });
  });

  // Add more tests as needed
});