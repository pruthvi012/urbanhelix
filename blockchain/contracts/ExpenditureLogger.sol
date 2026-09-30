// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title UrbanHelixX Expenditure Logger
/// @notice Permanently records expenditure hashes on Polygon for tamper-proof public audit
contract ExpenditureLogger {

    struct ExpenditureRecord {
        string  projectCode;
        string  vendor;
        uint256 amount;
        bytes32 sha256Hash;
        uint256 timestamp;
        address loggedBy;
    }

    ExpenditureRecord[] public records;

    event ExpenditureLogged(
        uint256 indexed id,
        string  projectCode,
        string  vendor,
        uint256 amount,
        bytes32 sha256Hash,
        uint256 timestamp
    );

    function logExpenditure(
        string  calldata projectCode,
        string  calldata vendor,
        uint256 amount,
        bytes32 sha256Hash
    ) external returns (uint256 id) {
        id = records.length;
        records.push(ExpenditureRecord({
            projectCode: projectCode,
            vendor:      vendor,
            amount:      amount,
            sha256Hash:  sha256Hash,
            timestamp:   block.timestamp,
            loggedBy:    msg.sender
        }));
        emit ExpenditureLogged(id, projectCode, vendor, amount, sha256Hash, block.timestamp);
    }

    function getRecord(uint256 id) external view returns (ExpenditureRecord memory) {
        require(id < records.length, "Record does not exist");
        return records[id];
    }

    function totalRecords() external view returns (uint256) {
        return records.length;
    }
}
