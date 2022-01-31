# Basic CDK Deployment that has Lambda, API Gateawy, S3, and Lambda

Basic CDK Deployment script that creates a couple components, as well integration between the components.

Items it creates:

1. S3 bucket (With public read access) to act as a front end for a website
2. API Gateway that is able to make post requests to a DynamoDB table to receive data
3. DynamoDB Table that houses data
4. Lambda that can make input data into DynamoDB table. An example entry json file is included in the lambda for testing purposes of DB functionality. 