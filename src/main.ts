import { Message, Client, MessageAttachment } from 'discord.js'
import dotenv from 'dotenv'
import { Sequelize, STRING, INTEGER, JSON as SJSON } from 'sequelize'
import { timestamp as Timestamp } from 'timestamp-conv'
import nodeHtmlToImage from 'node-html-to-image'
import cron from 'node-cron'
import { TopLevelSpec, compile } from 'vega-lite'
import { View, parse } from 'vega'
import fs from 'fs'
import { from } from 'svg-to-img'
import Enmap from 'enmap'

// dotenvからコンフィグを読み込み
dotenv.config()

// Sequelizeの設定
const sequelize = new Sequelize('database', 'user', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  logging: false,
  storage: 'database.sqlite',
})

// 各タグ（データ）の構造
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

// enmapの設定
// @ts-ignore
client.settings = new Enmap({
  name: 'settings',
  fetchAll: false,
  autoFetch: true,
  cloneLevel: 'deep',
})

// botがreadyになったら
client.once('ready', async () => {
  if (fs.existsSync('dest.png')) {
    fs.unlinkSync('dest.png')
  }
  // 現在のbotのユーザータグを表示
  console.log(client.user?.tag)
  // アクティビティを設定
  client.user?.setActivity('&set | しゃろしゃろ')
  // cronで毎日23時58分に実行
  cron.schedule('58 23 * * *', async () => {
    // 全てのリザルトチャンネルを取得
    // @ts-ignore
    client.settings.get('guild').map(async (guild: any) => {
      const channel = Object.values(guild)[1]
      // メッセージを送信
      // @ts-ignore
      client.channels.cache.get(channel).send({
        content: 'しゃろしゃろ',
      })
    })
  })
  // cronで毎日0時3分に実行
  cron.schedule('3 0 * * *', () => {
    sendResult()
  })
})

