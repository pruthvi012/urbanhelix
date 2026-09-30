// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ExpenditureLogger {
    event ExpenditureLogged(
        string projectCode,
        string vendor,
        uint256 amount,
        string sha256Hash,
        uint256 timestamp,
        address loggedBy
    );

    function logExpenditure(
        string memory projectCode,
        string memory vendor,
        uint256 amount,
        string memory sha256Hash
    ) public {
        emit ExpenditureLogged(projectCode, vendor, amount, sha256Hash, block.timestamp, msg.sender);
    }
}
