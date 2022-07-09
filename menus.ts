import { Markup } from "telegraf";
import { DcaModel } from "./util/types";

export const mainMenu = Markup.keyboard([
    ['⚙️ Settings'], ['ℹ️ Help', '📞 Feedback'],
    // ['⭐️ Rate us', '👥 Share']
]);

export const settingsMenu = Markup.keyboard([
    ['⚙️ Settings '],
    ['Change DCA amount', 'Change DCA interval'],
    ['Change DCA coins', 'Toggle alerts on/off'],
    ['Change DCA model'],
    ['Back to Main Menu']
]);

export const modelSelectionMenu = Markup.keyboard([
    [DcaModel.LinearDcaOnSteorids, DcaModel.DcaOnSteoridsByInvestAnswers],
    ['Back to Main Menu']
]);
