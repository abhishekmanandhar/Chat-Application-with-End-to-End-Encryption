//importing the User model
const User = require('../models/userModel')
const Chat = require('../models/chatModel')

const bcrypt = require('bcrypt')

const registerLoad = async(req, res) => {
    try{
        //render function is used to render the different views of the views folder by the help of ejs (a view engine)
        return res.render('register', {title: 'Register'})
    } catch (error){
        console.log(error.message)
    }
}

const register = async(req, res) => {
    try{
        //extracting the inputed email from the register form
        const email = req.body.email

        //findOne() method is used to finds and returns one document from the database that matches the given selection criteria
        const userData = await User.findOne({email: email})

        if(userData){
            return res.render('register', {title: 'Register', message: `There is already an user with email: ${email}`})
        } else{
            //encrypting the password by using the module bcrypt to generate password hash.
            const passwordHash = await bcrypt.hash(req.body.password, 10)
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                image: 'images/' + req.file.filename,
                password: passwordHash
            })
    
            await user.save();
    
            return res.render('register', {title: 'Register', message: 'Your registration was successful'})
        }
    } catch (error){
        console.log(error.message)
    }
}

const loadLogin = async(req, res) => {
    try{
        return res.render('login', {title: 'Login'})
    } catch(error){
        console.log(error.message)
    }
}

const login = async(req, res) => {
    try{
        const email = req.body.email
        const password = req.body.password

        const userData = await User.findOne({email: email})
        if(userData){
            const passwordMatch = await bcrypt.compare(password, userData.password)
            if(passwordMatch)
            {
                req.session.user = userData
                return res.redirect('/dashboard')
            }else{
                return res.render('login', {title: 'Login', message: 'Email or Password in Incorrect!'})
            }
        }else{
            return res.render('login', {title: 'Login', message: 'Email or Password in Incorrect!'})
        }
    } catch(error){
        console.log(error.message)
    }
}

const logout = async(req, res) => {
    try{
        req.session.destroy()
        return res.redirect('/')
    } catch(error){
        console.log(error.message)
    }
}

const loadDashboard = async(req, res) => {
    try{
        //fetching the data of the users from the database which is not the current user.
        var users = await User.find({_id: {$nin:[req.session.user._id]}})

        //here when rendering the dashboard view, we are sending an object as a parameter with keys title, user(current user) and users(total users connected to the chat).
        return res.render('dashboard', {title: 'Dashboard', user: req.session.user, users: users})
    } catch(error){
        console.log(error.message)
    }
}

const saveChat = async(req, res) => {
    try{

        var chat = new Chat({
            sender_id: req.body.sender_id,
            receiver_id: req.body.receiver_id,
            message: req.body.message
        })

        var newChat = await chat.save()

        return res.status(200).send({success: true, msg: 'Chat inserted', data: newChat})

    } catch(error){
        return res.status(400).send({success: false, msg: error.message})
    }
}

const deleteChat = async(req, res) => {
    try{
        await Chat.deleteOne({_id: req.body.id});
        return res.status(200).send({success: true})
    } catch(error){
        return res.status(400).send({success: false, msg: error.message})
    }    
} 

module.exports = {
    registerLoad,
    register,
    loadLogin,
    login,
    logout,
    loadDashboard,
    saveChat,
    deleteChat
}