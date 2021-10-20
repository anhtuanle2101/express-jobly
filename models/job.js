"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

// Related functions for jobs.

class Job {
    /** Create a job (from data), update db, return new job data.
     * 
     * data should be {title, salary, equity, companyHandle }
     * 
     * Returns {id, title, salary, equity, companyHandle}
     * 
     * Throws BadRequestError if the title exists for the same company.
     * Throws BadRequestError if the company handle does not exist in database.
     */
    static async create({ title, salary, equity, companyHandle }){
        const companyCheck = await db.query(
            `SELECT handle
            FROM companies
            WHERE handle = $1`,
            [companyHandle]
        );
        if (!companyCheck.rows[0])
            throw new BadRequestError(`Company does not exist with handle: ${companyHandle}`);
        const duplicateCheck = await db.query(
            `SELECT id
            FROM jobs
            WHERE title = $1
            AND company_handle = $2`,
            [title, companyHandle]
        )
        if (duplicateCheck.rows[0])
            throw new BadRequestError(`Duplicate job title: ${title}`);

        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, CAST(equity AS float), company_handle as "companyHandle"`,
            [title, salary, equity, companyHandle]
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs
     * 
     * Return [{id, title, salary, equity, companyHandle},...]
     * 
     * No login or admin role required
     */
    static async findAll(filters){
        let titleLike, minSalary, maxSalary, hasEquity;
        if (filters === undefined){
            titleLike = "%%";
            minSalary = 0;
            maxSalary = 100000000;
            hasEquity = undefined;
        }else{
            titleLike = (filters.titleLike !== undefined)?`%${filters.titleLike}%`:"%%";
            minSalary = filters.minSalary || 0;
            maxSalary = filters.maxSalary || 100000000;
            hasEquity = (filters.hasEquity===undefined)?undefined:filters.hasEquity;
            if (filters.maxSalary < filters.minSalary){
                throw new BadRequestError("max has to be greater than min");
            }
        }  
        
        const result = await db.query(
            `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle as "companyHandle"
            FROM jobs
            WHERE salary >= $1
            AND salary <= $2
            AND title ILIKE $3
            ${(hasEquity === undefined)?"":`AND equity ${hasEquity?'>':'='} 0`}
            ORDER BY title`,
            [minSalary, maxSalary, titleLike]
        )
        // console.log(`SELECT id,
        //         title,
        //         salary,
        //         equity,
        //         company_handle as "companyHandle"
        // FROM jobs
        // WHERE salary >= ${minSalary}
        // AND salary <= ${maxSalary}
        // AND title ILIKE ${titleLike}
        // AND equity ${hasEquity?">":"="} 0
        // ORDER BY title`);
        const jobs = result.rows;
        return jobs;
    }

    /** Given a job id, return data about job
     * 
     * Returns {id, title, salary, equity, company}
     * where company is {handle, name, description, numEmployees, logoUrl}
     * 
     * Throws NotFoundError if not found.
     */
    static async get(id){
        const result = await db.query(
            `SELECT id,
                    title, 
                    salary,
                    equity,
                    handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl",
                    company_handle AS "companyHandle"
            FROM jobs j JOIN companies c ON j.company_handle = c.handle
            WHERE id = $1`,
            [id]);
        
        if (!result.rows[0]) throw new NotFoundError(`No job found with id: ${id}`);

        const job = {
            id: result.rows[0].id,
            title: result.rows[0].title,
            salary: result.rows[0].salary,
            equity: result.rows[0].equity,
            companyHandle: result.rows[0].companyHandle
            // company:{
            //     handle: result.rows[0].handle,
            //     name: result.rows[0].name,
            //     description: result.rows[0].description,
            //     numEmployees: result.rows[0].numEmployees,
            //     logoUrl: result.rows[0].logoUrl
            // }
        }

        return job;
    }

    /** Update job data with `data`.
     * 
     * This is a "partial update" --- not necessary all fields 
     * needed to be updated; only the provided fields.
     * 
     * Data can include: {title, salary, equity, companyHandle}
     * 
     * Returns {id, title, salary, equity, companyHandle}
     * 
     * Throws NotFoundError if not found.
     */
    static async update(id, data){
        if (data.id || data.companyHandle){
            throw new BadRequestError("id cannot be changed nor the company associated with this job");
        }
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                companyHandle: "company_handle"
            }
        );
        const idIdx = "$"+(values.length + 1);
        const result = await db.query(
            `UPDATE jobs
            SET ${setCols}
            WHERE id = ${idIdx}
            RETURNING id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"`,
            [...values, id]
        );

        const job = result.rows[0];

        if(!job) throw new NotFoundError(`No job found with id: ${id}`);

        return job;
    }

    /** Delete given job from database; return undefined;
     * 
     * Throw NotFoundError if job is not found.
     */
    static async remove(id){
        const result = await db.query(
            `DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id`,
            [id]
        );
        const job = result.rows[0];

        if(!job) throw new NotFoundError(`No job found with id: ${id}`);
    }
}

module.exports = Job;