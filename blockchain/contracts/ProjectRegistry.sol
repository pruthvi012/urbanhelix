// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ProjectRegistry
 * @dev Registers and tracks municipal infrastructure projects on-chain
 * @notice Part of UrbanHeliX - Transparent Municipal Governance Platform
 */
contract ProjectRegistry {
    enum ProjectStatus { Proposed, Approved, InProgress, Verification, Completed, Rejected }

    struct Project {
        uint256 id;
        string mongoId;        // MongoDB ObjectId reference
        string title;
        string departmentId;
        uint256 estimatedBudget;
        uint256 allocatedBudget;
        ProjectStatus status;
        string dataHash;       // SHA-256 hash of full project data
        address createdBy;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    struct StatusChange {
        uint256 projectId;
        ProjectStatus oldStatus;
        ProjectStatus newStatus;
        string remarks;
        address changedBy;
        uint256 timestamp;
    }

    mapping(uint256 => Project) public projects;
    StatusChange[] public statusChanges;
    uint256 public projectCount;

    address public admin;

    event ProjectCreated(uint256 indexed projectId, string mongoId, string title, uint256 estimatedBudget, string dataHash, address createdBy, uint256 timestamp);
    event ProjectApproved(uint256 indexed projectId, uint256 allocatedBudget, address approvedBy, uint256 timestamp);
    event ProjectStatusChanged(uint256 indexed projectId, uint8 oldStatus, uint8 newStatus, string remarks, address changedBy, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Register a new project on the blockchain
     */
    function createProject(
        string memory _mongoId,
        string memory _title,
        string memory _departmentId,
        uint256 _estimatedBudget,
        string memory _dataHash
    ) external returns (uint256) {
        uint256 projectId = projectCount;

        projects[projectId] = Project({
            id: projectId,
            mongoId: _mongoId,
            title: _title,
            departmentId: _departmentId,
            estimatedBudget: _estimatedBudget,
            allocatedBudget: 0,
            status: ProjectStatus.Proposed,
            dataHash: _dataHash,
            createdBy: msg.sender,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });

        projectCount++;
        emit ProjectCreated(projectId, _mongoId, _title, _estimatedBudget, _dataHash, msg.sender, block.timestamp);
        return projectId;
    }

    /**
     * @dev Approve a project with budget allocation
     */
    function approveProject(uint256 _projectId, uint256 _allocatedBudget, string memory _remarks) external onlyAdmin {
        require(projects[_projectId].exists, "Project does not exist");
        require(projects[_projectId].status == ProjectStatus.Proposed, "Project is not in Proposed state");

        Project storage p = projects[_projectId];
        ProjectStatus oldStatus = p.status;
        p.status = ProjectStatus.Approved;
        p.allocatedBudget = _allocatedBudget;
        p.updatedAt = block.timestamp;

        statusChanges.push(StatusChange({
            projectId: _projectId,
            oldStatus: oldStatus,
            newStatus: ProjectStatus.Approved,
            remarks: _remarks,
            changedBy: msg.sender,
            timestamp: block.timestamp
        }));

        emit ProjectApproved(_projectId, _allocatedBudget, msg.sender, block.timestamp);
        emit ProjectStatusChanged(_projectId, uint8(oldStatus), uint8(ProjectStatus.Approved), _remarks, msg.sender, block.timestamp);
    }

    /**
     * @dev Update project status
     */
    function updateStatus(uint256 _projectId, uint8 _newStatus, string memory _remarks) external onlyAdmin {
        require(projects[_projectId].exists, "Project does not exist");
        require(_newStatus <= uint8(ProjectStatus.Rejected), "Invalid status");

        Project storage p = projects[_projectId];
        ProjectStatus oldStatus = p.status;
        p.status = ProjectStatus(_newStatus);
        p.updatedAt = block.timestamp;

        statusChanges.push(StatusChange({
            projectId: _projectId,
            oldStatus: oldStatus,
            newStatus: ProjectStatus(_newStatus),
            remarks: _remarks,
            changedBy: msg.sender,
            timestamp: block.timestamp
        }));

        emit ProjectStatusChanged(_projectId, uint8(oldStatus), _newStatus, _remarks, msg.sender, block.timestamp);
    }

    /**
     * @dev Get project details
     */
    function getProject(uint256 _projectId) external view returns (
        string memory mongoId,
        string memory title,
        uint256 estimatedBudget,
        uint256 allocatedBudget,
        uint8 status,
        string memory dataHash,
        uint256 createdAt
    ) {
        require(projects[_projectId].exists, "Project does not exist");
        Project memory p = projects[_projectId];
        return (p.mongoId, p.title, p.estimatedBudget, p.allocatedBudget, uint8(p.status), p.dataHash, p.createdAt);
    }

    /**
     * @dev Verify project data integrity by comparing hashes
     */
    function verifyProjectData(uint256 _projectId, string memory _dataHash) external view returns (bool) {
        require(projects[_projectId].exists, "Project does not exist");
        return keccak256(bytes(projects[_projectId].dataHash)) == keccak256(bytes(_dataHash));
    }

    /**
     * @dev Get total status changes count
     */
    function getStatusChangeCount() external view returns (uint256) {
        return statusChanges.length;
    }
}
