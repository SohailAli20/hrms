const { connectToDatabase } = require("../../db/dbConnector");
const { z } = require("zod");

exports.handler = async (event) => {
	const requestBody = JSON.parse(event.body);
	const org_id = "482d8374-fca3-43ff-a638-02c8a425c492";
	const currentTimestamp = new Date().toISOString();

	const requestBodySchema = z.object({
        designation_id: z.number().int(),
        pf: z.string(),
        uan: z.string(),
        department_id: z.number().int(),
        reporting_manager_id: z.string().uuid(),
        work_location: z.string(),
        start_date: z.string().datetime(),
        emp_id: z.string().uuid()
    });

    const result = requestBodySchema.safeParse(requestBody);
	if (!result.success) {
		return {
			statusCode: 400,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				error: result.error.formErrors.fieldErrors,
			}),
		};
	}
	const empProfessionalQuery = `
            UPDATE emp_detail AS ed
            SET
                designation_id = $1,
                pf = $2,
                uan = $3,
                department_id = $4,
                reporting_manager_id = $5,
                work_location = $6,
                start_date = $7
            FROM
                emp_designation AS des,
                department AS dep,
                employee AS rm
            WHERE
                ed.emp_id = $8
                AND des.id = $1
                AND dep.id = $4
                AND rm.id = $5
            RETURNING
                ed.*,
                des.id as designation_id,
                des.designation as designation,
                dep.id as department_id,
                dep.name as department,
                rm.id as maanger_id, 
                rm.first_name as maanger_first_name, 
                rm.last_name as maanger_last_name,
                rm.image as image
            `;
	const client = await connectToDatabase();
	await client.query("BEGIN");
	try {
		const empProfessionalQueryResult = await client.query(empProfessionalQuery, [
			requestBody.designation_id,
			requestBody.pf,
			requestBody.uan,
			requestBody.department_id,
			requestBody.reporting_manager_id,
			requestBody.work_location,
			requestBody.start_date,
            requestBody.emp_id
		]);
        const data = {
            professionalInfo : {
                ...empProfessionalQueryResult.rows[0],
                id : undefined,
                emp_id : undefined
            }
        }
		await client.query("COMMIT");
		return {
			statusCode: 200,
			headers: {
				Access_Control_Allow_Origin: "*",
			},
			body: JSON.stringify({
				...data.professionalInfo
			}),
		};
	} catch (error) {
		await client.query("ROLLBACK");
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
	} finally {
		await client.end();
	}
};
