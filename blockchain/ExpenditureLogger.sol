// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ExpenditureLogger {
    struct ExpenditureRecord {
        string projectCode;
        string vendor;
        uint256 amount;
        string sha256Hash;
        uint256 timestamp;
        address loggedBy;
    }

    mapping(string => ExpenditureRecord) public records;

    event ExpenditureLogged(
        string indexed expenditureId,
        string indexed projectCode,
        string sha256Hash,
        uint256 timestamp
    );

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'Only owner can log expenditures');
        _;
    }

    function logExpenditure(
        string memory _expenditureId,
        string memory _projectCode,
        string memory _vendor,
        uint256 _amount,
        string memory _sha256Hash
    ) external onlyOwner {
        require(bytes(records[_expenditureId].sha256Hash).length == 0, 'Expenditure already logged');

        records[_expenditureId] = ExpenditureRecord({
            projectCode: _projectCode,
            vendor: _vendor,
            amount: _amount,
            sha256Hash: _sha256Hash,
            timestamp: block.timestamp,
            loggedBy: msg.sender
        });

        emit ExpenditureLogged(_expenditureId, _projectCode, _sha256Hash, block.timestamp);
    }
}