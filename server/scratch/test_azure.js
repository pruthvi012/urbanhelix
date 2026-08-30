require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');

async function testAzure() {
    try {
        console.log('🔄 Testing Azure Blob Storage connection...');
        console.log('   Account: urbanhelixstorage123');
        console.log('   Container:', process.env.AZURE_STORAGE_CONTAINER);

        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);

        // Create container if it doesn't exist
        const createResult = await containerClient.createIfNotExists({ access: 'blob' });
        if (createResult.succeeded) {
            console.log('📦 Container created successfully!');
        } else {
            console.log('📦 Container already exists ✓');
        }

        // Upload a test file
        const testBlob = containerClient.getBlockBlobClient('test/connection-test.txt');
        const testContent = 'UrbanHeliX Azure Connection Test - ' + new Date().toISOString();
        await testBlob.upload(testContent, testContent.length, {
            blobHTTPHeaders: { blobContentType: 'text/plain' }
        });

        console.log('');
        console.log('✅ Azure Blob Storage CONNECTED SUCCESSFULLY!');
        console.log('📎 Test file URL:', testBlob.url);

        // Clean up test file
        await testBlob.deleteIfExists();
        console.log('🧹 Test file cleaned up');

    } catch (err) {
        console.error('❌ Azure Connection Failed:', err.message);
    }
}

testAzure();
