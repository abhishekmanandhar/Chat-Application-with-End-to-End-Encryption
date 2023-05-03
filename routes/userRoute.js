const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const multer = require('multer')
const userController = require('../controllers/userController')
const session = require('express-session')
const auth = require('../middlewares/auth')

//setup express app for userRoute file
const user_route = express();

const {SESSION_SECRET} = process.env
user_route.use(session({secret: SESSION_SECRET}))

user_route.use(bodyParser.json());

//excepting the form data i.e when we submit the login form or register form
user_route.use(bodyParser.urlencoded({extended: true}))

//register view engine
user_route.set('view engine', 'ejs')
//automatically express and ejs will look for different views in the views folder by default. So the code below is not necessary.
user_route.set('views', './views') 

//setting up our static files. In this case, the public folder
user_route.use(express.static('public'))

const storage = multer.diskStorage({
    destination:function(req, file, cb){
        cb(null, path.join(__dirname, '../public/images'))
    },
    filename: function(req, file, cb){
        const name = Date.now() + '-' + file.originalname 
        cb(null, name)
    }
})

const upload = multer({ storage: storage})

//route handlers
user_route.get('/register', auth.isLogout, userController.registerLoad)
user_route.post('/register', upload.single('image'), userController.register)
user_route.get('/', auth.isLogout, userController.loadLogin)
user_route.post('/', userController.login)
user_route.get('/logout', auth.isLogin, userController.logout)
user_route.get('/dashboard', auth.isLogin, userController.loadDashboard)
user_route.post('/save-chat', userController.saveChat)
user_route.post('/delete-chat', userController.deleteChat)

user_route.get('*', function(req, res){
    return res.redirect('/')
})

module.exports = user_route