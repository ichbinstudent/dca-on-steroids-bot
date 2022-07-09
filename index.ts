import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { addDays } from 'date-fns';
import { mainMenu, modelSelectionMenu } from './menus';
import { Configuration, DcaModel } from './util/types';
import { calculatePurchaseAmount, getDrawdowns, printSettings } from './util/common';
import Context from './node_modules/telegraf/typings/context';

const { MongoClient, ServerApiVersion } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

client.connect().then(async () => {
    const database = client.db("dca-bot");

    async function getConfiguration(uid: number): Promise<Configuration> {
        const query = { uid: uid };
        const configurationCount = await database.collection("configurations").countDocuments(query);
        if (configurationCount > 0) {
            return (await database.collection("configurations").findOne(query)) as Configuration;
        } else {
            const config = { uid: uid, dcaAmount: 300, dcaIntervalInDays: 14, nextAlert: addDays(new Date(), 14), alertActive: true, coins: 'bitcoin', dcaModel: DcaModel.LinearDcaOnSteorids } as Configuration;
            await database.collection("configurations").insertOne(config);
            return config;
        }
    }

    async function putConfiguration(uid: number, config: Configuration) {
        const query = { uid: uid };
        return await database.collection("configurations").findOneAndUpdate(query, { $set: config });
    }

    const session = {} as { [key: string]: string }

    const bot = new Telegraf(process.env.BOT_TOKEN ?? '')
    bot.use(async (ctx: any, next: Function) => {
        if (ctx.from && ctx.config === undefined) {
            ctx.config = await getConfiguration(ctx.from.id);
        }
        return next();
    });

    // Register alerts
    setInterval(async () => {
        try {
            const drawdowns = await getDrawdowns();

            // Send alerts
            database.collection('configurations').find({
                nextAlert: { "$lte": new Date() }
            }).forEach(async (config: Configuration) => {
                if (config.alertActive) {
                    let message = `❗️ Buy Alerts ❗️\n`;
                    await config.coins.split(',').forEach(async (coin: string) => {
                        const drawdown = drawdowns[coin];
                        const purchaseAmount = calculatePurchaseAmount(config.dcaModel, drawdown, config.dcaAmount);
                        message += `Buy *$${purchaseAmount.toFixed(2)}* of *${coin}*\n`;
                    });
                    await bot.telegram.sendMessage(config.uid, message.replace(/\./g, '\\.'), { parse_mode: 'MarkdownV2' });
                }
                config.nextAlert = addDays(config.nextAlert, config.dcaIntervalInDays);
                putConfiguration(config.uid, config);
            });
        } catch { }
    }, 1000 * 60 * 10);

    bot.command('start', (ctx: any) => {
        if (ctx.config) {
            session[ctx.config.uid] = 'MainMenu';
        }
        return ctx.reply("Main Menu", mainMenu.resize());
    });

    /// Main interaction ///

    bot.hears('Back to Main Menu', (ctx: any) => {
        if (ctx.config) {
            session[ctx.config.uid] = 'MainMenu';
        }
        return ctx.reply("Main Menu", mainMenu.resize());
    });

    ////////////////////////

    /// 📞 Feedback ///

    bot.hears('📞 Feedback', (ctx: any) => {
        return ctx.reply('I would love to hear your feedback!\nMessage me at @MightyGarg')
    });

    ///////////////////

    /// ℹ️ Help ///
    const helpText = `
*DCA on Steroids Bot*
This is a simple bot that reminds you to do your DCA purchases.
The purchase amount depends on the drawdown from the last ATH.

Currently two models are available:

_Linear Model_

This model increases the purchased amount linearly.
The purchase amount is max at 80% drawdown.
The detailed formula is \`min(1.0, drawdown * 1.25) * dcaAmount\`

_IA Model_

The IA Model was developed by the Invest Answers team and introduced in a (video)[https://www.youtube.com/watch?v=W7q16FOR4Uk].
It uses historic drawdown distributions to decide about the optimal purchase amount.
The maximum amount is purchased between 45% and 50% drawdown.
`;

    bot.hears('ℹ️ Help', async (ctx: Context) => await ctx.replyWithMarkdown(helpText, mainMenu.resize()));
    bot.command('help', async (ctx: Context) => await ctx.replyWithMarkdown(helpText, mainMenu.resize()));
    bot.help(async (ctx: Context) => await ctx.replyWithMarkdown(helpText, mainMenu.resize()))
    /////////////

    /// ⚙️ Settings ///

    bot.hears('⚙️ Settings', async (ctx: any) => {
        if (!ctx.config) return ctx.reply('Main Menu', mainMenu.resize());
        session[ctx.config.uid] = 'Settings'
        return await printSettings(ctx);
    });

    bot.hears('Change DCA coins', async (ctx: any) => {
        if (ctx.config) {
            session[ctx.config.uid] = 'Settings.' + (ctx as any).message.text;
            return await ctx.reply('Enter a comma separated list of ids (ids are listed und API id at https://www.coingecko.com).')
        }
    });

    bot.hears('Change DCA interval', async (ctx: any) => {
        if (ctx.config) {
            session[ctx.config.uid] = 'Settings.' + ctx.message.text;
            return await ctx.reply('Enter the interval in days:')
        }
    });

    bot.hears('Change DCA amount', async (ctx: any) => {
        if (ctx.config) {
            session[ctx.config.uid] = 'Settings.' + ctx.message.text;
            return await ctx.reply('Enter the average monthly amount you want to invest:')
        }
    });

    bot.hears('Change DCA model', async (ctx: any) => {
        if (ctx.config) {
            session[ctx.config.uid] = 'Settings.' + ctx.message.text;
            return await ctx.reply('Select the model you want to use:', modelSelectionMenu.resize())
        }
    });

    bot.hears('Toggle alerts on/off', async (ctx: any) => {
        if (ctx.config) {
            ctx.config.alertActive = !ctx.config.alertActive
            await putConfiguration(ctx.config.uid, ctx.config);
            return await ctx.reply(`Alerts switched ${ctx.config.alertActive ? 'on' : 'off'}`)
        }
    });

    bot.hears(/.+/, async (ctx: any) => {
        if (!session[ctx.config.uid] || !session[ctx.config.uid].startsWith('Settings')) return;

        switch (session[ctx.config.uid].split('.').at(-1)) {
            case 'Change DCA amount':
                ctx.config.dcaAmount = Number.parseInt(ctx.message.text);
                await putConfiguration(ctx.config.uid, ctx.config);
                break;
            case 'Change DCA interval':
                ctx.config.dcaIntervalInDays = Number.parseInt((ctx as any).message.text);
                ctx.config.nextAlert = addDays(new Date(), ctx.config.dcaIntervalInDays);
                await putConfiguration(ctx.config.uid, ctx.config);
                break;
            case 'Change DCA coins':
                ctx.config.coins = ctx.message.text.replace(/ /g, '');
                await putConfiguration(ctx.config.uid, ctx.config);
                break;
            case 'Change DCA model':
                ctx.config.dcaModel = ctx.message.text;
                await putConfiguration(ctx.config.uid, ctx.config);
                break;
        }

        session[ctx.config.uid] = 'Settings';
        await ctx.reply("Config saved:")
        return await printSettings(ctx);
    });

    ///////////////////

    bot.launch()

    // Enable graceful stop
    process.once('SIGINT', () => {
        bot.stop('SIGINT');
        client.close();
    })
    process.once('SIGTERM', () => {
        bot.stop('SIGTERM');
        client.close();
    })
})
