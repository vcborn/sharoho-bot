import { Message, Client, MessageAttachment } from 'discord.js'
import dotenv from 'dotenv'
import { Sequelize, STRING, INTEGER, JSON as SJSON } from 'sequelize'
import { timestamp } from 'timestamp-conv'
import nodeHtmlToImage from 'node-html-to-image'
import cron from 'node-cron'
import { TopLevelSpec, compile } from 'vega-lite'
import { View, parse } from 'vega'
import fs from 'fs'
import { from } from 'svg-to-img'
import Enmap from 'enmap'

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
    type: SJSON,
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

// @ts-ignore
client.settings = new Enmap({
  name: 'settings',
  fetchAll: false,
  autoFetch: true,
  cloneLevel: 'deep',
})

client.once('ready', async () => {
  if (fs.existsSync('dest.png')) {
    fs.unlinkSync('dest.png')
  }
  console.log(client.user?.tag)
  client.user?.setActivity('&set | しゃろしゃろ')
  const now = new Date()
  console.log(now)
  const db = await Tags.findAll({
    raw: true,
    order: [['record.rate', 'DESC']],
  })
  cron.schedule('58 23 * * *', async () => {
    // @ts-ignore
    client.settings.get('guild').map(async (guild: any) => {
      // @ts-ignore
      client.channels.cache.get(Object.values(guild)[0]).send({
        content: 'しゃろしゃろ',
      })
    })
  })
  cron.schedule('3 * * * *', async () => {
    // @ts-ignore
    client.settings.get('guild').map(async (guild: any) => {
      if (fs.existsSync('today.png')) {
        fs.unlinkSync('today.png')
      }
      await nodeHtmlToImage({
        output: './today.png',
        html:
          `<html>
      <body style="text-align:center;font-family:sans-serif;padding-top:5rem;padding-bottom:2.5rem;">
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
      <h2>SHAROHO RESULT (${now.getFullYear()}/${(
            '0' +
            (now.getMonth() + 1)
          ).slice(-2)}/${('0' + now.getDate()).slice(-2)})</h2>
      <table style="margin-left:auto;margin-right:auto;width:80%;border-collapse:collapse">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Record</th>
          <th>Rating</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>` +
          db.map((item: any, index) => {
            let diff = null
            if (JSON.parse(item.record).length === 1) {
              diff = 'NEW'
            } else {
              if (
                Math.sign(
                  item.rating - JSON.parse(item.record).slice(-1)[0].rate,
                ) === 1
              ) {
                diff =
                  '+' +
                  (item.rating - JSON.parse(item.record).slice(-1)[0].rate)
                    .toString
              } else {
                diff = item.rating - JSON.parse(item.record).slice(-1)[0].rate
              }
            }
            const rec = item.last.substring(11)
            let bgcolor = '#fff'
            if (item.rate >= 2800) {
              bgcolor = 'rgba(255,0,0,0.7)'
            } else if (item.rate >= 2400) {
              bgcolor = 'rgba(255,128,5,0.7)'
            } else if (item.rate >= 2000) {
              bgcolor = 'rgba(192,192,0,0.7)'
            } else if (item.rate >= 1600) {
              bgcolor = 'rgba(0,0,255,0.7)'
            } else if (item.rate >= 1200) {
              bgcolor = 'rgba(192,192,0,0.7)'
            } else if (item.rate >= 800) {
              bgcolor = 'rgba(0,128,0,0.7)'
            } else if (item.rate >= 400) {
              bgcolor = 'rgba(128,64,0,0.7)'
            } else {
              bgcolor = 'rgba(128,128,128,0.7)'
            }
            return (
              "<tr style='background-color:" +
              bgcolor +
              `'>
          <td style='background-color:#fff'>${index + 1}</td>
          <td>${item.name}</td>
          <td>${rec}</td>
          <td>${item.rating}</td>
          <td>${diff}</td>
          </tr>`
            )
          }) +
          `</tbody>
      </table>
      </body>
      </html>`,
      })
      const file = new MessageAttachment('./today.png')
      // @ts-ignore
      client.channels.cache.get(Object.values(guild)[0]).send({
        content: `SHAROHO RESULT (${now.getFullYear()}/${(
          '0' +
          (now.getMonth() + 1)
        ).slice(-2)}/${('0' + now.getDate()).slice(-2)})`,
        files: [file],
      })
    })
  })
})

client.on('messageCreate', async (message: Message) => {
  const now = new Date()
  if (message.author.bot) return
  if (message.content.startsWith('しゃろほー')) {
    if (
      // ((now.getHours() === 23 || now.getHours() === 0) &&
      now.getMinutes() === 59 ||
      now.getMinutes() === 0
    ) {
      const author = message.author.username
      const id = message.author.id
      // eslint-disable-next-line new-cap
      const date = new timestamp(message.createdAt)
      // YYYY-MM-DD hh:mm:ss.ms
      const createdAt = `${date.getYear()}/${date.getMonth()}/${date.getDay()} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}.${date.getMilliseconds()}`
      const idTag: any = await Tags.findOne({ where: { id: id } })
      const best = createdAt.substring(11)
      if (idTag) {
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

        const rate = Math.round(6000 / (newTimeDiff + 1.98))
        const record: any = idTag.get('record')
        const data = {
          date: createdAt.slice(0, -3),
          rate: rate,
        }
        record.push(data)
        idTag.increment('part')
        await Tags.update(
          { last: createdAt, record: [record], rating: rate },
          { where: { id: id } },
        )
      } else {
        const data = {
          date: createdAt,
          rate: 0,
          rank: 0.5,
        }
        const tag: any = await Tags.create({
          id: id,
          name: author,
          best: createdAt.slice(10),
          rating: 0,
          last: createdAt,
          record: [data],
        })
        const newTime = new Date(createdAt)
        const newTimeDiff =
          newTime.getMinutes() === 59
            ? 60 - newTime.getSeconds()
            : newTime.getSeconds()
        const rate = Math.round(6200 / (newTimeDiff + 2.1))

        tag.increment('part')
        const newData = {
          date: createdAt.slice(0, -3),
          rate: rate,
        }
        Tags.update(
          { last: createdAt, record: [newData], rating: rate },
          { where: { id: id } },
        )
      }
    }
  }
  if (
    // @ts-ignore
    message.mentions.has(client.user.id) ||
    message.content.startsWith('ランク' || 'らんく' || 'rank' || 'Rank')
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
                  y2: 3600,
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
          } catch (e) {
            console.log(e)
          }
        })()
      })
    } else {
      message.reply('登録されていません。')
    }
  }
  if (message.content.startsWith('&set')) {
    // @ts-ignore
    if (client.settings.has('guild')) {
      // @ts-ignore
      client.settings.push('guild', { [message.guild?.id]: message.channelId })
      message.reply('リザルトチャンネルを設定しました。')
    } else {
      // @ts-ignore
      client.settings.set('guild', [{ [message.guild?.id]: message.channelId }])
      message.reply('リザルトチャンネルを設定しました。')
    }
  }
})

client.login(process.env.TOKEN)
