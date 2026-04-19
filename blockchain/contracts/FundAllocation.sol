// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FundAllocation
 * @dev Manages municipal fund allocations across departments
 * @notice Part of UrbanHeliX - Transparent Municipal Governance Platform
 */
contract FundAllocation {
    struct Budget {
        string departmentId;
        string departmentName;
        uint256 totalBudget;
        uint256 allocatedBudget;
        uint256 spentBudget;
        string fiscalYear;
        uint256 timestamp;
        bool exists;
    }

    struct Allocation {
        uint256 id;
        string departmentId;
        uint256 amount;
        string description;
        address allocatedBy;
        uint256 timestamp;
    }

    mapping(string => Budget) public budgets;
    Allocation[] public allocations;
    string[] public departmentIds;

    address public admin;
    uint256 public totalAllocations;

    event BudgetCreated(string indexed departmentId, string departmentName, uint256 totalBudget, string fiscalYear);
    event FundAllocated(uint256 indexed allocationId, string indexed departmentId, uint256 amount, string description, address allocatedBy, uint256 timestamp);
    event BudgetUpdated(string indexed departmentId, uint256 newTotal, uint256 allocated, uint256 spent);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Create a new department budget
     */
    function createBudget(
        string memory _deptId,
        string memory _deptName,
        uint256 _totalBudget,
        string memory _fiscalYear
    ) external onlyAdmin {
        require(!budgets[_deptId].exists, "Budget already exists for this department");

        budgets[_deptId] = Budget({
            departmentId: _deptId,
            departmentName: _deptName,
            totalBudget: _totalBudget,
            allocatedBudget: 0,
            spentBudget: 0,
            fiscalYear: _fiscalYear,
            timestamp: block.timestamp,
            exists: true
        });

        departmentIds.push(_deptId);
        emit BudgetCreated(_deptId, _deptName, _totalBudget, _fiscalYear);
    }

    /**
     * @dev Allocate funds to a department
     */
    function allocateFund(
        string memory _deptId,
        uint256 _amount,
        string memory _description
    ) external onlyAdmin {
        require(budgets[_deptId].exists, "Department budget does not exist");
        require(
            budgets[_deptId].allocatedBudget + _amount <= budgets[_deptId].totalBudget,
            "Allocation exceeds total budget"
        );

        budgets[_deptId].allocatedBudget += _amount;

        uint256 allocationId = totalAllocations;
        allocations.push(Allocation({
            id: allocationId,
            departmentId: _deptId,
            amount: _amount,
            description: _description,
            allocatedBy: msg.sender,
            timestamp: block.timestamp
        }));

        totalAllocations++;
        emit FundAllocated(allocationId, _deptId, _amount, _description, msg.sender, block.timestamp);
    }

    /**
     * @dev Record expenditure against a department
     */
    function recordExpenditure(string memory _deptId, uint256 _amount) external onlyAdmin {
        require(budgets[_deptId].exists, "Department budget does not exist");
        budgets[_deptId].spentBudget += _amount;
        emit BudgetUpdated(_deptId, budgets[_deptId].totalBudget, budgets[_deptId].allocatedBudget, budgets[_deptId].spentBudget);
    }

    /**
     * @dev Get budget details for a department
     */
    function getBudget(string memory _deptId) external view returns (
        string memory departmentName,
        uint256 totalBudget,
        uint256 allocatedBudget,
        uint256 spentBudget,
        string memory fiscalYear
    ) {
        require(budgets[_deptId].exists, "Budget does not exist");
        Budget memory b = budgets[_deptId];
        return (b.departmentName, b.totalBudget, b.allocatedBudget, b.spentBudget, b.fiscalYear);
    }

    /**
     * @dev Get allocation count
     */
    function getAllocationCount() external view returns (uint256) {
        return allocations.length;
    }

    /**
     * @dev Get department count
     */
    function getDepartmentCount() external view returns (uint256) {
        return departmentIds.length;
    }
}
