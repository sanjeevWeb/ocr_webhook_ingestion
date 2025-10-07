import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_CONN_STRING);
        console.log("MongoDB Connected...");
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};
//# sourceMappingURL=database.js.map