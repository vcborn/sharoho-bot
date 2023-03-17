import { Message, Client, AttachmentBuilder } from "discord.js"
import dotenv from "dotenv"
import { Op } from "sequelize"
import nodeHtmlToImage from "node-html-to-image"
import cron from "node-cron"
import { TopLevelSpec, compile } from "vega-lite"
import { View, parse } from "vega"
import fs from "fs"
import { from } from "svg-to-img"
import Enmap from "enmap"
import { differenceInMilliseconds, format, getMinutes } from "date-fns"
import cuid from "cuid"
import Users from "./models/users"
import Records from "./models/records"

// dotenvからコンフィグを読み込み
dotenv.config()

const prefix = process.env.PREFIX ? process.env.PREFIX : "&"

Users.sync()
Records.sync()

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
})

// enmapの設定
// @ts-ignore
client.settings = new Enmap({
  name: "settings",
  fetchAll: false,
  autoFetch: true,
  cloneLevel: "deep",
})

// botがreadyになったら
client.once("ready", async () => {
  if (fs.existsSync("dest.png")) {
    fs.unlinkSync("dest.png")
  }
  // 現在のbotのユーザータグを表示
  console.log(client.user?.tag)
  // アクティビティを設定
  client.user?.setActivity(prefix + "set | しゃろしゃろ")
  // cronで毎日23時58分に実行
  cron.schedule("58 23 * * *", async () => {
    // 全てのリザルトチャンネルを取得
    // @ts-ignore
    client.settings.get("guild").map(async (guild: any) => {
      const channel = Object.values(guild)[1]
      // メッセージを送信
      try {
        // @ts-ignore
        client.channels.cache.get(channel).send({
          content: "しゃろしゃろ",
        })
      } catch (e) {
        console.log(e)
      }
    })
  })
  // cronで毎日0時3分に実行
  cron.schedule("3 0 * * *", () => {
    sendResult()
  })
})

