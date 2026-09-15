import assert from "node:assert/strict";
import test from "node:test";
import { asyncRoute, RouteFailure } from "../dist/src/middleware/async-route.js";
import { errorHandler } from "../dist/src/middleware/error-handler.middleware.js";
import { ApplicationError } from "../dist/src/application/errors/application-error.js";

test("adaptador encaminha exceções síncronas e rejeições sem responder duas vezes", async () => {
    const policy = { unexpectedMessage: "Falha segura" };
    const failure = new Error("Detalhe interno");
    for (const handler of [() => { throw failure; }, () => Promise.reject(failure)]) {
        const forwarded = [];
        await asyncRoute(handler, policy)({}, {}, error => forwarded.push(error));
        assert.equal(forwarded.length, 1);
        assert.ok(forwarded[0] instanceof RouteFailure);
        assert.equal(forwarded[0].original, failure);
        assert.equal(forwarded[0].policy, policy);
    }
    let forwarded = false;
    await asyncRoute(() => undefined, policy)({}, {}, () => { forwarded = true; });
    assert.equal(forwarded, false);
});

test("middleware traduz ApplicationError direto e delega após envio dos headers", () => {
    const error = new ApplicationError("Conflito", 409);
    const response = {
        headersSent: false,
        status(value) { this.code = value; return this; },
        json(value) { this.body = value; return this; }
    };
    errorHandler(error, {}, response, () => assert.fail("Erro conhecido não deve escapar"));
    assert.equal(response.code, 409);
    assert.deepEqual(response.body, { message: "Conflito" });

    let forwarded;
    errorHandler(error, {}, { headersSent: true }, value => { forwarded = value; });
    assert.equal(forwarded, error);
});
