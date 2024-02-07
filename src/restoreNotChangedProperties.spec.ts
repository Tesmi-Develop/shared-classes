/// <reference types="@rbxts/testez/globals" />

import { restoreNotChangedProperties } from "./restoreNotChangedProperties";

export = () => {
	it("should return old state", () => {
		const oldState = { a: 1, b: 2 };
		const newState = { a: 1, b: 2 };
		expect(restoreNotChangedProperties(newState, oldState)).to.equal(oldState);
	});

	it("should return old state with nested tables", () => {
		const oldState = { a: 1, b: 2, c: { a: 10 } };
		const newState = { a: 1, b: 2, c: { a: 10 } };

		expect(restoreNotChangedProperties(newState, oldState)).to.equal(oldState);
	});

	it("should return new state with new properies", () => {
		const oldState = { a: 1, b: 2 };
		const newState = { a: 1, b: 2, c: 3 };

		expect(restoreNotChangedProperties(newState, oldState)).to.equal(newState);
	});

	it("should return new state without one properies", () => {
		const oldState = { a: 1, b: 2, c: 3 };
		const newState = { a: 1, b: 2 };

		expect(restoreNotChangedProperties(newState, oldState)).to.equal(newState);
	});

	it("should return new state with nested tables", () => {
		const oldState = { a: 1, b: 2, c: { a: 10 } };
		const newState = { a: 1, b: 2, c: { a: 9 } };

		expect(restoreNotChangedProperties(newState, oldState)).to.equal(newState);
	});

	it("should return new state with nested tables and without one properies", () => {
		const oldState = { a: 1, b: 2, c: { a: 10, c: 9 } };
		const newState = { a: 1, b: 2, c: { a: 10 } };

		expect(restoreNotChangedProperties(newState, oldState)).to.equal(newState);
	});

	it("should return new state but change nested tables", () => {
		const oldState = { a: 1, c: { a: 10 }, b: 2 };
		const newState = { a: 1, b: 1, c: { a: 10 } };
		const result = restoreNotChangedProperties(newState, oldState);

		expect(result).to.equal(newState);
		expect(result.c).to.equal(oldState.c);
	});
};
