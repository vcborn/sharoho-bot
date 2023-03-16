import { DataTypes, Model } from "sequelize"
import { sequelize } from "."
import Users from "./users"

interface RecordsAttributes {
  id: string;
  userId: string;
  rate: number;
  date: Date
};

interface RecordsInstance
  extends Model<RecordsAttributes>,
  RecordsAttributes {
  createdAt?: Date;
  updatedAt?: Date;
}

const Records = sequelize.define<RecordsInstance>("records", {
  // ID（ユニークID）
  id: {
    type: DataTypes.STRING,
    unique: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
  },
  rate: DataTypes.INTEGER,
  date: DataTypes.DATE,
})

Records.belongsTo(Users)
Users.hasMany(Records, { foreignKey: "userId" })

export default Records
