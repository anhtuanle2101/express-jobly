const { sqlForPartialUpdate } = require("./sql");

describe("Testing sqlForPartialUpdate function", function(){
    test("Works: expected results", function(){
        const partialUpdate = {
            "firstName": "Tuan Anh",
            "lastName": "Le"
        }
        const result = sqlForPartialUpdate(partialUpdate, {"firstName": "first_name", "lastName": 'last_name'});
        expect(result).toEqual({setCols:'"first_name"=$1, "last_name"=$2', values: ["Tuan Anh", "Le"]});
    })
})