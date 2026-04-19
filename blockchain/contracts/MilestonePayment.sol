// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MilestonePayment
 * @dev Manages milestone submissions and dual-approval payment flow
 * @notice Part of UrbanHeliX - Transparent Municipal Governance Platform
 */
contract MilestonePayment {
    enum MilestoneStatus { Pending, Submitted, EngineerApproved, FinancialApproved, Paid, Rejected }

    struct Milestone {
        uint256 id;
        uint256 projectId;
        string mongoId;         // MongoDB ObjectId reference
        string title;
        uint256 amount;
        MilestoneStatus status;
        string proofHash;       // SHA-256 hash of proof documents
        address submittedBy;
        address engineerApprover;
        address financialApprover;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 paidAt;
        bool exists;
    }

    struct Payment {
        uint256 milestoneId;
        uint256 projectId;
        uint256 amount;
        address approvedBy;
        uint256 timestamp;
        string transactionRef;
    }

    mapping(uint256 => Milestone) public milestones;
    Payment[] public payments;
    uint256 public milestoneCount;
    uint256 public totalPayments;
    uint256 public totalAmountPaid;

    address public admin;

    event MilestoneSubmitted(uint256 indexed milestoneId, uint256 indexed projectId, string title, uint256 amount, string proofHash, address submittedBy, uint256 timestamp);
    event MilestoneApprovedByEngineer(uint256 indexed milestoneId, address approvedBy, uint256 timestamp);
    event MilestoneApprovedByFinance(uint256 indexed milestoneId, address approvedBy, uint256 timestamp);
    event PaymentReleased(uint256 indexed milestoneId, uint256 indexed projectId, uint256 amount, address approvedBy, uint256 timestamp);
    event MilestoneRejected(uint256 indexed milestoneId, string reason, address rejectedBy, uint256 timestamp);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Submit a new milestone
     */
    function submitMilestone(
        uint256 _projectId,
        string memory _mongoId,
        string memory _title,
        uint256 _amount,
        string memory _proofHash
    ) external returns (uint256) {
        uint256 msId = milestoneCount;

        milestones[msId] = Milestone({
            id: msId,
            projectId: _projectId,
            mongoId: _mongoId,
            title: _title,
            amount: _amount,
            status: MilestoneStatus.Submitted,
            proofHash: _proofHash,
            submittedBy: msg.sender,
            engineerApprover: address(0),
            financialApprover: address(0),
            submittedAt: block.timestamp,
            approvedAt: 0,
            paidAt: 0,
            exists: true
        });

        milestoneCount++;
        emit MilestoneSubmitted(msId, _projectId, _title, _amount, _proofHash, msg.sender, block.timestamp);
        return msId;
    }

    /**
     * @dev Engineer approves milestone (Stage 1)
     */
    function engineerApprove(uint256 _msId) external onlyAdmin {
        require(milestones[_msId].exists, "Milestone does not exist");
        require(milestones[_msId].status == MilestoneStatus.Submitted, "Not in submitted state");

        milestones[_msId].status = MilestoneStatus.EngineerApproved;
        milestones[_msId].engineerApprover = msg.sender;
        milestones[_msId].approvedAt = block.timestamp;

        emit MilestoneApprovedByEngineer(_msId, msg.sender, block.timestamp);
    }

    /**
     * @dev Financial officer approves milestone (Stage 2) + releases payment
     */
    function financialApproveAndPay(uint256 _msId, string memory _txRef) external onlyAdmin {
        require(milestones[_msId].exists, "Milestone does not exist");
        require(milestones[_msId].status == MilestoneStatus.EngineerApproved, "Not engineer-approved yet");

        Milestone storage ms = milestones[_msId];
        ms.status = MilestoneStatus.Paid;
        ms.financialApprover = msg.sender;
        ms.paidAt = block.timestamp;

        payments.push(Payment({
            milestoneId: _msId,
            projectId: ms.projectId,
            amount: ms.amount,
            approvedBy: msg.sender,
            timestamp: block.timestamp,
            transactionRef: _txRef
        }));

        totalPayments++;
        totalAmountPaid += ms.amount;

        emit MilestoneApprovedByFinance(_msId, msg.sender, block.timestamp);
        emit PaymentReleased(_msId, ms.projectId, ms.amount, msg.sender, block.timestamp);
    }

    /**
     * @dev Reject a milestone
     */
    function rejectMilestone(uint256 _msId, string memory _reason) external onlyAdmin {
        require(milestones[_msId].exists, "Milestone does not exist");
        milestones[_msId].status = MilestoneStatus.Rejected;
        emit MilestoneRejected(_msId, _reason, msg.sender, block.timestamp);
    }

    /**
     * @dev Verify milestone proof integrity
     */
    function verifyProof(uint256 _msId, string memory _proofHash) external view returns (bool) {
        require(milestones[_msId].exists, "Milestone does not exist");
        return keccak256(bytes(milestones[_msId].proofHash)) == keccak256(bytes(_proofHash));
    }

    /**
     * @dev Get milestone details
     */
    function getMilestone(uint256 _msId) external view returns (
        uint256 projectId,
        string memory title,
        uint256 amount,
        uint8 status,
        string memory proofHash,
        address submittedBy,
        uint256 submittedAt
    ) {
        require(milestones[_msId].exists, "Milestone does not exist");
        Milestone memory ms = milestones[_msId];
        return (ms.projectId, ms.title, ms.amount, uint8(ms.status), ms.proofHash, ms.submittedBy, ms.submittedAt);
    }

    /**
     * @dev Get payment count
     */
    function getPaymentCount() external view returns (uint256) {
        return payments.length;
    }
}