async function sendResult() {
  // 現在の日付を取得
  const now = new Date()
  console.log(now)
  // 全てのデータを取得（時刻順）
  const db = await Tags.findAll({
    raw: true,
    order: [['rating', 'DESC']],
  })
  // @ts-ignore
  const id = db[0].id
  // 優勝IDとマッチする物を検索
  const idTag: any = await Tags.findOne({ where: { id: id } })
  // 優勝回数を追加
  idTag.increment('win')
  if (fs.existsSync('today.png')) {
    fs.unlinkSync('today.png')
  }
  let i = 0
  // 各行ごとに呼び出し
  // eslint-disable-next-line array-callback-return
  const eachData = db.map((item: any, index) => {
    // 今日の日付と最終参加記録の日付がマッチするか
    if (JSON.parse(item.record)[JSON.parse(item.record).length - 1].date.slice(0, -9) === `${now.getFullYear()}/${(
      '0' +
      (now.getMonth() + 1)
    ).slice(-2)}/${('0' + now.getDate()).slice(-2)}`) {
      let diff = null
      // もし新規であればNEW、そうでなければ符号付で差分を表示
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
        } else {
          diff = item.rating - JSON.parse(item.record)[JSON.parse(item.record).length - 2].rate
        }
      }
      const rec = item.last.substring(11)
      // レートごとに色を変える
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
      i++
      return (
        "<tr style='background-color:" +
        bgcolor +
        `'>
    <td style='background-color:#fff'>${i}</td>
    <td>${item.name}</td>
    <td>${rec}</td>
    <td>${item.rating}</td>
    <td>${diff}</td>
    </tr>`
      )
    }
  })
  // デフォルトの表を作成
  const html = `<html>
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
       eachData.join('') +
      `</tbody>
  </table>
  </body>
  </html>`

  // htmlから画像に変換
  await nodeHtmlToImage({
    output: './today.png',
    html: html,
  })
  // 登録されている全てのリザルトチャンネルを取得
  // @ts-ignore
  client.settings.get('guild').map(async (guild: any) => {
    // 添付ファイルに追加
    const file = new MessageAttachment('./today.png')
    // チャンネルIDを取得
    const channel = Object.values(guild)[1]
    // チャンネルに送信
    // @ts-ignore
    client.channels.cache.get(channel).send({
      content: `SHAROHO RESULT (${now.getFullYear()}/${(
        '0' +
        (now.getMonth() + 1)
      ).slice(-2)}/${('0' + now.getDate()).slice(-2)})`,
      files: [file],
    })
  })
}

client.on('messageCreate', async (message: Message) => {
  const now = new Date()
  // botは無視
  if (message.author.bot) return
  // しゃろほー
  if (message.content.startsWith('しゃろほー')) {
    // 23:59か00:00
    if (
      (now.getHours() === 23 && now.getMinutes() === 59) ||
      (now.getHours() === 0 && now.getMinutes() === 0)
    ) {
      const author = message.author.username
      const id = message.author.id
      const date = new Timestamp(message.createdAt)
      // YYYY-MM-DD hh:mm:ss.ms
      const createdAt = `${date.getYear()}/${date.getMonth()}/${date.getDay()} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}.${('000' + date.getMilliseconds()).slice(-3).toString()}`
      // ユーザーIDで検索
      const idTag: any = await Tags.findOne({ where: { id: id } })
      const best = createdAt.substring(11)
      if (idTag) {
        // 今回と前回の日時生成
        const newTime = new Date(createdAt)
        const lastTime = new Date(idTag.get('last'))
        // 差分を計算
        const newTimeDiff =
          newTime.getMinutes() === 59
            ? 60 - (newTime.getSeconds() + Number('0.' + ('000' + newTime.getMilliseconds()).slice(-3).toString()))
            : newTime.getSeconds() + Number('0.' + ('000' + newTime.getMilliseconds()).slice(-3).toString())
        const lastTimeDiff =
          lastTime.getMinutes() === 59
            ? 60 - (lastTime.getSeconds() + Number('0.' + ('000' + lastTime.getMilliseconds()).slice(-3).toString()))
            : lastTime.getSeconds() + Number('0.' + ('000' + lastTime.getMilliseconds()).slice(-3).toString())
        // 前回より良ければ保存
        if (lastTimeDiff > newTimeDiff) {
          await Tags.update({ best: best }, { where: { id: id } })
        }
        // ランク計算
        let rate = Math.round((6000 + idTag.get('part')) / (newTimeDiff + 1.98))
        const record: any = idTag.get('record')

        // フライング処理
        if (date.getMinute() === 59) {
          rate -= 600
          now.setDate(date.getDay() + 1)
        }
        const today = date.getMinute() === 59
          ? `${now.getFullYear()}/${(
          '0' +
          (now.getMonth() + 1)
        ).slice(-2)}/${('0' + now.getDate()).slice(-2)} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}`
          : `${date.getYear()}/${date.getMonth()}/${date.getDay()} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}`

        // 重複処理
        if (idTag.get('record')[idTag.get('record').length - 1].date.slice(0, -9) === `${now.getFullYear()}/${(
            '0' +
            (now.getMonth() + 1)
          ).slice(-2)}/${('0' + now.getDate()).slice(-2)}`) {
          return
        }
        // 当日記録の作成
        const data = {
          date: today,
          rate: rate,
        }
        // 記録追加
        record.push(data)
        // 参加回数追加
        idTag.increment('part')
        // データ更新
        await Tags.update(
          { name: author, last: createdAt, record: record, rating: rate },
          { where: { id: id } },
        )
      } else {
        // 記録用の初期データを作成
        const data = {
          date: createdAt,
          rate: 0,
          rank: 0.5,
        }
        // タグの初期データを作成
        const tag: any = await Tags.create({
          id: id,
          name: author,
          win: 0,
          best: createdAt.slice(10),
          rating: 0,
          last: createdAt,
          record: [data],
        })
        // 差分を計算
        const newTime = new Date(createdAt)
        const newTimeDiff =
        newTime.getMinutes() === 59
          ? 60 - (newTime.getSeconds() + Number('0.' + ('000' + newTime.getMilliseconds()).slice(-3).toString()))
          : newTime.getSeconds() + Number('0.' + ('000' + newTime.getMilliseconds()).slice(-3).toString())
        // レートを計算
        let rate = Math.round(6200 / (newTimeDiff + 2.1))
        if (newTime.getMinutes() === 59) {
          rate -= 600
        }
        // 参加回数を追加
        tag.increment('part')
        const newData = {
          date: createdAt.slice(0, -4),
          rate: rate,
        }
        // データ更新
        Tags.update(
          { last: createdAt, record: [newData], rating: rate },
          { where: { id: id } },
        )
      }
    }
  }
  if (
    message.content.startsWith('ランク') ||
    message.content.startsWith('らんく') ||
    message.content.startsWith('rank') ||
    message.content.startsWith('Rank')
  ) {
    // 送信者のID
    const id = message.author.id
    // 送信者のユーザー名
    const author = message.author.username
    const idTag = await Tags.findOne({ where: { id: id } })
    if (idTag) {
      const data: any = idTag.get('record')
      const rate: any = idTag.get('rating')
      let rank = ''
      // ランクごとの処理
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

      // Vegaのコンフィグ
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
      // SVGを生成
      view.toSVG().then((svg) => {
        ;(async () => {
          // PNGに変換
          const image = await from(svg).toPng()

          try {
            // 書き込み
            fs.writeFileSync('dest.png', image)
            const file = new MessageAttachment('./dest.png')
            // 返信
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
  // 送信時刻を返信
  if (message.content.startsWith('しゃろしゃろ')) {
    const date = new Timestamp(message.createdAt)
    message.reply(`送信時刻：${date.getYear()}/${date.getMonth()}/${date.getDay()} ${date.getHour()}:${date.getMinute()}:${date.getSeconds()}.${('000' + date.getMilliseconds()).slice(-3).toString()}`)
  }
  if (message.content.startsWith('&set')) {
    // @ts-ignore
    if (client.settings.has('guild')) {
      if (
        // guildがあり、なおかつ送信元サーバーのIDがある
        // @ts-ignore
        client.settings.get('guild').some((u) => u.guild === message.guild?.id)
      ) {
        // 変更前のチャンネルIDを取得
        // @ts-ignore
        const oldId = client.settings
          .get('guild')
          .find((v: any) => v.guild === message.guild?.id).channel
        // 合致するものを削除
        // @ts-ignore
        client.settings.remove('guild', (v) => v.channel === oldId)
      }
      // @ts-ignore
      client.settings.push('guild', {
        guild: message.guild?.id,
        channel: message.channelId,
      })
      message.reply('リザルトチャンネルに設定しました。')
    } else {
      // guildが無ければ新しく作成
      // @ts-ignore
      client.settings.set('guild', [
        { guild: message.guild?.id, channel: message.channelId },
      ])
      message.reply('リザルトチャンネルに設定しました。')
    }
  }
  if (message.content.startsWith('&remove')) {
    // もしguild項目があれば
    // @ts-ignore
    if (client.settings.has('guild')) {
      if (
        // リザルトチャンネルが送信元のサーバーIDに紐づけられているか
        // @ts-ignore
        client.settings.get('guild').some((u) => u.guild === message.guild?.id)
      ) {
        // 現在のリザルトチャンネルのIDを取得
        // @ts-ignore
        const oldId = client.settings
          .get('guild')
          .find((v: any) => v.guild === message.guild?.id).channel
        // 該当のタグを削除
        // @ts-ignore
        client.settings.remove('guild', (v) => v.channel === oldId)
        message.reply('リザルトチャンネルから除外しました。')
      } else {
        message.reply('リザルトチャンネルが設定されていません。')
      }
    } else {
      message.reply('問題が発生しました。管理者に連絡してください。')
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
              value: 'リザルトを送信するチャンネルに設定',
            },
            {
              name: '&remove',
              value: 'リザルトチャンネルから除外',
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
  // ユーザー認証を追加（message.author.idは管理者のユーザーID）
  if (message.content.startsWith('&res') && message.author.id === '368027170003484673') {
    sendResult()
  }
})

client.login(process.env.TOKEN)
