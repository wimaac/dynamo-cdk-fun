let response;
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

// Lambda takes in requests and pushes up to DynamoDB table. In this basic lambda, format is assumed to be correct. Would need to add portion of code to cleanup prior to DynamoDB Puts, but that was out of scope. 
exports.handler = async (event, context) => {
    let promises = [];
    try {
        event.forEach(item => {
            const params = {
                TableName: TABLE_NAME,
                Item: item,
            };
            promises.push(dynamoDb.put(params).promise());
        });
        await Promise.all(promises);
        response = {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'File Imported',
            })
        }
    } catch (err) {
        console.log(err);
        throw err;
    }

    return response
};
