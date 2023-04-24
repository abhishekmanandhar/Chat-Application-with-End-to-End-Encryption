const mongoose = require('mongoose')

//Schemas defines the structure of a type of data/document i.e. properties and property types. Here, Schema can be defined using Schema() method

const userSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        image: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        is_online: {
            type: String,
            default: 0
        }
    },
    //timestamps construct will help to create the createdAt and updatedAt properties automatically.
    {timestamps: true}
)

//creating the model based on the Schema. Model is the thing that surrounds the Schema and provides with an interface by which we can communicate with a database collection. Here, Model can be defined by the model() method which takes two arguments i.e. 1. name of this model and 2. the Schema we want to base this model on.
module.exports = mongoose.model('User', userSchema);    