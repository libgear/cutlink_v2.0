const express = require("express")
const bodyParser = require("body-parser")
const request = require('request')


const app = express()
const urlencodedParser = bodyParser.urlencoded({extended: true})

app.engine('ejs', require('ejs-locals'))
app.set('views', __dirname + '/templates')
app.set('view engine', 'ejs')

const WebApi_history = 'https://discordapp.com/api/webhooks/[webhook id]'

const WebApi_redirect = "https://discordapp.com/api/webhooks/[webhook id]"


var ArrayMsg = []
var ArrayRedMsg = []
const addMsgToqeue = (msg)=>{
    ArrayMsg.push(msg)
}
const addredMsgToqeue = (msg)=>{
    ArrayRedMsg.push(msg)
}
//📕 📗 📘 📙 📒
const sendMessages = ()=>{
    let msg = ArrayMsg.shift()
    if(msg != undefined){
        let Count = ArrayMsg.length
        request.post({
         url: WebApi_history,
         form: {
            "username": "CutLink v2.0",
            "avatar_url": "http://cut.libgear.ru/favicon.ico",
            "content": msg+( Count>0 ? ` [${Count}]`:"") || "suka",
         }
        },(err, response, body) => {
            if(err){
                addMsgToqeue("📕Серверная ошибка📕: "+err) 
                console.log("failed post",err)
            }
        });
    }
    
    let msg1 = ArrayRedMsg.shift()
    if(msg1 != undefined){
        let Count = ArrayRedMsg.length
        request.post({
         url: WebApi_redirect,
         form: {
            "username": "CutLink v2.0",
            "avatar_url": "http://cut.libgear.ru/favicon.ico",
            "content": msg1+( Count>0 ? ` [${Count}]`:"") || "suka",
         }
        },(err, response, body) => {
            if(err){
                addredMsgToqeue("📕Серверная ошибка📕: "+err) 
                console.log("failed post",err)
            }
        });
    }
    
}
setInterval(sendMessages,4000)


const delayCreateShort = 3          // 1 = 100милисек , 10 = 1сек

var data = {
    users: {},
    banList: {},
    urls: {}
}
const GetIp = (req) => { 
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip.substr(0, 7) == "::ffff:") {
        ip = ip.substr(7)
    }
    return ip
}

const ipauth = (_ip) => {           //Создание объекта пользователя при входе на сайт
    data.users[_ip] = {
        ip: _ip,
        urls: {},
        delayCreateShort: delayCreateShort,
        canCreate: true
    }
}

setInterval(() => {                  // Проверка ссылок на время удаления
    for(key in data.urls)
    {
        data.urls[key].liveTime -= 1
        if(data.urls[key].liveTime < 1)
        {
            let _ip = data.urls[key].user
            let dis = data.urls[key].disposable 
            delete data.users[data.urls[key].user].urls[key]
            delete data.urls[key]
            addMsgToqeue(`🟥 Удалена ссылка: **http://cut.libgear.ru/${key}/** ${dis ? "Одноразовая" : ""} ||${_ip}||`)
        }
    }
},1000)

setInterval(() => {                   // Кулдаун юзера на создание ссылки
    for(key in data.users)
    {
        if(!data.users[key].canCreate){
            data.users[key].delayCreateShort -= 1
            if(data.users[key].delayCreateShort < 1)
            {
                data.users[key].delayCreateShort = delayCreateShort
                data.users[key].canCreate = true
            }
        }
    }
},100)

const randomString = (i) => {      
    var rnd = ''
    while (rnd.length < i) 
        rnd += Math.random().toString(36).substring(2)
    return rnd.substring(0, i)
}

const createShort = (req, res, url, disposable = false,api = false) => { 
    var time = new Date();
    var _ip = GetIp(req);
    var key = randomString(5)
    data.users[_ip].urls[key] = { originalURL: url, shortURL: key }
    data.urls[key] = { user:_ip, originalURL: url, shortURL: key, enterCount: 0, disposable: disposable, liveTime: 120, }
    addMsgToqeue(`🟩${api ? "***API***" : ""} Создана ссылка: **http://cut.libgear.ru/${key}/** ${disposable ? "Одноразовая " : ""}${url} ||${_ip}||`)
    return key
}

const renderPage = (req, res) => {
    var _ip = GetIp(req);
    if(data.users[_ip] == undefined){
        ipauth(_ip)
    }
    
    if(req.body.url != undefined){
        if(data.users[_ip].canCreate){
            var key = createShort(req, res, req.body.url, req.body.oneway == 'on');
            setTimeout(()=>{data.users[GetIp(req)].canCreate = false},10)
        }
    }
    res.render("main", {
        title: "CutLink v2.0",
        urlInput: req.body.url,
        canCreate: data.users[_ip].canCreate,
        urlOutput: key,
    })
    
}


const formaturlParams = ( array )=>{
    let Link = array.url
    delete array.url
    for(var k in array){
        Link = Link +`&${k}=${array[k]}`
    }
    return Link
}



app.get("/:key", urlencodedParser, function(req, res){
    if(req.params.key != "favicon.ico")
    {
        if(req.params.key != "api")
            if(data.urls[req.params.key] != undefined){    // Редирект по шорту
                let _ip = GetIp(req)
                let Link = data.urls[req.params.key].originalURL
                data.urls[req.params.key].enterCount++
                addredMsgToqeue(`🟨||${_ip}|| http://cut.libgear.ru/${req.params.key}`)
                res.redirect(Link)
                if(data.urls[req.params.key].disposable){
                    delete data.urls[req.params.key]                         
                }
            }
            else{
                res.send("400 Ссылка не действительна")
            }
        else {                                                      // Обработка API
            if(req.query.url != undefined){
                var _ip = GetIp(req);
                if(data.users[_ip] == undefined){
                    ipauth(_ip)
                }
                if(data.users[_ip].canCreate){
                    let Link = formaturlParams(req.query)
                    setTimeout(()=>{data.users[GetIp(req)].canCreate = false},10)
                    res.send("http://cut.libgear.ru/"+createShort(req, res, Link, req.query.dis,true))

                }
                else{
                    res.send("400 Ты слишком часто пытаешься")
                }
                
            }
            else{
                res.send("400 Не указанна ссылка")
            }
        }
    }
    else{
        res.sendFile(__dirname+"/public/favicon.png")  // иконка сайта
    }
})
app.all("/", urlencodedParser, function(req, res){renderPage(req, res)}) // Главная страница
app.listen(process.env.APP_PORT, process.env.APP_IP)
console.log("Started")
