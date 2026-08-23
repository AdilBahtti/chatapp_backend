const {Schema, model} = require('mongoose');

const coversationSchema = new Schema({
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User',            
        
    
        required: true
    }],
    lastMessage: {
        type: String,
        default: ""
    }
}, {timestamps: true});

module.exports = model('Coversation', coversationSchema);