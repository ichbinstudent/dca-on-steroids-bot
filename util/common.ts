import { Message } from "telegraf/typings/core/types/typegram";
import { settingsMenu } from "../menus";
import { DcaModel } from "./types";

const axios = require('axios').default;

export async function getDrawdowns(): Promise<{ [key: string]: number }> {
    const drawdowns: { [key: string]: number } = {};
    const topCoins = (await axios.get('https://api.coingecko.com/api/v3/coins')).data.map((coin: any) => coin['id']);
    for (let i = 0; i < topCoins.length; i++) {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${topCoins[i]}`);
        const ath: number = response.data['market_data']['ath']['usd'];
        const currentPrice: number = response.data['market_data']['current_price']['usd'];
        drawdowns[topCoins[i]] = 1 - (currentPrice / ath);
    }

    return drawdowns
}

export function printSettings(ctx: any): Promise<Message.TextMessage> {
    return ctx.reply(
        `DCA interval: ${ctx.config?.dcaIntervalInDays} days
DCA amount: $${ctx.config?.dcaAmount}
DCA coins: ${ctx.config?.coins}
DCA Model: ${ctx.config?.dcaModel}
Alerts ${ctx.config?.alertActive ? 'active' : 'off'}
Next alert after: ${ctx.config?.nextAlert.toISOString()}
`, settingsMenu.resize());
}

export function calculatePurchaseAmount(model: DcaModel, drawdown: number, dcaAmount: number): number {
    switch (model) {
        case DcaModel.DcaOnSteoridsByInvestAnswers:
            // https://www.youtube.com/watch?v=W7q16FOR4Uk
            let purchaseAmount = 0;
            if (drawdown >= 0.5 && drawdown <= 0.57)
                purchaseAmount = 2 * dcaAmount;
            else if (drawdown >= 0.45 && drawdown < 0.50)
                purchaseAmount = 4.26 * dcaAmount;
            else if (drawdown >= 0.40 && drawdown < 0.45)
                purchaseAmount = 2.64 * dcaAmount;
            else if (drawdown >= 0.35 && drawdown < 0.40)
                purchaseAmount = 1.66 * dcaAmount;
            return purchaseAmount;
        case DcaModel.LinearDcaOnSteorids:
            // purchase amount is max at 80% drawdown
            // min(1.0, drawdown * 1.25) * dcaAmount
            return Math.min(1.0, drawdown * 1.25) * dcaAmount;
    }
    return 0;
}
