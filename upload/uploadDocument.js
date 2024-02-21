const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  const requestBody = JSON.parse(event.body);
  const base64File = requestBody.file; 
  const contentType = requestBody.contentType;

  const buffer = Buffer.from(base64File, 'base64');
  const fileExtension = contentType === 'image/png' ? 'png' : (contentType === 'application/pdf' ? 'pdf' : 'folder');
  const fileName = `file_${Date.now()}.${fileExtension}`;
  const folder = 'workflow_DMS';

  const params = {
    Bucket: 'workflow-lambda-dev-serverlessdeploymentbucket-ygpfd8ufe19x',
    Key: `${folder}/${fileName}`,
    Body: buffer,
    ContentType: contentType,
  };
  try {
    await s3.upload(params).promise();
    const fileUrl = `s3://workflow-lambda-dev-serverlessdeploymentbucket-ygpfd8ufe19x/workflow_DMS/${folder}/${fileName}`;
    return {
      statusCode: 200,
      body: JSON.stringify({ fileUrl }),
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to upload file', details: error.message }),
    };
  }
};
