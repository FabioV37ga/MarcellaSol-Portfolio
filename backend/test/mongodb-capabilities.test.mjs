import assert from "node:assert/strict";
import test from "node:test";
import { mongoDbSupportsTransactions } from "../dist/src/config/mongodb-capabilities.js";

test("reconhece replica set e mongos como topologias transacionais", () => {
    assert.equal(mongoDbSupportsTransactions({ setName: "rs0" }), true);
    assert.equal(mongoDbSupportsTransactions({ msg: "isdbgrid" }), true);
});

test("rejeita MongoDB standalone para operações transacionais", () => {
    assert.equal(mongoDbSupportsTransactions({ isWritablePrimary: true }), false);
    assert.equal(mongoDbSupportsTransactions({ setName: "" }), false);
});
