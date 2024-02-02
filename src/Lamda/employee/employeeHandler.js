
const {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    DeleteItemCommand,
    ScanCommand,
    UpdateItemCommand,
  } = require('@aws-sdk/client-dynamodb');
  const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb'); 
  
  const client = new DynamoDBClient();

const getAllEmployees = async () => {
    const response = { statusCode: 200 };
    //const resource = event.resource;
    try {
        const { Items } = await client.send(
          new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME })
        ); // Getting table name from the servetless.yml and setting to the TableName

        if (Items.length === 0) {
          // If there is no employee bank details found
          response.statusCode = 404; // Setting the status code to 404
          response.body = JSON.stringify({
            message: "Employee details not found.",
          }); // Setting error message
        } else {
          // If employee details found in the dynamoDB setting the data
          response.body = JSON.stringify({
            message: "Successfully retrieved all Employees details.",
            data: Items.map((item) => unmarshall(item)), // A DynamoDB record into a JavaScript object and setting to the data
          });
        }
      } catch (e) {
        // If any errors will occurred
        console.error(e);
        response.body = JSON.stringify({
          statusCode: e.statusCode, // Handle any server response errors
          message: "Failed to retrieved Employee bank details.",
          errorMsg: e.message, // Handle any server response message
        });
    }
    return response;
  };


  module.exports = {
    getAllEmployees,
  };