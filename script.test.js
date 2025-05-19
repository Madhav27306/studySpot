const fetch = require("node-fetch");

test("API should return study spots", async () => {
    const response = await fetch("http://localhost:5001/study-spots");
    const data = await response.json();

    expect(response.status).toBe(200);  // ✅ API should return 200 OK
    expect(Array.isArray(data)).toBe(true);  // ✅ Should return an array
});
