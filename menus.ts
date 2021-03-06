import { Markup } from "telegraf";
import { DcaModel } from "./util/types";

export const mainMenu = Markup.keyboard([
    ['âī¸ Settings'], ['âšī¸ Help', 'đ Feedback'],
    // ['â­ī¸ Rate us', 'đĨ Share']
]);

export const settingsMenu = Markup.keyboard([
    ['âī¸ Settings '],
    ['Change DCA amount', 'Change DCA interval'],
    ['Change DCA coins', 'Toggle alerts on/off'],
    ['Change DCA model'],
    ['Back to Main Menu']
]);

export const modelSelectionMenu = Markup.keyboard([
    [DcaModel.LinearDcaOnSteorids, DcaModel.DcaOnSteoridsByInvestAnswers],
    ['Back to Main Menu']
]);
