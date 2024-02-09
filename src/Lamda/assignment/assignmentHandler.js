const {
    DynamoDBClient,
    PutItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
    GetItemCommand,
    ScanCommand,
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
      "billableResource"
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

    //   const getItemParams = {
    //     TableName: process.env.ASSIGNMENTS_TABLE,
    //     Key: {
    //       employeeId: { S: requestBody.employeeId }
    //     }
    //   };

    const existingAssignment = await client.send(new GetItemCommand(getItemParams));
    if (existingAssignment.Item) {
      throw new Error("Assignment already exists for this employee.");
    }

    const designationArray = Array.isArray(requestBody.designation)
      ? requestBody.designation.map(desig => ({ designation: desig })) // Convert array of strings to array of objects
      : [{ designation: requestBody.designation }];

    const params = {
      TableName: process.env.ASSIGNMENTS_TABLE, // Use ASSIGNMENTS_TABLE environment variable
      Item: marshall({
        assignmentId: requestBody.assignmentId,
        employeeId: requestBody.employeeId,
        department: requestBody.department,
        branchOffice : requestBody.branchOffice,
        designation: designationArray.map((desig, index) => ({
            id: index + 1,
            value: desig,
          })),
        coreTechnology : requestBody.coreTechnology,
        // designation: Array.isArray(requestBody.designation) 
        // ? requestBody.designation.map(designation => ({ [designation]: true })) // Convert array of strings to array of objects
        // : [{ [requestBody.designation]: true }], // Convert string to array of object        coreTechnology: requestBody.coreTechnology || null,
        // framework: requestBody.framework || null,
        reportingManager: typeof requestBody.reportingManager === 'string' ? requestBody.reportingManager : null,
        onsite: requestBody.onsite || false,
        billableResource: requestBody.billableResource || false,
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
