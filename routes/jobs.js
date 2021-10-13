"use strict";

const jsonschema = require("jsonshema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } => { job } 
 * 
 * Job should be { title, salary, equity, companyHanlde }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: admin
*/
router.post("/", ensureLoggedIn, ensureAdmin, async (req, res, next)=>{
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }
        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
})

/** GET / =>
 *  { jobs: [ {id, title, salary, equity, companyHanlde }, ...]}
 * 
 *  Can filter on provided search filters:
 *  - minSalary
 *  - maxSalary
 *  - titleLike (will find case-insensitive, partial matches)
 *  - hasEquity
 * 
 *  Authorization required: none
 */
router.get("/", async (req, res, next)=>{
    try {
        let filters = req.query;
        const jobs = await Job.findAll( filters );
        return res.json({ jobs });
    } catch (err) {
        return next(err);
    }
})

/** GET / [id] => { job } 
 * 
 *  job as {id, title, salary, equity, company}
 *  company as {handle, name, description, numEmployees, logoUrl}
 * 
 * Authorization required: none
*/
router.get("/:id", async (req, res, next)=>{
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
})

/** PATCH / [id] {field1, field2, ...} => { job }
 * 
 *  Patch/Update job data.
 * 
 *  fields can be part or all of { title, salary, equity, companyHandle }
 * 
 *  Returns { id, title, salary, equity, companyHandle }
 * 
 *  Authorization required: Admin
 */
router.patch("/:id", ensureLoggedIn, ensureAdmin, async (req, res, next)=>{
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
})

/** DELETE / [id] => { deleted: id } 
 * 
 * Authorization: Admin
*/
router.delete("/:id", ensureLoggedIn, ensureAdmin, async (req, res, next)=>{
    try {
        await Job.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
})

module.exports = router;