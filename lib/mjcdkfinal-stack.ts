import { AwsIntegration, Cors, RestApi } from '@aws-cdk/aws-apigateway';
import { AttributeType, Table, BillingMode } from '@aws-cdk/aws-dynamodb';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import { BucketDeployment , Source} from '@aws-cdk/aws-s3-deployment';
import { Construct, RemovalPolicy, Stack, StackProps } from '@aws-cdk/core';

// See README for more info of what is here. Created as part of a coding interview challenge. 
// Things to improve on: S3 proper integartion with API Gateway
// Lambda cleansing of data prior to DynamoDB ingest


export class MjcdkfinalStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Table name and reference for ID entries
    const modelName = 'baseball';

    // Creation of Dynamo DB Table
    const dynamoTable = new Table(this, modelName, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: `${modelName}Id`,
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: modelName,
    });

    // Creation of get / scan policy (For s3 front end website usage) as well as put policy for Lambda usage
    const getPolicy = new Policy(this, 'getPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:GetItem'],
          effect: Effect.ALLOW,
          resources: [dynamoTable.tableArn],
        }),
      ],
    });

    const putPolicy = new Policy(this, 'putPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:PutItem'],
          effect: Effect.ALLOW,
          resources: [dynamoTable.tableArn],
        }),
      ],
    });

    const scanPolicy = new Policy(this, 'scanPolicy', {
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:Scan'],
          effect: Effect.ALLOW,
          resources: [dynamoTable.tableArn],
        }),
      ],
    });

    // Creation of roles used by different policies
    const getRole = new Role(this, 'getRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    getRole.attachInlinePolicy(getPolicy);
    const scanRole = new Role(this, 'scanRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    scanRole.attachInlinePolicy(scanPolicy);
    const putRole = new Role(this, 'putRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    putRole.attachInlinePolicy(putPolicy);

    //Creation of API Gateway
    const api = new RestApi(this, `${modelName}Api`, {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
      },
      
      restApiName: `${modelName} Service`,
    });

    // code for status codes for API Gateway requests
    const errorResponses = [
      {
        selectionPattern: '400',
        statusCode: '400',
        responseTemplates: {
          'application/json': `{
            "error": "Bad input!"
          }`,
        },
      },
      {
        selectionPattern: '5\\d{2}',
        statusCode: '500',
        responseTemplates: {
          'application/json': `{
            "error": "Internal Service Error!"
          }`,
        },
      },
    ];

    // Different Integration responses used for mapping templates and actions when hitting different gateway endpoints
    const integrationResponses = [
      {
        statusCode: '200',
      },
      ...errorResponses,
    ];

    const allResources = api.root.addResource(modelName.toLocaleLowerCase());

    const oneResource = allResources.addResource('{id}');

    const getAllIntegration = new AwsIntegration({
      action: 'Scan',
      options: {
        credentialsRole: scanRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "TableName": "${modelName}"
            }`,
        },
      },
      service: 'dynamodb',
    });

    const getIntegration = new AwsIntegration({
      action: 'GetItem',
      options: {
        credentialsRole: getRole,
        integrationResponses,
        requestTemplates: {
          'application/json': `{
              "Key": {
                "${modelName}Id": {
                  "S": "$method.request.path.id"
                }
              },
              "TableName": "${modelName}"
            }`,
        },
      },
      service: 'dynamodb',
    });


    const methodOptions = { methodResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }] };

    // Add different get Methods used by API Gateway
    allResources.addMethod('GET', getAllIntegration, methodOptions);
    oneResource.addMethod('GET', getIntegration, methodOptions);

    // Creation of Lambda function; see lambda folder for file. Passes in DynamoDB table to put into, as well as role needed for put requests
    const dynoExport = new Function(this, id, {
      role: putRole,
      environment: {
        TABLE_NAME: dynamoTable.tableName,
      },
      runtime: Runtime.NODEJS_14_X,
      code: Code.fromAsset('lambda'),
      handler: 'index.handler'
    });

    // Creation of S3 bucket and adds basic hello world HTML "website". Was trying to get website to dynamically call the Post API Gateway endpoinds, but wasn't able to get anything going, so decided to leave it as a hello world website. 
    const s3Bucket = new Bucket(this, 'frontEnd_mj_cdk', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: false,
      publicReadAccess: true,
      encryption: BucketEncryption.S3_MANAGED
    });

    new BucketDeployment(this, 'DeployFiles', {
      sources: [Source.asset('./html')],
      destinationBucket: s3Bucket,
    });
  }
}