import { Context } from "telegraf";

export enum DcaModel {
    DcaOnSteoridsByInvestAnswers = 'IA Model',
    LinearDcaOnSteorids = 'Linear Model'
}

export interface Configuration {
    uid: number;
    dcaIntervalInDays: number;
    dcaAmount: number;
    nextAlert: Date;
    alertActive: boolean;
    coins: string; // comma separated list of coingecko ids
    dcaModel: DcaModel;
}

// Define your own context type
export interface MyContext extends Context {
    config?: Configuration
}
