# しゃろほー bot

しゃろほーであなたのDiscordサーバーのメンバーと競おう！

## データ構造

### プレイヤーデータ

| id     | name   | win | part | rating | record | best   | last   |
| ------ | ------ | --- | ---- | ------ | ------ | ------ | ------ |
| ユーザーID | ユーザー名 | 優勝回数 | 参加回数 | 現在のレート | 参加記録 | 最高記録（hh:mm:ss.fff） | 最終参加日時 |
| string | string | int | int  | int    | json   | string | string |

record内構造：

```json
[
    {
        "date": "日付（YYYY/MM/DD hh:mm:ss）",
        "rate": "レート"
    },
]
```

### サーバーデータ

| key     | guild   |
| ------ | ------ |
| `guild` | リザルト対応配列 |
| string | json |

guild内構造：

```json
[
    {
        "guild": "サーバーID",
        "channel": "チャンネルID"
    },
]
```

## レート計算

Diffは23:59の場合は60と現在秒の差、00:00の場合は現在秒を表します。

### 初回参加時

![first time](https://latex.codecogs.com/gif.latex?%5Cbg_white%20Rate%20%3D%20%5Cleft%20%7C%5Cfrac%7B6200%7D%7BDiff%20&plus;%202.1%7D%20%5Cright%7C)

### 2回目以降

![first time](https://latex.codecogs.com/gif.latex?%5Cbg_white%20Rate%20%3D%20%5Cleft%20%7C%5Cfrac%7B6000%7D%7BDiff%20&plus;%201.98%7D%20%5Cright%7C)
