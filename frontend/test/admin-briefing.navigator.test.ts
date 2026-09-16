import { describe, expect, it, vi } from "vitest";
import { AdminBriefingNavigator } from "../src/admin/navigation/admin-briefing.navigator.js";

function button(): HTMLButtonElement {
    return document.createElement("button");
}

describe("AdminBriefingNavigator", () => {
    it("só avança a residência quando os campos são válidos", () => {
        const navigate = vi.fn();
        const confirm = button();
        const cancel = button();
        const clients = button();
        const newClient = button();
        const canContinue = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
        const navigator = new AdminBriefingNavigator(navigate);

        navigator.bindHome({ root: [clients, newClient], cancel, confirm } as never, canContinue);
        cancel.click();
        expect(navigate).toHaveBeenCalledWith("new-client");
        navigate.mockClear();
        confirm.click();
        expect(navigate).not.toHaveBeenCalled();
        confirm.click();
        expect(navigate).toHaveBeenCalledWith("briefing-investment");
        clients.click();
        newClient.click();
        expect(navigate).toHaveBeenNthCalledWith(2, "clients");
        expect(navigate).toHaveBeenNthCalledWith(3, "new-client");
    });

    it("coordena investimento, cômodos e confirmação sem montar payload", () => {
        const navigate = vi.fn();
        const addRoom = vi.fn();
        const finish = vi.fn();
        const navigator = new AdminBriefingNavigator(navigate);
        const investmentCancel = button();
        const investmentConfirm = button();
        navigator.bindInvestment({ root: [], cancel: investmentCancel, confirm: investmentConfirm } as never);

        investmentCancel.click();
        investmentConfirm.click();
        expect(navigate).toHaveBeenNthCalledWith(1, "briefing-home");
        expect(navigate).toHaveBeenNthCalledWith(2, "briefing-rooms");

        const roomsCancel = button();
        const roomsAdd = button();
        const roomsConfirm = button();
        navigator.bindRooms({ root: [], cancel: roomsCancel, addRoom: roomsAdd, confirm: roomsConfirm } as never, addRoom);
        roomsAdd.click();
        roomsCancel.click();
        roomsConfirm.click();
        expect(addRoom).toHaveBeenCalledOnce();
        expect(navigate).toHaveBeenNthCalledWith(3, "briefing-investment");
        expect(navigate).toHaveBeenNthCalledWith(4, "briefing-finish");

        const finishButton = button();
        finishButton.id = "briefing-finish-confirm";
        const backButton = button();
        backButton.id = "briefing-finish-back";
        document.body.append(backButton);
        document.body.append(finishButton);
        navigator.bindFinish(finish);
        backButton.click();
        expect(navigate).toHaveBeenNthCalledWith(5, "briefing-rooms");
        finishButton.click();
        expect(finish).toHaveBeenCalledOnce();
        backButton.remove();
        finishButton.remove();
    });
});