async function sendResult() {
  // 現在の日付を取得
  const now = new Date()
  // 全てのデータを取得（時刻順）
  const db = await Records.findAll({
    where: {
      date: {
        [Op.gt]: new Date(new Date().setDate(now.getDate() - 1)).setHours(23, 59, 0, 0),
        [Op.lt]: new Date()
      },
    },
    raw: true,
    order: [["rate", "DESC"]],
  })
  if (fs.existsSync("today.png")) {
    fs.unlinkSync("today.png")
  }
  // 各行ごとに呼び出し
  // eslint-disable-next-line array-callback-return
  const eachData = db.map(async (item: any, index: number) => {
    const user: any = await Users.findOne({ where: { id: item.userId } })
    const recordsLength: any = await Records.count({ where: { userId: item.userId } })
    if (index === 0) {
      user.increment("win")
    }
    let diff = ""
    // もし新規であればNEW、そうでなければ符号付で差分を表示
    if (recordsLength === 1) {
      diff = "NEW"
    } else {
      diff = Math.sign(user.rating - item.rate) === 1
        ? "+" + (user.rating - item.rate)
        : (user.rating - item.rate).toString()
    }
    const rec = user.last.substring(11)
    // レートごとに色を変える
    let bgcolor = "#fff"
    if (item.rating >= 2800) {
      bgcolor = "rgba(255,0,0,0.3)"
    } else if (item.rating >= 2400) {
      bgcolor = "rgba(255,128,5,0.3)"
    } else if (item.rating >= 2000) {
      bgcolor = "rgba(192,192,0,0.3)"
    } else if (item.rating >= 1600) {
      bgcolor = "rgba(0,0,255,0.3)"
    } else if (item.rating >= 1200) {
      bgcolor = "rgba(192,192,0,0.3)"
    } else if (item.rating >= 800) {
      bgcolor = "rgba(0,128,0,0.3)"
    } else if (item.rating >= 400) {
      bgcolor = "rgba(128,64,0,0.3)"
    } else {
      bgcolor = "rgba(128,128,128,0.3)"
    }
    return (
      `"<tr style="background - color: "${bgcolor}">
    <td style="background-color:#fff">${index + 1}</td>
    <td>${item.name}</td>
    <td>${rec}</td>
    <td>${item.rating}</td>
    <td>${diff}</td>
    </tr>`
    )
  })
  // デフォルトの表を作成
  const html = `<html>
  <body style="text-align:center;font-family:"Noto Sans JP",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";padding-top:5rem;padding-bottom:2.5rem;">
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
  <h2>SHAROHO RESULT (${format(now, "yyyy/MM/dd")})</h2>
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
    eachData.join("") +
    `</tbody>
  </table>
  </body>
  </html>`

  // htmlから画像に変換
  await nodeHtmlToImage({
    output: "./today.png",
    html,
  })
  // 登録されている全てのリザルトチャンネルを取得
  // @ts-ignore
  client.settings.get("guild").map(async (guild: any) => {
    try {
      if (eachData.length > 0) {
        // 添付ファイルに追加
        const file = new AttachmentBuilder("./today.png")
        // チャンネルIDを取得
        const channel = Object.values(guild)[1]
        // @ts-ignore
        client.channels.cache.get(channel).send({
          content: `SHAROHO RESULT (${format(now, "yyyy/MM/dd")})`,
          files: [file],
        })
      } else {
        const channel = Object.values(guild)[1]
        // @ts-ignore
        client.channels.cache.get(channel).send({
          content: "本日の参加者はいませんでした",
        })
      }
    } catch (e) {
      console.log(e)
    }
  })
}

const env = process.env.NODE_ENV || "production"

client.on("messageCreate", async (message: Message) => {
  const now = new Date()
  // botは無視
  if (message.author.bot) return
  // しゃろほー
  if (message.content === "しゃろほー") {
    // 23:59か00:00
    if (
      (now.getHours() === 23 && now.getMinutes() === 59) ||
      (now.getHours() === 0 && now.getMinutes() === 0) ||
      env === "development"
    ) {
      const author = message.author.username
      const id = message.author.id
      const date = new Date(message.createdAt)
      // YYYY-MM-DD hh:mm:ss.ms
      const createdAt = `${format(date, "yyyy/MM/dd HH:mm:ss")}.${date.getMilliseconds()}`
      // ユーザーIDで検索
      const user = await Users.findOne({ where: { id } })
      const best = createdAt.substring(11)
      if (user) {
        // 今回と前回の日時生成
        const newTime = date
        const lastTime = new Date(user.last)
        // 差分を計算
        let newTimeDiff =
          Math.abs(differenceInMilliseconds(newTime, new Date(new Date(newTime).setHours(0, 0, 0, 0)))) / 1000
        let lastTimeDiff =
          Math.abs(differenceInMilliseconds(lastTime, new Date(new Date(lastTime).setHours(0, 0, 0, 0)))) / 1000

        // ランク計算
        let rate = Math.round((6000 + user.part) / (newTimeDiff + 1.98))
        // フライング処理
        if (Number(getMinutes(date)) >= 31) {
          rate -= 600
          rate = rate < 0 ? 0 : rate
          newTimeDiff = Math.abs(differenceInMilliseconds(newTime, new Date(new Date().setDate(newTime.getDate() + 1)).setHours(0, 0, 0, 0))) / 1000
        }
        if (Number(getMinutes(lastTime) >= 31)) {
          lastTimeDiff = Math.abs(differenceInMilliseconds(lastTime, new Date(new Date().setDate(lastTime.getDate() + 1)).setHours(0, 0, 0, 0))) / 1000
        }
        const now = new Date()
        // 全てのデータを取得（時刻順）
        const gt = new Date().getHours() === 0 ? new Date(new Date().setDate(now.getDate() - 1)).setHours(23, 59, 0, 0) : new Date().setHours(23, 59, 0, 0)
        const lt = new Date().getHours() === 0 ? new Date().setHours(0, 1, 0, 0) : new Date(new Date().setDate(now.getDate() + 1)).setHours(0, 1, 0, 0)
        const records = await Records.findAll({
          where: {
            date: {
              [Op.gt]: gt,
              [Op.lt]: lt
            },
            userId: id
          },
          raw: true,
        })
        // 重複処理
        if (records.length > 0) {
          // 前回より良ければ保存
          if (lastTimeDiff > newTimeDiff) {
            await Users.update({ best }, { where: { id } })
          }
          // 記録追加
          await Records.create({
            id: cuid(),
            date: newTime,
            rate,
            userId: id
          })
          // 参加回数追加
          await user.increment("part")
          // データ更新
          await Users.update(
            { name: author, last: date, rating: rate },
            { where: { id } },
          )
        }
      } else {
        // ユーザーの初期データを作成
        const user = await Users.create({
          id,
          name: author,
          win: 0,
          part: 0,
          best: createdAt.slice(10),
          rating: 0,
          last: date,
        })
        // 差分を計算
        const newTime = date
        let newTimeDiff = Math.abs(differenceInMilliseconds(newTime, new Date(new Date(newTime).setHours(0, 0, 0, 0)))) / 1000
        // レートを計算
        let rate = Math.round(6200 / (newTimeDiff + 2.1))
        if (newTime.getMinutes() >= 31) {
          rate -= 600
          rate = rate < 0 ? 0 : rate
          newTimeDiff = Math.abs(differenceInMilliseconds(newTime, new Date(new Date().setDate(newTime.getDate() + 1)).setHours(0, 0, 0, 0))) / 1000
        }
        // 参加回数を追加
        await user.increment("part")
        await Records.create({
          id: cuid(),
          date,
          rate,
          userId: id
        })
        // データ更新
        await Users.update(
          { last: date, rating: rate },
          { where: { id } },
        )
      }
    }
  }
  if (
    message.content === "ランク" ||
    message.content === "らんく" ||
    message.content === "rank" ||
    message.content === "Rank"
  ) {
    // 送信者のID
    const id = message.author.id
    // 送信者のユーザー名
    const author = message.author.username
    const idTag = await Users.findOne({ where: { id } })
    if (idTag) {
      const data: any = idTag.get("record")
      const rate: any = idTag.get("rating")
      let rank = ""
      // ランクごとの処理
      if (rate >= 3000) {
        rank = "六段"
      } else if (rate >= 2800) {
        rank = "五段"
      } else if (rate >= 2600) {
        rank = "四段"
      } else if (rate >= 2400) {
        rank = "三段"
      } else if (rate >= 2200) {
        rank = "二段"
      } else if (rate >= 2000) {
        rank = "初段"
      } else if (rate >= 1800) {
        rank = "一級"
      } else if (rate >= 1600) {
        rank = "二級"
      } else if (rate >= 1400) {
        rank = "三級"
      } else if (rate >= 1200) {
        rank = "四級"
      } else if (rate >= 1000) {
        rank = "五級"
      } else if (rate >= 800) {
        rank = "六級"
      } else if (rate >= 600) {
        rank = "七級"
      } else if (rate >= 400) {
        rank = "八級"
      } else if (rate >= 200) {
        rank = "九級"
      } else {
        rank = "十級"
      }

      // Vegaのコンフィグ
      const vegaLiteSpec: TopLevelSpec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        width: 640,
        height: 480,
        padding: 20,
        config: {
          axis: {
            labelFont: "Noto Sans JP,sans-serif,Apple Color Emoji,Segoe UI Emoji",
            titleFont: "Noto Sans JP,sans-serif,Apple Color Emoji,Segoe UI Emoji",
          },
          point: {
            color: "#222"
          },
        },
        transform: [
          {
            timeUnit: "yearmonthdatehoursminutesseconds",
            field: "date",
            as: "monthdate",
          },
        ],
        layer: [
          {
            title: {
              text: `しゃろほー${rank} ${author}`,
              align: "left",
              font: "Noto Sans JP,sans-serif,Apple Color Emoji,Segoe UI Emoji",
              anchor: "start",
              dx: 40,
            },
            mark: {
              type: "rect",
              opacity: 0.2,
              clip: true,
            },
            data: {
              values: [
                {
                  classification: "gray",
                  y: 0,
                  y2: 400,
                },
                {
                  classification: "brown",
                  y: 400,
                  y2: 800,
                },
                {
                  classification: "green",
                  y: 800,
                  y2: 1200,
                },
                {
                  classification: "cyan",
                  y: 1200,
                  y2: 1600,
                },
                {
                  classification: "blue",
                  y: 1600,
                  y2: 2000,
                },
                {
                  classification: "yellow",
                  y: 2000,
                  y2: 2400,
                },
                {
                  classification: "orange",
                  y: 2400,
                  y2: 2800,
                },
                {
                  classification: "red",
                  y: 2800,
                  y2: 3600,
                },
              ],
            },
            encoding: {
              color: {
                type: "nominal",
                field: "classification",
                legend: null,
                scale: {
                  domain: [
                    "gray",
                    "brown",
                    "green",
                    "cyan",
                    "blue",
                    "yellow",
                    "orange",
                    "red",
                  ],
                  range: [
                    "#808080",
                    "#804000",
                    "#008000",
                    "#00C0C0",
                    "#0000FF",
                    "#C0C000",
                    "#FF8005",
                    "#FF0000",
                  ],
                },
              },
              y: {
                type: "quantitative",
                field: "y",
              },
              y2: {
                type: "quantitative",
                field: "y2",
              },
            },
          },
          {
            mark: {
              type: "line",
              point: true,
              color: "#222",
            },
            data: {
              values: data,
            },
            encoding: {
              x: {
                timeUnit: "monthdate",
                field: "date",
                axis: {
                  grid: false,
                  title: null,
                },
              },
              y: {
                aggregate: "mean",
                field: "rate",
                scale: {
                  domain: [0, 3200],
                },
                axis: {
                  title: "Rating",
                },
              },
            },
          },
        ],
      }
      const vegaSpec = compile(vegaLiteSpec).spec
      const view = new View(parse(vegaSpec), { renderer: "none" })
      // SVGを生成
      view.toSVG().then((svg) => {
        ; (async () => {
          try {
            // PNGに変換
            const image = await from(svg).toPng()

            // 書き込み
            fs.writeFileSync("dest.png", image)
            const file = new AttachmentBuilder("./dest.png")
            // 返信
            message.reply({
              content:
                idTag.get("name") +
                " (しゃろほー" +
                rank +
                ")\nレーティング：" +
                idTag.get("rating") +
                "\n優勝 / 参加回数：" +
                idTag.get("win") +
                " / " +
                idTag.get("part") +
                "\nベスト記録：" +
                idTag.get("best"),
              files: [file],
            })
          } catch (e) {
            message.reply("エラーが発生しました。\n再度送信してください。")
          }
        })()
      })
    } else {
      message.reply("登録されていません。")
    }
  }
  // 送信時刻を返信
  if (message.content === "しゃろしゃろ") {
    const date = new Date(message.createdAt)
    message.reply(`送信時刻：${format(date, "yyyy/MM/dd HH:mm:ss")}.${("000" + date.getMilliseconds()).slice(-3).toString()}`)
  }
  if (message.content === prefix + "set") {
    // @ts-ignore
    if (client.settings.has("guild")) {
      if (
        // guildがあり、なおかつ送信元サーバーのIDがある
        // @ts-ignore
        client.settings.get("guild").some((u) => u.guild === message.guild?.id)
      ) {
        // 変更前のチャンネルIDを取得
        // @ts-ignore
        const oldId = client.settings
          .get("guild")
          .find((v: any) => v.guild === message.guild?.id).channel
        // 合致するものを削除
        // @ts-ignore
        client.settings.remove("guild", (v) => v.channel === oldId)
      }
      // @ts-ignore
      client.settings.push("guild", {
        guild: message.guild?.id,
        channel: message.channelId,
      })
      message.reply("リザルトチャンネルに設定しました。")
    } else {
      // guildが無ければ新しく作成
      // @ts-ignore
      client.settings.set("guild", [
        { guild: message.guild?.id, channel: message.channelId },
      ])
      message.reply("リザルトチャンネルに設定しました。")
    }
  }
  if (message.content === prefix + "remove") {
    // もしguild項目があれば
    // @ts-ignore
    if (client.settings.has("guild")) {
      if (
        // リザルトチャンネルが送信元のサーバーIDに紐づけられているか
        // @ts-ignore
        client.settings.get("guild").some((u) => u.guild === message.guild?.id)
      ) {
        // 現在のリザルトチャンネルのIDを取得
        // @ts-ignore
        const oldId = client.settings
          .get("guild")
          .find((v: any) => v.guild === message.guild?.id).channel
        // 該当のタグを削除
        // @ts-ignore
        client.settings.remove("guild", (v) => v.channel === oldId)
        message.reply("リザルトチャンネルから除外しました。")
      } else {
        message.reply("リザルトチャンネルが設定されていません。")
      }
    } else {
      message.reply("問題が発生しました。管理者に連絡してください。")
    }
  }
  if (message.content === prefix + "help") {
    message.reply({
      embeds: [
        {
          title: "ヘルプ",
          description: "しゃろほーbotの使い方",
          color: 0x466387,
          fields: [
            {
              name: "ランク",
              value: "あなたのしゃろほーランクを表示",
            },
            {
              name: "&set",
              value: "リザルトを送信するチャンネルに設定",
            },
            {
              name: "&remove",
              value: "リザルトチャンネルから除外",
            },
            {
              name: "&help",
              value: "ヘルプ",
            },
            {
              name: "&about",
              value: "このbotについて",
            },
          ],
        },
      ],
    })
  }
  if (message.content === prefix + "about") {
    message.reply({
      embeds: [
        {
          title: "このbotについて",
          description:
            "しゃろほーbotは、Discord上でしゃろほーするためのbotです。\n\n製作者：wamo\nリポジトリ：[Github](https://github.com/vcborn/sharoho-bot)",
          color: 0x466387,
        },
      ],
    })
  }
  // ユーザー認証を追加（message.author.idは管理者のユーザーID）
  if (message.content === prefix + "res" && message.author.id === "368027170003484673") {
    sendResult()
  }
})

client.login(process.env.TOKEN)
