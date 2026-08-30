require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');

async function uploadProof() {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);

    // Upload an HTML file that looks nice when opened in browser
    const htmlContent = `<!DOCTYPE html>
<html>
<head><title>UrbanHeliX - Azure Verification</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:white;text-align:center">
<div>
    <h1 style="font-size:48px">🏛️ UrbanHeliX</h1>
    <h2 style="color:#2dd4bf">✅ Azure Blob Storage Connected!</h2>
    <p style="color:#94a3b8;font-size:18px">Storage Account: <strong>urbanhelixstorage123</strong></p>
    <p style="color:#94a3b8;font-size:18px">Container: <strong>urbanhelix-files</strong></p>
    <p style="color:#94a3b8;font-size:18px">Region: <strong>Azure Cloud</strong></p>
    <p style="color:#64748b;margin-top:40px">Verified at: ${new Date().toISOString()}</p>
    <p style="color:#64748b">This file is hosted on Microsoft Azure Blob Storage</p>
</div>
</body>
</html>`;

    const blobClient = containerClient.getBlockBlobClient('verification/urbanhelix-azure-proof.html');
    await blobClient.upload(htmlContent, htmlContent.length, {
        blobHTTPHeaders: { blobContentType: 'text/html' }
    });

    console.log('');
    console.log('✅ Verification file uploaded to Azure!');
    console.log('');
    console.log('👉 OPEN THIS LINK IN YOUR BROWSER:');
    console.log('');
    console.log(blobClient.url);
    console.log('');
}

uploadProof();
