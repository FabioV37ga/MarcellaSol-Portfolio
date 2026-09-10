import assert from "node:assert/strict";
import test from "node:test";
import { configureOutboundNetwork } from "../dist/src/config/outbound-network.js";

test("backend prioriza IPv4 nas conexões externas", () => {
    const configured = [];
    configureOutboundNetwork(undefined, value => configured.push(value));
    assert.deepEqual(configured, ["ipv4first"]);
});
