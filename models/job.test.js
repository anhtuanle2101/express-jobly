"use strict"

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { findAll } = require("./company");
const Job = require("./job.js");
const _testCommon = require("./_testCommon");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

// create

describe("create", function() {
    const newJob = {
        title: "new",
        salary: 50000,
        equity: 0.5,
        companyHandle: 'c1'
    };
    test("works", async function(){
        let job = await Job.create(newJob);
        expect(job.title).toEqual(newJob.title);
        expect(job.salary).toEqual(newJob.salary);
        expect(job.equity).toEqual(newJob.equity);
        expect(job.companyHandle).toEqual(newJob.companyHandle);
        expect(job.id).toEqual(expect.any(Number));
    })
    test("bad request with duplicate", async function(){
        try {
            await Job.create(newJob);
            await Job.create(newJob);
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        } 
        
    })
    test("bad request with a company does not exist", async function(){
        try {
            const newJob2 = {
                title: "new",
                salary: 50000,
                equity: 0.5,
                companyHandle: 'c5'
            };
            let job = await Job.create(newJob2);
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    })
})

describe("find all jobs", function(){
    beforeEach(async function(){
        await Job.create({
            title: "new",
            salary: 50000,
            equity: 0.5,
            companyHandle: 'c1'
        });
        await Job.create({
            title: "new",
            salary: 45000,
            equity: 0.01,
            companyHandle: 'c2'
        });
        await Job.create({
            title: "new",
            salary: 60000,
            equity: 0.2,
            companyHandle: 'c3'
        });
    })
    test("works: no filters", async function(){
        const jobs = await Job.findAll();
        expect(jobs.length).toEqual(3);
    })
})