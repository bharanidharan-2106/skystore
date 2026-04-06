const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

class S3Service {
    async uploadFile(fileBuffer, fileName, folderPath = '') {
        try {
            console.log('📤 Uploading to S3:', fileName);
            
            const key = folderPath ? `${folderPath}/${fileName}` : fileName;
            
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: fileBuffer,
                ContentType: 'application/octet-stream'
            };

            const result = await s3.upload(params).promise();
            console.log('✅ S3 Upload successful:', result.Location);
            
            return {
                key: result.Key,
                url: result.Location,
                etag: result.ETag
            };
        } catch (error) {
            console.error('❌ S3 Upload failed:', error);
            throw new Error(`S3 Upload failed: ${error.message}`);
        }
    }

    async downloadFile(fileKey) {
        try {
            console.log('📥 Downloading from S3:', fileKey);
            
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: fileKey
            };

            const result = await s3.getObject(params).promise();
            console.log('✅ S3 Download successful');
            
            return result.Body;
        } catch (error) {
            console.error('❌ S3 Download failed:', error);
            throw new Error(`S3 Download failed: ${error.message}`);
        }
    }

    async deleteFile(fileKey) {
        try {
            console.log('🗑️ Deleting from S3:', fileKey);
            
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: fileKey
            };

            await s3.deleteObject(params).promise();
            console.log('✅ S3 Delete successful');
            
            return true;
        } catch (error) {
            console.error('❌ S3 Delete failed:', error);
            throw new Error(`S3 Delete failed: ${error.message}`);
        }
    }

    async createFolder(folderPath) {
        try {
            console.log('📁 Creating S3 folder:', folderPath);
            
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: `${folderPath}/`, // S3 folders end with /
                Body: ''
            };

            await s3.putObject(params).promise();
            console.log('✅ S3 Folder created');
            
            return true;
        } catch (error) {
            console.error('❌ Folder creation failed:', error);
            throw new Error(`Folder creation failed: ${error.message}`);
        }
    }
}

module.exports = new S3Service();