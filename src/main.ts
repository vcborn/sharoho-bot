import { Message, Client, MessageAttachment } from 'discord.js'
import dotenv from 'dotenv'
import { Sequelize, STRING, INTEGER, JSON } from 'sequelize'
import { timestamp } from 'timestamp-conv'
import nodeHtmlToImage from 'node-html-to-image'
import cron from 'node-cron'
import { TopLevelSpec, compile } from 'vega-lite'
import { View, parse } from 'vega'
import fs from 'fs'
import { from } from 'svg-to-img'

dotenv.config()

const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  storage: 'database.sqlite',
})

const Tags = sequelize.define('tags', {
  // ID（ユニークID）
  id: {
    type: STRING,
    unique: true,
    primaryKey: true,
  },
  // 名前
  name: STRING,
  // 優勝回数
  win: {
    type: INTEGER,
    defaultValue: 0,
  },
  // 参加回数
  part: {
    type: INTEGER,
    defaultValue: 0,
  },
  // 現在のレート（数値）
  rating: {
    type: INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  // 過去記録
  record: {
    type: JSON,
  },
  // 最高記録（hh:mm:ss.ms）
  best: STRING,
  // 最終参加（YYYY/MM/DD hh:mm:ss.ms）
  last: STRING,
})

Tags.sync()

const client = new Client({
  intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES'],
})

client.once('ready', async () => {
  console.log('Now this bot is ready!')
  console.log(client.user?.tag)
  client.user?.setActivity('しゃろしゃろ')
  const now = new Date()
  const db = await Tags.findAll({
    raw: true,
  })
  cron.schedule('4 0 * * *', () => {
    nodeHtmlToImage({
      output: './image.png',
      html:
        `<html>
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
        db.map((item: any, index) => {
          return `<tr>
          <td>${index}</td>
          <td>${item.name}</td>
          <td></td>
          <td>${item.rating}</td>
          <td></td>`
        }) +
        `</tbody>
      </table>
      </body>
      </html>`,
    })
  })
})

client.on('messageCreate', async (message: Message) => {
  const now = new Date()
  if (message.author.bot) return
  if (message.content.startsWith('しゃろほー')) {
    if (
      // (now.getHours() === 23 || now.getHours() === 0) &&
      now.getMinutes() === 59 ||
      now.getMinutes() === 0
    ) {
      const author = message.author.username
      const id = message.author.id
      // eslint-disable-next-line new-cap
      const date = new timestamp(message.author.createdAt)
      // YYYY-MM-DD hh:mm:ss.ms
      const createdAt = `${date.getYear()}/${date.getMonth()}/${date.getDay()} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}.${date.getMilliseconds()}`
      const idTag = await Tags.findOne({ where: { id: id } })
      const best = createdAt.substring(10)
      if (idTag) {
        idTag.increment('part')
        const newTime = new Date(createdAt)
        // @ts-ignore
        const lastTime = new Date(idTag.get('last'))
        const newTimeDiff =
          newTime.getMinutes() === 59
            ? 60 - newTime.getSeconds()
            : newTime.getSeconds()
        const lastTimeDiff =
          lastTime.getMinutes() === 59
            ? 60 - lastTime.getSeconds()
            : lastTime.getSeconds()
        if (lastTimeDiff > newTimeDiff) {
          await Tags.update({ best: best }, { where: { id: id } })
        }
        const rate = 0
        const record: any = idTag.get('record')
        const data = {
          date: createdAt.substring(0, -3),
          rate: rate,
        }
        record.push(data)
        await Tags.update(
          { last: createdAt, record: record },
          { where: { id: id } },
        )
      } else {
        try {
          const rate = 0
          const data = {
            date: createdAt,
            rate: rate,
          }
          const tag = await Tags.create({
            id: id,
            name: author,
            best: createdAt.substring(10),
            last: createdAt,
            record: data,
          })
          tag.increment('part')
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
              console.log('unique')
            }
          }
        }
      }
    }
  }
  if (
    // @ts-ignore
    message.mentions.has(client.user.id) ||
    message.content.startsWith('ランク' || 'らんく')
  ) {
    const id = message.author.id
    const idTag = await Tags.findOne({ where: { id: id } })
    if (idTag) {
      const data: any = idTag.get('record')
      const vegaLiteSpec: TopLevelSpec = {
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
      }
      const vegaSpec = compile(vegaLiteSpec).spec
      const view = new View(parse(vegaSpec), { renderer: 'none' })
      view.toSVG().then((svg) => {
        ;(async () => {
          const image = await from(svg).toPng()

          try {
            fs.writeFileSync('dest.png', image)
          } catch (e) {
            console.log(e)
          }
        })()
        const file = new MessageAttachment('./dest.png')
        message.reply({
          content:
            idTag.get('name') +
            '\nレーティング：' +
            idTag.get('rating') +
            '\n優勝 / 参加回数：' +
            idTag.get('win') +
            ' / ' +
            idTag.get('part') +
            '\nベスト記録：' +
            idTag.get('best'),
          files: [file],
        })
      })
    } else {
      message.reply('取得に失敗しました')
    }
  }
})

client.login(process.env.TOKEN)
