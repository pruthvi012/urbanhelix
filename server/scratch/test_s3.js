const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

async function testS3() {
    try {
        console.log('Testing S3 connection to bucket:', process.env.S3_BUCKET_NAME);
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'test-connection.txt',
            Body: 'Hello from UrbanHelix!'
        });
        
        const response = await s3.send(command);
        console.log('✅ S3 Upload Successful!', response);
    } catch (err) {
        console.error('❌ S3 Upload Failed:', err.message);
        if (err.message.includes('Access Control List (ACL)')) {
            console.error('\n--> IT LOOKS LIKE YOUR BUCKET BLOCKS PUBLIC ACLs! This is a common issue.');
        }
    }
}

testS3();
