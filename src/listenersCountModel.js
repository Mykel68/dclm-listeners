const mongoose = require('mongoose');

const listenersCountSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    count: { type: Number, required: true },
    event: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const ListenersCount = mongoose.model('ListenersCount', listenersCountSchema);

module.exports = ListenersCount;
