const {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  ScanCommand,
  QueryCommand,
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
    console.log("Request Body:", requestBody);

    // Check for required fields
    const requiredFields = [
      "employeeId",
      "department",
      "designation",
      "branchOffice",
      "coreTechnology",
      "billableResource",
      "onsite",
    ];
    if (!requiredFields.every((field) => requestBody[field])) {
      throw new Error("Required fields are missing.");
    }

    if (
      requestBody.branchOffice === null ||
      !["San Antonio(USA)", "Bangalore(INDIA)"].includes(
        requestBody.branchOffice
      )
    ) {
      throw new Error("Incorrect BranchOffice");
    }

    if (
      requestBody.onsite === null ||
      !["Yes", "No"].includes(requestBody.onsite)
    ) {
      throw new Error("Onsite should be either 'Yes' or 'No'.");
    }

    if (
      requestBody.billableResource === null ||
      !["Yes", "No"].includes(requestBody.billableResource)
    ) {
      throw new Error("billableResource should be either 'Yes' or 'No'!");
    }

    if (
      requestBody.designation === null ||
      ![
        "Software Engineer Trainee",
        "Software Engineer",
        "Senior software Engineer",
        "Testing Engineer Trainee",
        "Testing Engineer",
        "Senior Testing Engineer",
        "Tech Lead",
        "Testing Lead",
        "Manager",
        "Project Manager",
        "Senior Manager",
        "Analyst",
        "Senior Analyst",
        "Architect",
        "Senior Architect",
        "Solution Architect",
        "Scrum Master",
        "Data Engineer",
      ].includes(requestBody.designation)
    ) {
      throw new Error("Incorrect Designation!");
    }

    if (
      requestBody.department === null ||
      !["IT", "Non- IT", "Sales"].includes(requestBody.department)
    ) {
      throw new Error("Incorrect Department!");
    }

    const highestSerialNumber = await getHighestSerialNumber();
    console.log("Highest Serial Number:", highestSerialNumber);

const nextSerialNumber =
  highestSerialNumber !== null
    ? parseInt(highestSerialNumber) + 1
    : 1;

// if (isNaN(nextSerialNumber)) {
//   throw new Error("Unable to determine next serial number for assignment.");
// }

async function getHighestSerialNumber() {
  const params = {
    TableName: process.env.ASSIGNMENTS_TABLE,
    ProjectionExpression: "assignmentId",
    Limit: 1,
    ScanIndexForward: false, // Sort in descending order to get the highest serial number first
  };

  try {
    const result = await client.send(new ScanCommand(params));
    console.log("DynamoDB Result:", result); // Add this line to see the DynamoDB response
    if (result.Items.length === 0) {
      return null; // If no records found, return null
    } else {
      // Parse and return the highest serial number without incrementing
      const assignmentIdObj = result.Items[0].assignmentId;
      console.log("Assignment ID from DynamoDB:", assignmentIdObj); // Add this line to see the retrieved assignmentId object
      const assignmentId = parseInt(assignmentIdObj.N); // Access the N property and parse as a number
      console.log("Parsed Assignment ID:", assignmentId); // Log the parsed assignmentId
      return assignmentId;
    }
  } catch (error) {
    console.error("Error retrieving highest serial number:", error);
    throw error; // Propagate the error up the call stack
  }
}

    // const getItemParams = async (employeeId) => {
    //   const params = {
    //     TableName: process.env.ASSIGNMENTS_TABLE,
    //     FilterExpression: "employeeId = :employeeIdValue",
    //     ExpressionAttributeValues: {
    //       ":employeeIdValue": { S: employeeId },
    //     },
    //     ProjectionExpression: "employeeId",
    //   };
    //   const command = new ScanCommand(params);
    //   const data = await client.send(command);
    //   return data.Items.length > 0;
    // };
    // if (getItemParams.Item) {
    //   throw new Error("Assignment already exists for this employee.");
    // }
    //   const getItemParams = {
    //     TableName: process.env.ASSIGNMENTS_TABLE,
    //     Key: {
    //       "employeeId": { S: requestBody.employeeId }, // Assuming employeeId is a string
    //       "assignmentId": { N: highestSerialNumber.toString() } // Assuming assignmentId is a number
    //   }
    //   };
    // const existingAssignment = await client.send(new GetItemCommand(getItemParams));
    // if (existingAssignment.Item) {
    //   throw new Error("Assignment already exists for this employee.");
    // }

    // const existingAssignmentParams = {
    //   TableName: process.env.ASSIGNMENTS_TABLE,
    //   KeyConditionExpression: "assignmentId = :assignmentIdValue",
    //   ExpressionAttributeValues: {
    //     ":assignmentIdValue": nextSerialNumber,
    //   },
    // };
    
    // console.log("Query Parameters:", existingAssignmentParams);
    
    // try {
    //   const existingAssignments = await client.send(new QueryCommand(existingAssignmentParams));
    //   console.log("DynamoDB Query Result:", existingAssignments);
      
    //   if (existingAssignments.Items && existingAssignments.Items.length > 0) {
    //     throw new Error("An assignment already exists for this employee.");
    //   }
    // } catch (error) {
    //   console.error("Error querying DynamoDB:", error);
    //   throw error; // Propagate the error up the call stack
    // }
    
    const employeeExists = await checkEmployeeExists(requestBody.employeeId);
    if (employeeExists) {
      throw new Error("Assignment already exists for this employee.");
    }

    async function checkEmployeeExists(employeeId) {
      const params = {
        TableName: process.env.ASSIGNMENTS_TABLE,
        KeyConditionExpression: "employeeId = :employeeIdValue",
        ExpressionAttributeValues: {
          ":employeeIdValue": { S: employeeId },
        },
        ProjectionExpression: "employeeId",
      };
      try {
        const { Count } = await client.send(new QueryCommand(params));
        return Count > 0;
      } catch (error) {
        console.error("Error checking if employee exists:", error);
        throw error;
      }
    }

    const params = {
      TableName: process.env.ASSIGNMENTS_TABLE, // Use ASSIGNMENTS_TABLE environment variable
      Item: marshall({
        assignmentId: nextSerialNumber,
        employeeId: requestBody.employeeId,
        department: requestBody.department,
        branchOffice: requestBody.branchOffice,
        framework: requestBody.framework,
        designation: requestBody.designation,
        coreTechnology: requestBody.coreTechnology,
        // designation: Array.isArray(requestBody.designation)
        // ? requestBody.designation.map(designation => ({ [designation]: true })) // Convert array of strings to array of objects
        // : [{ [requestBody.designation]: true }], // Convert string to array of object        coreTechnology: requestBody.coreTechnology || null,
        // framework: requestBody.framework || null,
        //reportingManager: typeof requestBody.reportingManager === 'string' ? requestBody.reportingManager : throw new error,
        reportingManager: requestBody.reportingManager,
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
  createAssignment,
};
