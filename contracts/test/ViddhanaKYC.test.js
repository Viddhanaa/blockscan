const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ViddhanaKYC", function () {
  let ViddhanaKYC;
  let contract;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addrs;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    // Deploy contract
    ViddhanaKYC = await ethers.getContractFactory("ViddhanaKYC");
    contract = await ViddhanaKYC.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should start with zero KYC count", async function () {
      expect(await contract.totalKYCCount()).to.equal(0);
    });

    it("Should not be paused initially", async function () {
      expect(await contract.paused()).to.equal(false);
    });
  });

  describe("setKYC", function () {
    it("Should allow owner to set KYC status to true", async function () {
      await contract.setKYC(addr1.address, true);
      expect(await contract.isKYC(addr1.address)).to.equal(true);
    });

    it("Should allow owner to set KYC status to false", async function () {
      await contract.setKYC(addr1.address, true);
      await contract.setKYC(addr1.address, false);
      expect(await contract.isKYC(addr1.address)).to.equal(false);
    });

    it("Should update timestamp when setting KYC", async function () {
      await contract.setKYC(addr1.address, true);
      const timestamp = await contract.getKYCTimestamp(addr1.address);
      expect(timestamp).to.be.gt(0);
    });

    it("Should increment totalKYCCount when setting to true", async function () {
      await contract.setKYC(addr1.address, true);
      expect(await contract.totalKYCCount()).to.equal(1);
    });

    it("Should decrement totalKYCCount when setting to false", async function () {
      await contract.setKYC(addr1.address, true);
      await contract.setKYC(addr1.address, false);
      expect(await contract.totalKYCCount()).to.equal(0);
    });

    it("Should emit KYCUpdated event", async function () {
      await expect(contract.setKYC(addr1.address, true))
        .to.emit(contract, "KYCUpdated")
        .withArgs(addr1.address, true, await getBlockTimestamp());
    });

    it("Should revert when setting zero address", async function () {
      await expect(
        contract.setKYC(ethers.ZeroAddress, true)
      ).to.be.revertedWithCustomError(contract, "ZeroAddressNotAllowed");
    });

    it("Should revert when status is unchanged", async function () {
      await contract.setKYC(addr1.address, true);
      await expect(
        contract.setKYC(addr1.address, true)
      ).to.be.revertedWithCustomError(contract, "StatusUnchanged");
    });

    it("Should revert when called by non-owner", async function () {
      await expect(
        contract.connect(addr1).setKYC(addr2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("batchSetKYC", function () {
    it("Should set KYC for multiple addresses", async function () {
      const addresses = [addr1.address, addr2.address, addr3.address];
      await contract.batchSetKYC(addresses, true);

      expect(await contract.isKYC(addr1.address)).to.equal(true);
      expect(await contract.isKYC(addr2.address)).to.equal(true);
      expect(await contract.isKYC(addr3.address)).to.equal(true);
    });

    it("Should update totalKYCCount correctly", async function () {
      const addresses = [addr1.address, addr2.address, addr3.address];
      await contract.batchSetKYC(addresses, true);
      expect(await contract.totalKYCCount()).to.equal(3);
    });

    it("Should skip addresses with unchanged status", async function () {
      await contract.setKYC(addr1.address, true);
      const addresses = [addr1.address, addr2.address];
      await contract.batchSetKYC(addresses, true);
      expect(await contract.totalKYCCount()).to.equal(2);
    });

    it("Should emit BatchKYCUpdated event", async function () {
      const addresses = [addr1.address, addr2.address];
      await expect(contract.batchSetKYC(addresses, true))
        .to.emit(contract, "BatchKYCUpdated");
    });

    it("Should revert on empty array", async function () {
      await expect(
        contract.batchSetKYC([], true)
      ).to.be.revertedWithCustomError(contract, "EmptyAccountsArray");
    });

    it("Should revert when array contains zero address", async function () {
      const addresses = [addr1.address, ethers.ZeroAddress];
      await expect(
        contract.batchSetKYC(addresses, true)
      ).to.be.revertedWithCustomError(contract, "ZeroAddressNotAllowed");
    });

    it("Should revert when called by non-owner", async function () {
      const addresses = [addr1.address, addr2.address];
      await expect(
        contract.connect(addr1).batchSetKYC(addresses, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert when batch size exceeds limit", async function () {
      // Create array of 101 addresses
      const addresses = [];
      for (let i = 0; i < 101; i++) {
        addresses.push(ethers.Wallet.createRandom().address);
      }
      await expect(
        contract.batchSetKYC(addresses, true)
      ).to.be.revertedWithCustomError(contract, "BatchSizeExceedsLimit");
    });

    it("Should handle duplicate addresses in batch", async function () {
      // Duplicate address should only be counted once
      const addresses = [addr1.address, addr1.address, addr2.address];
      await contract.batchSetKYC(addresses, true);
      
      // Total count should be 2 (not 3) since addr1 is duplicated
      expect(await contract.totalKYCCount()).to.equal(2);
      expect(await contract.isKYC(addr1.address)).to.equal(true);
      expect(await contract.isKYC(addr2.address)).to.equal(true);
    });

    it("Should handle boundary case of exactly 100 addresses", async function () {
      // Create array of exactly 100 addresses
      const addresses = [];
      for (let i = 0; i < 100; i++) {
        addresses.push(ethers.Wallet.createRandom().address);
      }
      
      // Should succeed with exactly 100 addresses
      await expect(contract.batchSetKYC(addresses, true)).to.not.be.reverted;
      expect(await contract.totalKYCCount()).to.equal(100);
    });
  });

  describe("View functions", function () {
    beforeEach(async function () {
      await contract.setKYC(addr1.address, true);
    });

    it("isKYC should return correct status", async function () {
      expect(await contract.isKYC(addr1.address)).to.equal(true);
      expect(await contract.isKYC(addr2.address)).to.equal(false);
    });

    it("getKYCInfo should return status and timestamp", async function () {
      const [status, timestamp] = await contract.getKYCInfo(addr1.address);
      expect(status).to.equal(true);
      expect(timestamp).to.be.gt(0);
    });

    it("getKYCTimestamp should return correct timestamp", async function () {
      const timestamp = await contract.getKYCTimestamp(addr1.address);
      expect(timestamp).to.be.gt(0);
    });

    it("getKYCTimestamp should return 0 for non-KYC address", async function () {
      const timestamp = await contract.getKYCTimestamp(addr2.address);
      expect(timestamp).to.equal(0);
    });

    it("totalKYCCount should return correct count", async function () {
      expect(await contract.totalKYCCount()).to.equal(1);
      await contract.setKYC(addr2.address, true);
      expect(await contract.totalKYCCount()).to.equal(2);
    });

    it("batchIsKYC should return correct statuses for multiple addresses", async function () {
      await contract.setKYC(addr2.address, true);
      const addresses = [addr1.address, addr2.address, addr3.address];
      const statuses = await contract.batchIsKYC(addresses);
      
      expect(statuses[0]).to.equal(true);  // addr1 is KYC'd in beforeEach
      expect(statuses[1]).to.equal(true);  // addr2 is KYC'd above
      expect(statuses[2]).to.equal(false); // addr3 is not KYC'd
    });

    it("batchIsKYC should return empty array for empty input", async function () {
      const statuses = await contract.batchIsKYC([]);
      expect(statuses.length).to.equal(0);
    });
  });

  describe("Pausable", function () {
    it("Owner should be able to pause", async function () {
      await contract.pause();
      expect(await contract.paused()).to.equal(true);
    });

    it("Owner should be able to unpause", async function () {
      await contract.pause();
      await contract.unpause();
      expect(await contract.paused()).to.equal(false);
    });

    it("Non-owner should not be able to pause", async function () {
      await expect(
        contract.connect(addr1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Non-owner should not be able to unpause", async function () {
      await contract.pause();
      await expect(
        contract.connect(addr1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("setKYC should revert when paused", async function () {
      await contract.pause();
      await expect(
        contract.setKYC(addr1.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("batchSetKYC should revert when paused", async function () {
      await contract.pause();
      await expect(
        contract.batchSetKYC([addr1.address], true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("View functions should work when paused", async function () {
      await contract.setKYC(addr1.address, true);
      await contract.pause();
      
      // These should not revert
      expect(await contract.isKYC(addr1.address)).to.equal(true);
      expect(await contract.totalKYCCount()).to.equal(1);
      const [status, timestamp] = await contract.getKYCInfo(addr1.address);
      expect(status).to.equal(true);
    });
  });

  describe("Access Control", function () {
    it("Only owner can call setKYC", async function () {
      await expect(
        contract.connect(addr1).setKYC(addr2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can call batchSetKYC", async function () {
      await expect(
        contract.connect(addr1).batchSetKYC([addr2.address], true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can pause", async function () {
      await expect(
        contract.connect(addr1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can unpause", async function () {
      await contract.pause();
      await expect(
        contract.connect(addr1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Owner can transfer ownership", async function () {
      await contract.transferOwnership(addr1.address);
      expect(await contract.owner()).to.equal(addr1.address);
    });

    it("New owner can set KYC", async function () {
      await contract.transferOwnership(addr1.address);
      await contract.connect(addr1).setKYC(addr2.address, true);
      expect(await contract.isKYC(addr2.address)).to.equal(true);
    });
  });

  // Helper function to get block timestamp
  async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
