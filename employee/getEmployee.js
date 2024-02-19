const { connectToDatabase } = require("../db/dbConnector");
const { z } = require("zod");

exports.handler = async (event) => {
    const employeeId = event.pathParameters?.id ?? null;
    const idSchema = z.string().uuid({ message: "Invalid employee id" });
    const isUuid = idSchema.safeParse(employeeId);
    if (!isUuid.success) {
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify({
                error: isUuid.error.issues[0].message,
            }),
        };
    }
    const client = await connectToDatabase();
    try {
        const query = `
            SELECT 
                e.*, 
                a.*, 
                ed.*, 
                d.name AS department_name, 
                et.type AS emp_type, 
                edg.id AS emp_designation_id,
                edg.designation AS emp_designation, 
                m.first_name AS reporting_manager_first_name, 
                m.last_name AS reporting_manager_last_name, 
                doc.id AS document_id,
                doc.*,
                eq.*, 
                dt.name AS device_type_name
            FROM 
                employee e
            LEFT JOIN 
                address a ON e.address_id = a.id
            LEFT JOIN 
                emp_detail ed ON e.emp_detail_id = ed.id
            LEFT JOIN 
                department d ON ed.department_id = d.id
            LEFT JOIN 
                emp_type et ON ed.emp_type_id = et.id
            LEFT JOIN 
                emp_designation edg ON ed.designation_id = edg.id
            LEFT JOIN 
                employee m ON ed.reporting_manager_id = m.id
            LEFT JOIN 
                document doc ON doc.emp_id = e.id
            LEFT JOIN 
                equipment eq ON eq.emp_id = e.id
            LEFT JOIN 
                device_type dt ON eq.device_type_id = dt.id
            WHERE 
                e.id = $1
        `;

        const result = await client.query(query, [employeeId]);
        await client.end();

        const formattedResult = formatResult(result.rows);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            body: JSON.stringify(formattedResult),
        };
    } catch (error) {
        console.error("Error executing query:", error);
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

function formatResult(rows) {
    const formattedResult = {
        personal_information: {},
        professional_information: {},
        documents: {},
        equipment: [],
    };

    rows.forEach((row) => {
        if (!formattedResult.personal_information.emp_id) {
            formattedResult.personal_information = {
                emp_id: row.emp_id,
                email: row.email,
                password: row.password,
                work_email: row.work_email,
                first_name: row.first_name,
                last_name: row.last_name,
                gender: row.gender,
                dob: row.dob,
                number: row.number,
                emergency_number: row.emergency_number,
                highest_qualification: row.highest_qualification,
                address_id: row.address_id,
                address_line_1: row.address_line_1,
                address_line_2: row.address_line_2,
                landmark: row.landmark,
                country: row.country,
                state: row.state,
                city: row.city,
                zipcode: row.zipcode,
            };
        }

        if (!formattedResult.professional_information.emp_detail_id) {
            formattedResult.professional_information = {
                emp_detail_id: row.emp_detail_id,
                designation_id: row.designation_id,
                pf: row.pf,
                uan: row.uan,
                department_id: row.department_id,
                reporting_manager_id: row.reporting_manager_id,
                emp_type_id: row.emp_type_id,
                work_location: row.work_location,
                start_date: row.start_date,
                department_name: row.department_name,
                emp_type: row.emp_type,
                emp_designation_id: row.emp_designation_id,
                emp_designation: row.emp_designation,
                reporting_manager_first_name: row.reporting_manager_first_name,
                reporting_manager_last_name: row.reporting_manager_last_name,
            };
        }

        if (row.document_id) {
            formattedResult.documents[row.document_id] = {
                document_id: row.document_id,
                name: row.name,
                url: row.url,
            };
        }

        if (row.device_type_name) {
            formattedResult.equipment.push({
                owner: row.owner,
                device_type_id: row.device_type_id,
                manufacturer: row.manufacturer,
                serial_number: row.serial_number,
                note: row.note,
                supply_date: row.supply_date,
                device_type_name: row.device_type_name,
            });
        }
    });

    formattedResult.documents = Object.values(formattedResult.documents);
    return formattedResult;
}