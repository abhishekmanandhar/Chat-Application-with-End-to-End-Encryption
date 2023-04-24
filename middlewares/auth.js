//next() function is use the transfer the control from one piece of middleware to the next. Otherwise the control might get stuck in the current middleware.

const isLogin = async(req, res, next)=>{
    try{
        if(req.session.user){

        } else{
            res.redirect('/')
        }
        next()
    } catch(error){
        console.log(error.message)
    }
}

const isLogout = async(req, res, next)=>{
    try{
        if(req.session.user){
            res.redirect('/dashboard')
        }
        next()
    } catch(error){
        console.log(error.message)
    }
}

module.exports = {
    isLogin,
    isLogout
}