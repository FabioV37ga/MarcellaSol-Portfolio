import assert from "node:assert/strict";
import test from "node:test";
import {
    integerInRange,
    paidValue,
    paymentTitle,
    paymentVersion,
    pixPartType
} from "../dist/src/application/financial/payment-input.js";

test("normaliza e valida entradas financeiras escalares", () => {
    assert.equal(paymentTitle("  Projeto executivo  "), "Projeto executivo");
    assert.equal(integerInRange("3", "A parcela", 1, 120), 3);
    assert.equal(paidValue(false), false);
    assert.equal(paymentVersion(0), 0);
    assert.equal(pixPartType("installment"), "installment");
});

test("rejeita tipos e limites inválidos com erros de aplicação", () => {
    assert.throws(() => paymentTitle("   "), error => error.status === 400 && error.message === "O título é obrigatório");
    assert.throws(() => integerInRange(0, "A parcela", 1, 120), /entre 1 e 120/);
    assert.throws(() => paidValue("true"), /verdadeiro ou falso/);
    assert.throws(() => paymentVersion("0"), /versão do pagamento é obrigatória/);
    assert.throws(() => pixPartType("entrada"), /tipo do pagamento é inválido/);
});
