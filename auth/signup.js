require("dotenv").config();
const { connectToDatabase } = require("../db/dbConnector");
const { z } = require("zod");
const { v4: uuid } = require("uuid");

const {
	CognitoIdentityProviderClient,
	AdminCreateUserCommand,
	AdminAddUserToGroupCommand,
	AdminDeleteUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");

exports.handler = async (event, context, callback) => {
	const requestBody = JSON.parse(event.body);
	const req = {
		email: requestBody.email,
		password: requestBody.password,
	};
	const reqSchema = z.object({
		email: z.string(),
		password: z.string(),
	});
	const valResult = reqSchema.safeParse(req);
	if (!valResult.success) {
		return {
			statusCode: 400,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				error: valResult.error.formErrors.fieldErrors,
			}),
		};
	}
	const client = await connectToDatabase();
	const cognitoClient = new CognitoIdentityProviderClient({
		region: "us-east-1",
	});
	try {
		const org_id = uuid();
		const user_id = uuid();
		const input = {
			UserPoolId: process.env.COGNITO_POOL_ID,
			Username: req.email,
			TemporaryPassword: req.password,
			UserAttributes: [
				{
					Name: "custom:org_id",
					Value: org_id,
				},
				{
					Name: "custom:user_id",
					Value: user_id,
				}
			],
			// MessageAction: "RESEND"
		};
		const createUserResponse = await cognitoClient.send(
			new AdminCreateUserCommand(input)
		);
		if(createUserResponse && createUserResponse.User && createUserResponse.User.Username){
		const addUserToGroupParams = {
			GroupName: "Admin",
			Username : req.email,
			UserPoolId: process.env.COGNITO_POOL_ID,
		};
		const addUserToGroupResponse = await cognitoClient.send(
			new AdminAddUserToGroupCommand(addUserToGroupParams)
		);
		}
		if(createUserResponse && createUserResponse.User && createUserResponse.User.Username){
		await client.query("BEGIN");
		const res1 = await client.query(`INSERT INTO organisation(id) VALUES ($1)`,[org_id]);
		const res2 = await client.query(`INSERT INTO employee (id , work_email, invitation_status,org_id,email_verified) VALUES ($1,$2, 'SENT',$3,'NO')`, [user_id,req.email,org_id]);
		await client.query("COMMIT");
		}
		
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({message:"Successfully Signed-up"})
		};
	} catch (error) {
		await client.query("ROLLBACK");
		const params = {
			UserPoolId: process.env.COGNITO_POOL_ID,
			Username: req.email, 
		};
	   const deleteUserResponse = await cognitoClient.send(new AdminDeleteUserCommand(params));
		return {
			statusCode: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				message: error.message,
				error: error,
			}),
		};
	}
};