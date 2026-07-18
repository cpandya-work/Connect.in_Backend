const mongoose = require('mongoose');

const cardClickSchema = new mongoose.Schema({
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user click is only tracked once per card to prevent duplicate count spamming by the same user if desired, or allow multiple.
// The user request says: "users who clicked along with the count for every offer on site. Option to download in csv... which will give the field name mobile and email id". 
// Tracking every click is good, but tracking unique users or just keeping logs of all clicks is best. Let's index for fast queries.
cardClickSchema.index({ cardId: 1 });
cardClickSchema.index({ userId: 1 });

module.exports = mongoose.model('CardClick', cardClickSchema);
