const {
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    GetItemCommand,
    ScanCommand,
  } = require("@aws-sdk/client-dynamodb");
  const { marshall} = require("@aws-sdk/util-dynamodb");
  const moment = require("moment");
  const client = new DynamoDBClient();
  const {
    httpStatusCodes,
    httpStatusMessages,
  } = require("../../environment/appconfig");
  const currentDate = Date.now(); // get the current date and time in milliseconds
  const formattedDate = moment(currentDate).format("YYYY-MM-DD HH:mm:ss"); //formating date
  
  const createAssignment = async (event) => {
    console.log("Create employee details");
    const response = { statusCode: httpStatusCodes.SUCCESS };
    try {
        
      const requestBody = JSON.parse(event.body);
  
      // Check for required fields
      const requiredFields = [
        "employeeId",
        "assignmentId",
        "department",
        "designation",
      ];
      if (!requiredFields.every((field) => requestBody[field])) {
        throw new Error("Required fields are missing.");
      }
  
      const params = {
        TableName: process.env.EMPLOYEE_TABLE,
        Item: marshall({
          employeeId: requestBody.employeeId,
          assignmentId: requestBody.assignmentId,
          department: requestBody.department,
          designation: requestBody.designation,
          coreTechnology: requestBody.coreTechnology || null,
          framework: requestBody.framework || null,
          reportingManager: requestBody.reportingManager || null,
          onsite: requestBody.onsite || null,
          billableResource: requestBody.billableResource || null,
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
    createAssignment,
  };
  