const { makeGitURL } = require("./git.js");

function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

function testMakeGitURL() {
    const testCases = [
        {
            input: "",
            expected: null,
            description: "Empty input should return null",
        },
        {
            input: null,
            expected: null,
            description: "Null input should return null",
        },
        {
            input: "https://github.com/user/repo",
            expected: ["https://github.com/user/repo", null],
            description: "Valid https URL should return the same URL",
        },
        {
            input: "http://github.com/user/repo",
            expected: ["http://github.com/user/repo", null],
            description: "Valid http URL should return the same URL",
        },
        {
            input: "user/repo",
            expected: ["https://github.com/user/repo", null],
            description: "Valid repo path should return the corresponding https URL",
        },
        {
            input: "/user/repo",
            expected: ["https://github.com/user/repo", null],
            description:
                "Valid repo path prefixed with / should return the corresponding https URL",
        },
        {
            input: "user/repo/",
            expected: ["https://github.com/user/repo", null],
            description:
                "Valid repo path suffixed with / should return the corresponding https URL",
        },
        {
            input: "/user/repo/",
            expected: ["https://github.com/user/repo", null],
            description:
                "Valid repo path surrounded with / should return the corresponding https URL",
        },,
        {
            input: "user/repo/folder",
            expected: ["https://github.com/user/repo", "folder"],
            description:
                "Valid repo path with folder should return the corresponding https URL and folder",
        },
    ];

    testCases.forEach(({ input, expected, description }) => {
        const result = makeGitURL(input);
        if (deepEqual(result, expected)) {
            console.log(`[PASSED] ${description}`);
        } else {
            console.error(`[FAILED] ${description}`);
            console.error(
                `Expected: ${JSON.stringify(expected)}, but got: ${JSON.stringify(
                    result
                )}`
            );
        }
    });
}

testMakeGitURL();
