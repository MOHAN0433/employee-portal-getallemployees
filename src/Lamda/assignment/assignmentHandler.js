const {
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    GetItemCommand,
    ScanCommand,
    QueryCommand
  } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const moment = require("moment");
const client = new DynamoDBClient();
const {
  httpStatusCodes,
  httpStatusMessages,
} = require("../../environment/appconfig");
const currentDate = Date.now(); // get the current date and time in milliseconds
const formattedDate = moment(currentDate).format("YYYY-MM-DD HH:mm:ss"); // formatting date

const createAssignment = async (event) => {
  console.log("Create employee details");
  const response = { statusCode: httpStatusCodes.SUCCESS };
  try {
    const requestBody = JSON.parse(event.body);

    // Check for required fields
    const requiredFields = [
      "employeeId",
      "department",
      "designation",
      "branchOffice",
      "coreTechnology",
      "billableResource",
      "onsite"
    ];
    if (!requiredFields.every((field) => requestBody[field])) {
      throw new Error("Required fields are missing.");
    }

    const getItemParams = {
        TableName: process.env.ASSIGNMENTS_TABLE,
        Key: marshall({
          employeeId: requestBody.employeeId,
          assignmentId: requestBody.assignmentId
        })
      };

    const existingAssignment = await client.send(new GetItemCommand(getItemParams));
    if (existingAssignment.Item) {
      throw new Error("Assignment already exists for this employee.");
    }

    const existingAssignmentParams = {
      TableName: process.env.ASSIGNMENTS_TABLE,
      KeyConditionExpression: "employeeId = :employeeId",
      ExpressionAttributeValues: {
        ":employeeId": { S: requestBody.employeeId }
      }
    };

    const existingAssignments = await client.send(new QueryCommand(existingAssignmentParams));
    if (existingAssignments.Items && existingAssignments.Items.length > 0) {
      throw new Error("An assignment already exists for this employee.");
    }

    if(requestBody.onsite === null || !["Yes", "No"].includes(requestBody.onsite)){
      throw new Error("Onsite should be either 'Yes' or 'No'.");
    }

    if(requestBody.billableResource === null || !["Yes", "No"].includes(requestBody.billableResource)){
      throw new Error("billableResource should be either 'Yes' or 'No'.");
    }

    const getEmployeeParams = {
      TableName: "employee-Details-dev",
      Key: marshall({
        employeeId: requestBody.employeeId
      })
    };

    const existingEmployee = await client.send(new GetItemCommand(getEmployeeParams));
    if (!existingEmployee.Item) {
      throw new Error("Employee not found in the employee-Details-dev table.");
    }
  

    const params = {
      TableName: process.env.ASSIGNMENTS_TABLE, // Use ASSIGNMENTS_TABLE environment variable
      Item: marshall({
        assignmentId: requestBody.assignmentId,
        employeeId: requestBody.employeeId,
        department: requestBody.department,
        branchOffice : requestBody.branchOffice,
        department : requestBody.department,
        designation: requestBody.designation,
        coreTechnology : requestBody.coreTechnology,
        // designation: Array.isArray(requestBody.designation) 
        // ? requestBody.designation.map(designation => ({ [designation]: true })) // Convert array of strings to array of objects
        // : [{ [requestBody.designation]: true }], // Convert string to array of object        coreTechnology: requestBody.coreTechnology || null,
        // framework: requestBody.framework || null,
        //reportingManager: typeof requestBody.reportingManager === 'string' ? requestBody.reportingManager : throw new error,
        reportingManager : requestBody.reportingManager,
        onsite: requestBody.onsite,
        billableResource: requestBody.billableResource,
        createdDateTime: formattedDate,
      }),
    };
    
    const createResult = await client.send(new PutItemCommand(params));
    response.body = JSON.stringify({
      message: httpStatusMessages.SUCCESSFULLY_CREATED_ASSIGNMENT_DETAILS,
      createResult,
    });
  } catch (e) {
    console.error(e);
    response.statusCode = httpStatusCodes.BAD_REQUEST;
    response.body = JSON.stringify({
      message: httpStatusMessages.FAILED_TO_CREATE_ASSIGNMENT_DETAILS,
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};

module.exports = {
  createAssignment
};
