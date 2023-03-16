import { DataTypes, Model } from "sequelize"
import { sequelize } from "."

interface UsersAttributes {
  id: string;
  name: string;
  win: number;
  part: number;
  rating: number;
  best: string;
  last: Date;
};

interface UsersInstance
  extends Model<UsersAttributes>,
  UsersAttributes {
  createdAt?: Date;
  updatedAt?: Date;
}

const Users = sequelize.define<UsersInstance>("users", {
  // ID（ユニークID）
  id: {
    type: DataTypes.STRING,
    unique: true,
    primaryKey: true,
  },
  // 名前
  name: DataTypes.STRING,
  // 優勝回数
  win: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // 参加回数
  part: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // 現在のレート（数値）
  rating: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  // 最高記録（hh:mm:ss.ms）
  best: DataTypes.STRING,
  // 最終参加（YYYY/MM/DD hh:mm:ss.ms）
  last: DataTypes.DATE,
})

export default Users
