const mongoose = require('mongoose');
const Project = require('./models/Project');
const FundTransaction = require('./models/FundTransaction');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const syncFunds = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find approved or in_progress projects that don't have an allocation transaction
        const projects = await Project.find({ 
            status: { $in: ['approved', 'in_progress', 'completed'] },
            department: { $ne: null }
        });

        console.log(`Checking ${projects.length} projects for missing transactions...`);

        let createdCount = 0;
        for (const project of projects) {
            const existing = await FundTransaction.findOne({ 
                project: project._id, 
                type: 'allocation' 
            });

            if (!existing) {
                await FundTransaction.create({
                    type: 'allocation',
                    from: {
                        entityType: 'department',
                        entityId: project.department,
                        name: 'Ward Fund',
                    },
                    to: {
                        entityType: 'project',
                        entityId: project._id,
                        name: project.title,
                    },
                    amount: project.allocatedBudget || project.estimatedBudget,
                    description: `Retroactive budget allocation for: ${project.title}`,
                    project: project._id,
                    status: 'approved',
                    initiatedBy: project.engineer || project.proposedBy, // fallback
                });
                createdCount++;
            }
        }

        console.log(`✅ Created ${createdCount} missing fund transactions.`);
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
};

syncFunds();
