import mongoose from 'mongoose';
const { Schema } = mongoose;

const chatSchema = new Schema({
    emailto: {
        type: String,
        required: true,
        unique: true
    },
    message:{
        type:String,
        required:true,
    },
    
    emailfrom: {
        type: String,
        required: true,
        unique: true
    },
    timestamp:{
        type: Date, 
        required:true,
        default: Date.now
    }
    
});

// Export the User model
module.exports = mongoose.model('Chat', chatSchema);