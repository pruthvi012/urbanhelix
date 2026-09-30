const mongoose = require("mongoose");

const blockchainQueueSchema = new mongoose.Schema({
  expenditureId: { type: mongoose.Schema.Types.ObjectId, required: true },
  projectId:     { type: mongoose.Schema.Types.ObjectId, required: true },
  projectCode:   { type: String, required: true },
  vendor:        { type: String, required: true },
  amount:        { type: Number, required: true },
  sha256Hash:    { type: String, required: true },
  status:        { type: String, enum: ["pending", "done", "failed_permanent"], default: "pending" },
  retries:       { type: Number, default: 0 },
  maxRetries:    { type: Number, default: 50 },
  txHash:        { type: String, default: null },
  onChainId:     { type: Number, default: null },
  lastAttempt:   { type: Date, default: null },
  errorMessage:  { type: String, default: null },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model("BlockchainQueue", blockchainQueueSchema);
