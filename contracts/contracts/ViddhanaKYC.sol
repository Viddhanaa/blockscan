// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ViddhanaKYC
 * @dev Smart contract for managing KYC (Know Your Customer) status on the Viddhana blockchain
 * @notice This contract allows the owner to set and manage KYC status for addresses
 */
contract ViddhanaKYC is Ownable, Pausable {
    // Custom errors for gas optimization
    error ZeroAddressNotAllowed();
    error StatusUnchanged();
    error EmptyAccountsArray();
    error BatchSizeExceedsLimit();

    // Private mappings for KYC data
    mapping(address => bool) private _kycStatus;
    mapping(address => uint256) private _kycTimestamp;
    
    // Counter for total KYC verified addresses
    uint256 private _totalKYCCount;

    // Events
    event KYCUpdated(address indexed account, bool status, uint256 timestamp);
    event BatchKYCUpdated(address[] accounts, bool status, uint256 timestamp);

    /**
     * @dev Constructor that sets the deployer as the initial owner
     */
    constructor() Ownable() {}

    /**
     * @dev Sets KYC status for a single address
     * @param account The address to set KYC status for
     * @param status The KYC status (true = verified, false = not verified)
     */
    function setKYC(address account, bool status) external onlyOwner whenNotPaused {
        if (account == address(0)) revert ZeroAddressNotAllowed();
        if (_kycStatus[account] == status) revert StatusUnchanged();

        // Update counter
        if (status && !_kycStatus[account]) {
            _totalKYCCount++;
        } else if (!status && _kycStatus[account]) {
            _totalKYCCount--;
        }

        _kycStatus[account] = status;
        _kycTimestamp[account] = block.timestamp;

        emit KYCUpdated(account, status, block.timestamp);
    }

    /**
     * @dev Sets KYC status for multiple addresses in a single transaction
     * @param accounts Array of addresses to set KYC status for
     * @param status The KYC status to apply to all addresses
     */
    function batchSetKYC(address[] calldata accounts, bool status) external onlyOwner whenNotPaused {
        uint256 len = accounts.length;
        if (len == 0) revert EmptyAccountsArray();
        if (len > 100) revert BatchSizeExceedsLimit();

        uint256 timestamp = block.timestamp;

        for (uint256 i = 0; i < len; ) {
            address account = accounts[i];
            if (account == address(0)) revert ZeroAddressNotAllowed();
            
            // Skip if status is unchanged
            if (_kycStatus[account] == status) {
                unchecked { ++i; }
                continue;
            }

            // Update counter
            if (status && !_kycStatus[account]) {
                _totalKYCCount++;
            } else if (!status && _kycStatus[account]) {
                _totalKYCCount--;
            }

            _kycStatus[account] = status;
            _kycTimestamp[account] = timestamp;
            
            unchecked { ++i; }
        }

        emit BatchKYCUpdated(accounts, status, timestamp);
    }

    /**
     * @dev Checks if an address has KYC verification
     * @param account The address to check
     * @return bool True if the address is KYC verified
     */
    function isKYC(address account) external view returns (bool) {
        return _kycStatus[account];
    }

    /**
     * @dev Checks KYC status for multiple addresses in a single call
     * @param accounts Array of addresses to check
     * @return statuses Array of boolean KYC statuses
     */
    function batchIsKYC(address[] calldata accounts) external view returns (bool[] memory) {
        uint256 len = accounts.length;
        bool[] memory statuses = new bool[](len);
        for (uint256 i = 0; i < len; ) {
            statuses[i] = _kycStatus[accounts[i]];
            unchecked { ++i; }
        }
        return statuses;
    }

    /**
     * @dev Gets complete KYC information for an address
     * @param account The address to query
     * @return status The KYC status
     * @return timestamp The timestamp when KYC was last updated
     */
    function getKYCInfo(address account) external view returns (bool status, uint256 timestamp) {
        return (_kycStatus[account], _kycTimestamp[account]);
    }

    /**
     * @dev Gets the timestamp when KYC was last updated for an address
     * @param account The address to query
     * @return The timestamp of the last KYC update
     */
    function getKYCTimestamp(address account) external view returns (uint256) {
        return _kycTimestamp[account];
    }

    /**
     * @dev Returns the total count of KYC verified addresses
     * @return The total number of addresses with active KYC status
     */
    function totalKYCCount() external view returns (uint256) {
        return _totalKYCCount;
    }

    /**
     * @dev Pauses all KYC operations
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all KYC operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}
