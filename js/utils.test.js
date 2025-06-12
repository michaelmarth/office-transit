// Simple test for formatDuration
function testFormatDuration() {
    const cases = [
        { input: 0, expected: "0min" },
        { input: 59, expected: "0min" },
        { input: 60, expected: "1min" },
        { input: 3600, expected: "1h 0min" },
        { input: 3661, expected: "1h 1min" },
        { input: NaN, expected: "" },
        { input: undefined, expected: "" }
    ];
    cases.forEach(({ input, expected }) => {
        const result = formatDuration(input);
        if (result !== expected) {
            console.error(`formatDuration(${input}) = '${result}', expected '${expected}'`);
        }
    });
    console.log("formatDuration tests done");
}

// Simple test for station filtering
function testStationFiltering() {
    const arr = [
        { id: "1", name: "A", type: "station" },
        { id: "2", name: "B" },
        { id: null, name: "C", type: "station" },
        { id: "3", name: "D", type: "location" },
        { id: "4", name: "E", type: "station" }
    ];
    const filtered = arr.filter(station => station.id && station.name && (!station.type || station.type === "station"));
    if (filtered.length !== 3) {
        console.error("Station filtering failed", filtered);
    }
    console.log("station filtering tests done");
}

// Test for getMainTransportLine
function testGetMainTransportLine() {
    const cases = [
        {
            input: { sections: [{ journey: { category: "T", number: "1" } }] },
            expected: "T 1"
        },
        {
            input: { sections: [{ journey: { category: "B", number: "50" } }] },
            expected: "B 50"
        },
        {
            input: { sections: [{ journey: { category: "S" } }] },
            expected: "S"
        },
        {
            input: { sections: [{ journey: { number: "11" } }] },
            expected: "11"
        },
        {
            input: { sections: [{ walk: {} }] },
            expected: null
        },
        {
            input: {},
            expected: null
        }
    ];
    cases.forEach(({ input, expected }) => {
        const result = window.getMainTransportLine ? window.getMainTransportLine(input) : getMainTransportLine(input);
        if (result !== expected) {
            console.error(`getMainTransportLine(${JSON.stringify(input)}) = '${result}', expected '${expected}'`);
        }
    });
    console.log("getMainTransportLine tests done");
}

// Test for formatTime
function testFormatTime() {
    const d = new Date("2023-01-01T08:15:00");
    const result = formatTime(d);
    if (!result.match(/08:15|8:15/)) {
        console.error(`formatTime failed: got '${result}'`);
    }
    console.log("formatTime tests done");
}

// Run all tests
function runAllTests() {
    testFormatDuration();
    testStationFiltering();
    testGetMainTransportLine();
    testFormatTime();
}

if (typeof window !== "undefined") {
    window.testFormatDuration = testFormatDuration;
    window.testStationFiltering = testStationFiltering;
    window.testGetMainTransportLine = testGetMainTransportLine;
    window.testFormatTime = testFormatTime;
    window.runAllTests = runAllTests;
} 