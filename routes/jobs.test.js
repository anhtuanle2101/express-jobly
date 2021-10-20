"use strict";

const request = require("supertest");
const {createToken} = require("../helpers/tokens");
const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob= {
    title: "new",
    salary: 5000,
    equity: 0.5,
    companyHandle: 'c1'
  };
  const token = createToken({username: 'u1', isAdmin:true})

  test("ok for jobs", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {...newJob, id:expect.any(Number)}
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new2",
          salary: 10
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          salary: "not-a-number",
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(400);
  });
  
  test("bad request with not an admin", async function(){
    // u1Token is not an admin
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  })
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  const token = createToken({username: 'u1', isAdmin:true})

  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title: "j1",
                salary: 10000,
                equity: "0",
                companyHandle:"c1",
                id: expect.any(Number)
            },
            {
                title: "j2",
                salary: 20000,
                equity: "0.5",
                companyHandle:"c2",
                id: expect.any(Number)
            },
            {
                title: "j3",
                salary: 30000,
                equity: "1",
                companyHandle:"c2",
                id: expect.any(Number)
            }
          ]
    });
  })
  test("get with filters", async function(){
      const res = await request(app).get("/jobs").query({
        titleLike:"j1"
      });
      expect(res.body).toEqual({
        jobs:
        [
            {
                title: "j1",
                salary: 10000,
                equity: "0",
                companyHandle:"c1",
                id: expect.any(Number)
            }
        ]
      });
    })

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE JOBS CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  const token = createToken({username: 'u1', isAdmin:true})

  test("works for anon", async function () {
    const job = (await request(app).get(`/jobs`)).body.jobs[0];
    const resp = await request(app).get(`/jobs/${job.id}`);
    expect(resp.body).toEqual({
      job
    });
  });


  test("not found for no such company", async function () {
    const resp = await request(app).get(`/jobs/99999`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  const token = createToken({username: 'u1', isAdmin:true})

  test("works for jobs", async function () {
    const job = (await request(app).get(`/jobs`)).body.jobs[0];
    const resp = await request(app)
        .patch(`/jobs/${job.id}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.body).toEqual({
      job: {
        ...job,
        title: "j1-new"
      }
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/jobs/100`)
        .send({
          title: "C1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
        .patch(`/jobs/9999`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const job = (await request(app).get(`/jobs`)).body.jobs[0];
    const resp = await request(app)
        .patch(`/jobs/${job.id}`)
        .send({
          title: 1234,
        })
        .set("authorization", `Bearer ${token}`);
    expect(resp.statusCode).toEqual(400);
  });

});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    
    const token = createToken({username: 'u1', isAdmin:true})

    test("works", async function () {
        const job = (await request(app).get(`/jobs`)).body.jobs[0];
        const resp = await request(app)
            .delete(`/jobs/${job.id}`)
            .set("authorization", `Bearer ${token}`);
        expect(resp.body).toEqual({ deleted: `${job.id}` });
    });

    test("unauth for anon", async function () {
        const job = (await request(app).get(`/jobs`)).body.jobs[0];
        const resp = await request(app)
            .delete(`/jobs/${job.id}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such company", async function () {
        const resp = await request(app)
            .delete(`/jobs/99999`)
            .set("authorization", `Bearer ${token}`);
        expect(resp.statusCode).toEqual(404);
    });
});
