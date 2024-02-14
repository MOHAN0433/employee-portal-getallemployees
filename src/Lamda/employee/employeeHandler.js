const {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand,
  ScanCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const moment = require("moment");
const client = new DynamoDBClient();
const {
  httpStatusCodes,
  httpStatusMessages,
} = require("../../environment/appconfig");
const currentDate = Date.now(); // get the current date and time in milliseconds
const formattedDate = moment(currentDate).format("YYYY-MM-DD HH:mm:ss"); //formating date

const createEmployee = async (event) => {
  console.log("Create employee details");
  const response = { statusCode: httpStatusCodes.SUCCESS };
  try {
    const requestBody = JSON.parse(event.body);

    // Check for required fields
    const requiredFields = [
      "employeeId",
      "firstName",
      "lastName",
      "dateOfBirth",
      "officeEmailAddress",
      "branchOffice",
    ];
    if (!requiredFields.every((field) => requestBody[field])) {
      throw new Error("Required fields are missing.");
    }

    const params = {
      TableName: process.env.EMPLOYEE_TABLE,
      Item: marshall({
        employeeId: requestBody.employeeId,
        firstName: requestBody.firstName,
        lastName: requestBody.lastName,
        dateOfBirth: requestBody.dateOfBirth,
        officeEmailAddress: requestBody.officeEmailAddress,
        //branchOffice: requestBody.branchOffice,
        password: requestBody.password || null,
        gender: requestBody.gender || null,
        ssnNumber: requestBody.ssnNumber || null,
        maritalStatus: requestBody.maritalStatus || null,
        nationality: requestBody.nationality || null,
        passportNumber: requestBody.passportNumber || null,
        mobileNumber: requestBody.mobileNumber || null,
        permanentAddress: requestBody.permanentAddress || null,
        contactPerson: requestBody.contactPerson || null,
        personalEmailAddress: requestBody.personalEmailAddress || null,
        presentAddress: requestBody.presentAddress || null,
        contactNumber: requestBody.contactNumber || null,
        joiningDate: requestBody.joiningDate || null,
        emergencyContactPerson: requestBody.emergencyContactPerson || null,
        //designation: requestBody.designation || null,
        emergencyContactNumber: requestBody.emergencyContactNumber || null,
        resignedDate: requestBody.resignedDate || null,
        relievedDate: requestBody.relievedDate || null,
        leaveStructure: requestBody.leaveStructure || null,
        createdDateTime: formattedDate,
        updatedDateTime: requestBody.updatedDateTime || null,
        department: requestBody.department || null,
      }),
    };
    const createResult = await client.send(new PutItemCommand(params));

    const requiredAssignmentFields = [
      "designation",
      "branchOffice",
    ];
    if (!requiredAssignmentFields.every((field) => requestBody[field])) {
      throw new Error("Required Assignment Fields are missing.");
    }

    // Set onsite based on branchOffice
    let onsite = "No"; // Default value
    if (requestBody.branchOffice === "San Antonio, USA") {
      onsite = "Yes";
    }
    if (
      requestBody.branchOffice === null ||
      !["San Antonio, USA", "Bangalore, INDIA"].includes(
        requestBody.branchOffice
      )
    ) {
      throw new Error("Incorrect BranchOffice");
    }

    const highestSerialNumber = await getHighestSerialNumber();
    console.log("Highest Serial Number:", highestSerialNumber);
    const nextSerialNumber =
      highestSerialNumber !== null ? parseInt(highestSerialNumber) + 1 : 1;
      async function getHighestSerialNumber() {
        const params = {
          TableName: process.env.ASSIGNMENTS_TABLE,
          ProjectionExpression: "assignmentId",
          Limit: 100, // Increase the limit to retrieve more items for sorting
        };
      
        try {
          const result = await client.send(new ScanCommand(params));
          
          // Sort the items in descending order based on assignmentId
          const sortedItems = result.Items.sort((a, b) => {
            return parseInt(b.assignmentId.N) - parseInt(a.assignmentId.N);
          });
      
          console.log("Sorted Items:", sortedItems); // Log the sorted items
      
          if (sortedItems.length === 0) {
            return 0; // If no records found, return null
          } else {
            const highestAssignmentId = parseInt(sortedItems[0].assignmentId.N);
            console.log("Highest Assignment ID:", highestAssignmentId);
            return highestAssignmentId;
          }
        } catch (error) {
          console.error("Error retrieving highest serial number:", error);
          throw error; // Propagate the error up the call stack
        }
      }
      
    const assignmentParams = {
      TableName: process.env.ASSIGNMENTS_TABLE, // Use ASSIGNMENTS_TABLE environment variable
      Item: marshall({
        assignmentId: nextSerialNumber,
        employeeId: requestBody.employeeId,
        branchOffice: requestBody.branchOffice,
        designation: requestBody.designation,
        onsite: onsite,
        createdDateTime: formattedDate,
      }),
    };

    const createAssignmentResult = await client.send(new PutItemCommand(assignmentParams));
  
    response.body = JSON.stringify({
      message: httpStatusMessages.SUCCESSFULLY_CREATED_EMPLOYEE_DETAIL,
      createEmployee,
    });
  } catch (e) {
    console.error(e);
    response.statusCode = httpStatusCodes.BAD_REQUEST;
    response.body = JSON.stringify({
      message: httpStatusMessages.FAILED_TO_CREATE_EMPLOYEE_DETAILS,
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};

const getEmployee = async (event) => {
  console.log("Get employee details");
  const response = { statusCode: httpStatusCodes.SUCCESS };
  try {
    const { pathParameters } = event;
    if (!pathParameters || !pathParameters.employeeId) {
      console.log("employeeId is missing");
      throw {
        statusCode: httpStatusCodes.BAD_REQUEST,
        message: httpStatusMessages.EMPLOYEE_ID_REQUIRED,
      };
    }

    const params = {
      TableName: process.env.EMPLOYEE_TABLE,
      Key: marshall({ employeeId: pathParameters.employeeId }),
    };

    const { employeeDetails } = await client.send(new GetItemCommand(params));
    console.log("Employee Details: " + { employeeDetails });
    if (!employeeDetails) {
      console.log("No Employee Detatils found");
      throw {
        statusCode: httpStatusCodes.NOT_FOUND,
        message: httpStatusMessages.EMPLOYEE_DETAILS_NOT_FOUND,
      };
    } else {
      response.body = JSON.stringify({
        message: httpStatusMessages.SUCCESSFULLY_RETRIEVED_EMPLOYEE_DETAILS,
        data: unmarshall(employeeDetails),
      });
      console.log("Employee Detatils" + response);
    }
  } catch (e) {
    console.error(e);
    response.body = JSON.stringify({
      statusCode: e.statusCode || httpStatusCodes.INTERNAL_SERVER_ERROR,
      message:
        e.message || httpStatusMessages.FAILED_TO_RETRIEVE_EMPLOYEE_DETAILS,
    });
  }
  return response;
};

const getAllEmployees = async () => {
  const response = { statusCode: httpStatusCodes.SUCCESS };
  try {
    const { Items } = await client.send(
      new ScanCommand({ TableName: process.env.EMPLOYEE_TABLE })
    ); // Getting table name from the servetless.yml and setting to the TableName

    if (Items.length === 0) {
      // If there is no employee details found
      response.statusCode = httpStatusCodes.NOT_FOUND; // Setting the status code to 404
      response.body = JSON.stringify({
        message: httpStatusMessages.EMPLOYEE_DETAILS_NOT_FOUND,
      }); // Setting error message
    } else {
      const sortedItems = Items.sort((a, b) =>
        a.employeeId.S.localeCompare(b.employeeId.S)
      );

      // Map and set "password" field to null
      const employeesData = sortedItems.map((item) => {
        const employee = unmarshall(item);
        if (employee.hasOwnProperty("password")) {
          employee.password = null;
        }
        return employee;
      });

      response.body = JSON.stringify({
        message: httpStatusMessages.SUCCESSFULLY_RETRIEVED_EMPLOYEES_DETAILS,
        data: employeesData,
      });
    }
  } catch (e) {
    console.error(e);
    response.body = JSON.stringify({
      statusCode: httpStatusCodes.INTERNAL_SERVER_ERROR,
      message: httpStatusMessages.FAILED_TO_RETRIEVE_EMPLOYEE_DETAILS,
      errorMsg: e.message,
    });
  }
  return response;
};

module.exports = {
  createEmployee,
  getEmployee,
  getAllEmployees,
};
