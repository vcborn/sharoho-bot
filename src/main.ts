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
  cron.schedule('58 23 * * *', async () => {
    // @ts-ignore
    client.settings.get('guild').map(async (guild: any) => {
      // @ts-ignore
      const channel = Object.values(guild)[1]
      // @ts-ignore
      client.channels.cache.get(channel).send({
        content: 'しゃろしゃろ',
      })
    })
  })
  cron.schedule('3 0 * * *', () => {
    sendResult()
  })
})

async function sendResult() {
  const now = new Date()
  console.log(now)
  const db = await Tags.findAll({
    raw: true,
    order: [['record.rate', 'DESC']],
  })
  let id = ''
  if (fs.existsSync('today.png')) {
    fs.unlinkSync('today.png')
  }

  await nodeHtmlToImage({
    output: './today.png',
    html:
      `<html>
  <body style="text-align:center;font-family:'Noto Sans JP',Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji';padding-top:5rem;padding-bottom:2.5rem;">
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
      // eslint-disable-next-line array-callback-return
      db.map((item: any, index) => {
        if (JSON.parse(item.record)[JSON.parse(item.record).length - 1].date.slice(0, -9) === `${now.getFullYear()}/${(
          '0' +
          (now.getMonth() + 1)
        ).slice(-2)}/${('0' + now.getDate()).slice(-2)}`) {
          let diff = null
          if (index === 0) {
            id = item.id
          }
          if (JSON.parse(item.record).length === 1) {
            diff = 'NEW'
          } else {
            if (
              Math.sign(
                item.rating - JSON.parse(item.record)[JSON.parse(item.record).length - 2].rate,
              ) === 1
            ) {
              diff =
                '+' +
                (item.rating - JSON.parse(item.record)[JSON.parse(item.record).length - 2].rate)
                  .toString
            } else {
              diff = item.rating - JSON.parse(item.record)[JSON.parse(item.record).length - 2].rate
            }
          }
          const rec = item.last.substring(11)
          let bgcolor = '#fff'
          if (item.rating >= 2800) {
            bgcolor = 'rgba(255,0,0,0.3)'
          } else if (item.rating >= 2400) {
            bgcolor = 'rgba(255,128,5,0.3)'
          } else if (item.rating >= 2000) {
            bgcolor = 'rgba(192,192,0,0.3)'
          } else if (item.rating >= 1600) {
            bgcolor = 'rgba(0,0,255,0.3)'
          } else if (item.rating >= 1200) {
            bgcolor = 'rgba(192,192,0,0.3)'
          } else if (item.rating >= 800) {
            bgcolor = 'rgba(0,128,0,0.3)'
          } else if (item.rating >= 400) {
            bgcolor = 'rgba(128,64,0,0.3)'
          } else {
            bgcolor = 'rgba(128,128,128,0.3)'
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
        }
      }) +
      `</tbody>
  </table>
  </body>
  </html>`,
  })
  // @ts-ignore
  client.settings.get('guild').map(async (guild: any) => {
    const file = new MessageAttachment('./today.png')
    // @ts-ignore
    const channel = Object.values(guild)[1]
    // @ts-ignore
    client.channels.cache.get(channel).send({
      content: `SHAROHO RESULT (${now.getFullYear()}/${(
        '0' +
        (now.getMonth() + 1)
      ).slice(-2)}/${('0' + now.getDate()).slice(-2)})`,
      files: [file],
    })
  })
  const idTag: any = await Tags.findOne({ where: { id: id } })
  idTag.increment('win')
}

client.on('messageCreate', async (message: Message) => {
  const now = new Date()
  if (message.author.bot) return
  if (message.content.startsWith('しゃろほー')) {
    if (
      (now.getHours() === 23 && now.getMinutes() === 59) ||
      (now.getHours() === 0 && now.getMinutes() === 0)
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
            ? 60 - (newTime.getSeconds() + newTime.getMilliseconds() / 1000)
            : newTime.getSeconds() + newTime.getMilliseconds() / 1000
        const lastTimeDiff =
          lastTime.getMinutes() === 59
            ? 60 - (lastTime.getSeconds() + lastTime.getMilliseconds() / 1000)
            : lastTime.getSeconds() + lastTime.getMilliseconds() / 1000
        if (lastTimeDiff > newTimeDiff) {
          await Tags.update({ best: best }, { where: { id: id } })
        }

        const rate = Math.round(6000 / (newTimeDiff + 1.98))
        const record: any = idTag.get('record')
        const data = {
          date: createdAt.slice(0, -4),
          rate: rate,
        }
        record.push(data)
        idTag.increment('part')
        await Tags.update(
          { name: author, last: createdAt, record: record, rating: rate },
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
          win: 0,
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
          date: createdAt.slice(0, -4),
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
    message.content.startsWith('ランク') ||
    message.content.startsWith('らんく') ||
    message.content.startsWith('rank') ||
    message.content.startsWith('Rank')
  ) {
    const id = message.author.id
    const author = message.author.username
    const idTag = await Tags.findOne({ where: { id: id } })
    if (idTag) {
      const data: any = idTag.get('record')
      const rate: any = idTag.get('rating')
      let rank = ''
      if (rate >= 3000) {
        rank = '六段'
      } else if (rate >= 2800) {
        rank = '五段'
      } else if (rate >= 2600) {
        rank = '四段'
      } else if (rate >= 2400) {
        rank = '三段'
      } else if (rate >= 2200) {
        rank = '二段'
      } else if (rate >= 2000) {
        rank = '初段'
      } else if (rate >= 1800) {
        rank = '一級'
      } else if (rate >= 1600) {
        rank = '二級'
      } else if (rate >= 1400) {
        rank = '三級'
      } else if (rate >= 1200) {
        rank = '四級'
      } else if (rate >= 1000) {
        rank = '五級'
      } else if (rate >= 800) {
        rank = '六級'
      } else if (rate >= 600) {
        rank = '七級'
      } else if (rate >= 400) {
        rank = '八級'
      } else if (rate >= 200) {
        rank = '九級'
      } else {
        rank = '十級'
      }
      const vegaLiteSpec: TopLevelSpec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        width: 640,
        height: 480,
        padding: 20,
        config: {
          axis: {
            labelFont: 'Noto Sans JP,sans-serif,Apple Color Emoji,Segoe UI Emoji',
            titleFont: 'Noto Sans JP,sans-serif,Apple Color Emoji,Segoe UI Emoji',
          },
          point: {
            color: '#222'
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
            title: {
              text: `しゃろほー${rank} ${author}`,
              align: 'left',
              font: 'Noto Sans JP,sans-serif,Apple Color Emoji,Segoe UI Emoji',
              anchor: 'start',
              dx: 40,
            },
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
              color: '#222',
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
                ' (しゃろほー' +
                rank +
                ')\nレーティング：' +
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
      if (
        // @ts-ignore
        client.settings.get('guild').some((u) => u.guild === message.guild?.id)
      ) {
        // @ts-ignore
        const oldId = client.settings
          .get('guild')
          .find((v: any) => v.guild === message.guild?.id).channel
        // @ts-ignore
        client.settings.remove('guild', (v) => v.channel === oldId)
      }
      // @ts-ignore
      client.settings.push('guild', {
        guild: message.guild?.id,
        channel: message.channelId,
      })
      message.reply('リザルトチャンネルを設定しました。')
    } else {
      // @ts-ignore
      client.settings.set('guild', [
        { guild: message.guild?.id, channel: message.channelId },
      ])
      message.reply('リザルトチャンネルを設定しました。')
    }
  }
  if (message.content.startsWith('&help')) {
    message.reply({
      embeds: [
        {
          title: 'ヘルプ',
          description: 'しゃろほーbotの使い方',
          color: 0x466387,
          fields: [
            {
              name: 'ランク',
              value: 'あなたのしゃろほーランクを表示',
            },
            {
              name: '&set',
              value: 'リザルトを送信するチャンネルを設定',
            },
            {
              name: '&help',
              value: 'ヘルプ',
            },
            {
              name: '&about',
              value: 'このbotについて',
            },
          ],
        },
      ],
    })
  }
  if (message.content.startsWith('&about')) {
    message.reply({
      embeds: [
        {
          title: 'このbotについて',
          description:
            'しゃろほーbotは、Discord上でしゃろほーするためのbotです。\n\n製作者：wamo\nリポジトリ：[Github](https://github.com/vcborn/sharoho-bot)',
          color: 0x466387,
        },
      ],
    })
  }
  if (message.content.startsWith('&res')) {
    sendResult()
  }
})

client.login(process.env.TOKEN)
