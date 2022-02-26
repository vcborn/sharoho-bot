"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const sequelize_1 = require("sequelize");
const timestamp_conv_1 = require("timestamp-conv");
const node_html_to_image_1 = __importDefault(require("node-html-to-image"));
const node_cron_1 = __importDefault(require("node-cron"));
const vega_lite_1 = require("vega-lite");
const vega_1 = require("vega");
const fs_1 = __importDefault(require("fs"));
const svg_to_img_1 = require("svg-to-img");
dotenv_1.default.config();
const sequelize = new sequelize_1.Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
});
const Tags = sequelize.define('tags', {
    // ID（ユニークID）
    id: {
        type: sequelize_1.STRING,
        unique: true,
        primaryKey: true,
    },
    // 名前
    name: sequelize_1.STRING,
    // 優勝回数
    win: {
        type: sequelize_1.INTEGER,
        defaultValue: 0,
    },
    // 参加回数
    part: {
        type: sequelize_1.INTEGER,
        defaultValue: 0,
    },
    // 現在のレート（数値）
    rating: {
        type: sequelize_1.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    // 過去記録
    record: {
        type: sequelize_1.JSON,
    },
    // 最高記録（hh:mm:ss.ms）
    best: sequelize_1.STRING,
    // 最終参加（YYYY/MM/DD hh:mm:ss.ms）
    last: sequelize_1.STRING,
});
Tags.sync();
const client = new discord_js_1.Client({
    intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES'],
});
client.once('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log('Now this bot is ready!');
    console.log((_a = client.user) === null || _a === void 0 ? void 0 : _a.tag);
    (_b = client.user) === null || _b === void 0 ? void 0 : _b.setActivity('しゃろしゃろ');
    const now = new Date();
    const db = yield Tags.findAll({
        raw: true,
    });
    node_cron_1.default.schedule('4 0 * * *', () => {
        (0, node_html_to_image_1.default)({
            output: './image.png',
            html: `<html>
      <body style="text-align:center;font-family:sans-serif">
      <style>
      th, td {
      border:1px solid black;
      padding-top:4px;
      padding-bottom:4px;
      }
      th:first-child {
      border:none
      }
      tr td {
      padding-left:4px;
      }
      </style>
      <h2>SHAROHO RESULT (${now.getFullYear()}/${now.getMonth()}/${now.getDay()})</h2>
      <table style="margin-left:auto;margin-right:auto;width:80%;border-collapse:collapse">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Record</th>
          <th>Perf.</th>
          <th>Rating</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>` +
                db.map((item, index) => {
                    return `<tr>
          <td>${index}</td>
          <td>${item.name}</td>
          <td></td>
          <td>${item.rating}</td>
          <td></td>`;
                }) +
                `</tbody>
      </table>
      </body>
      </html>`,
        });
    });
}));
client.on('messageCreate', (message) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    if (message.author.bot)
        return;
    if (message.content.startsWith('しゃろほー')) {
        if (
        // (now.getHours() === 23 || now.getHours() === 0) &&
        now.getMinutes() === 59 ||
            now.getMinutes() === 0) {
            const author = message.author.username;
            const id = message.author.id;
            // eslint-disable-next-line new-cap
            const date = new timestamp_conv_1.timestamp(message.author.createdAt);
            // YYYY-MM-DD hh:mm:ss.ms
            const createdAt = `${date.getYear()}/${date.getMonth()}/${date.getDay()} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}.${date.getMilliseconds()}`;
            const idTag = yield Tags.findOne({ where: { id: id } });
            const best = createdAt.substring(10);
            if (idTag) {
                idTag.increment('part');
                const newTime = new Date(createdAt);
                // @ts-ignore
                const lastTime = new Date(idTag.get('last'));
                const newTimeDiff = newTime.getMinutes() === 59
                    ? 60 - newTime.getSeconds()
                    : newTime.getSeconds();
                const lastTimeDiff = lastTime.getMinutes() === 59
                    ? 60 - lastTime.getSeconds()
                    : lastTime.getSeconds();
                if (lastTimeDiff > newTimeDiff) {
                    yield Tags.update({ best: best }, { where: { id: id } });
                }
                const rate = 0;
                const record = idTag.get('record');
                const data = {
                    date: createdAt.substring(0, -3),
                    rate: rate,
                };
                record.push(data);
                yield Tags.update({ last: createdAt, record: record }, { where: { id: id } });
            }
            else {
                try {
                    const rate = 0;
                    const data = {
                        date: createdAt,
                        rate: rate,
                    };
                    const tag = yield Tags.create({
                        id: id,
                        name: author,
                        best: createdAt.substring(10),
                        last: createdAt,
                        record: data,
                    });
                    tag.increment('part');
                }
                catch (error) {
                    if (error instanceof Error) {
                        if (error.name === 'SequelizeUniqueConstraintError') {
                            console.log('unique');
                        }
                    }
                }
            }
        }
    }
    if (
    // @ts-ignore
    message.mentions.has(client.user.id) ||
        message.content.startsWith('ランク' || 'らんく')) {
        const id = message.author.id;
        const idTag = yield Tags.findOne({ where: { id: id } });
        if (idTag) {
            const data = idTag.get('record');
            const vegaLiteSpec = {
                $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
                width: 640,
                height: 480,
                padding: 20,
                config: {
                    axis: {
                        labelFont: 'sans-serif',
                        titleFont: 'sans-serif',
                    },
                },
                transform: [
                    {
                        timeUnit: 'yearmonthdatehoursminutesseconds',
                        field: 'date',
                        as: 'monthdate',
                    },
                ],
                layer: [
                    {
                        mark: {
                            type: 'rect',
                            opacity: 0.2,
                            clip: true,
                        },
                        data: {
                            values: [
                                {
                                    classification: 'gray',
                                    y: 0,
                                    y2: 400,
                                },
                                {
                                    classification: 'brown',
                                    y: 400,
                                    y2: 800,
                                },
                                {
                                    classification: 'green',
                                    y: 800,
                                    y2: 1200,
                                },
                                {
                                    classification: 'cyan',
                                    y: 1200,
                                    y2: 1600,
                                },
                                {
                                    classification: 'blue',
                                    y: 1600,
                                    y2: 2000,
                                },
                                {
                                    classification: 'yellow',
                                    y: 2000,
                                    y2: 2400,
                                },
                                {
                                    classification: 'orange',
                                    y: 2400,
                                    y2: 2800,
                                },
                                {
                                    classification: 'red',
                                    y: 2800,
                                    y2: 3200,
                                },
                            ],
                        },
                        encoding: {
                            color: {
                                type: 'nominal',
                                field: 'classification',
                                legend: null,
                                scale: {
                                    domain: [
                                        'gray',
                                        'brown',
                                        'green',
                                        'cyan',
                                        'blue',
                                        'yellow',
                                        'orange',
                                        'red',
                                    ],
                                    range: [
                                        '#808080',
                                        '#804000',
                                        '#008000',
                                        '#00C0C0',
                                        '#0000FF',
                                        '#C0C000',
                                        '#FF8005',
                                        '#FF0000',
                                    ],
                                },
                            },
                            y: {
                                type: 'quantitative',
                                field: 'y',
                            },
                            y2: {
                                type: 'quantitative',
                                field: 'y2',
                            },
                        },
                    },
                    {
                        mark: {
                            type: 'line',
                            point: true,
                        },
                        data: {
                            values: data,
                        },
                        encoding: {
                            x: {
                                timeUnit: 'monthdate',
                                field: 'date',
                                axis: {
                                    grid: false,
                                    title: null,
                                },
                            },
                            y: {
                                aggregate: 'mean',
                                field: 'rate',
                                scale: {
                                    domain: [0, 3200],
                                },
                                axis: {
                                    title: 'Rating',
                                },
                            },
                        },
                    },
                ],
            };
            const vegaSpec = (0, vega_lite_1.compile)(vegaLiteSpec).spec;
            const view = new vega_1.View((0, vega_1.parse)(vegaSpec), { renderer: 'none' });
            view.toSVG().then((svg) => {
                ;
                (() => __awaiter(void 0, void 0, void 0, function* () {
                    const image = yield (0, svg_to_img_1.from)(svg).toPng();
                    try {
                        fs_1.default.writeFileSync('dest.png', image);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }))();
                const file = new discord_js_1.MessageAttachment('./dest.png');
                message.reply({
                    content: idTag.get('name') +
                        '\nレーティング：' +
                        idTag.get('rating') +
                        '\n優勝 / 参加回数：' +
                        idTag.get('win') +
                        ' / ' +
                        idTag.get('part') +
                        '\nベスト記録：' +
                        idTag.get('best'),
                    files: [file],
                });
            });
        }
        else {
            message.reply('取得に失敗しました');
        }
    }
}));
client.login(process.env.TOKEN);
