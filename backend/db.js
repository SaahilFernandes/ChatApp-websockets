import mongoose from 'mongoose';

const mongoURI = "mongodb+srv://saahilfernandes222:saahil!123@cluster0.stjoubr.mongodb.net/";

const connectToMongo = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected successfully");
    } catch (error) {
        console.error("Connection failed:", error);
    }
};

export default connectToMongo;