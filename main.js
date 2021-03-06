var express = require('express');
var app = express();
var http = require('http');
var mdns = require('mdns-js')
var httpServer = http.createServer(app);
var io = require('socket.io')(httpServer);
var parseString = require('xml2js').parseString;
var browser = mdns.createBrowser(mdns.tcp('soundtouch'));
var schedule = require('node-schedule');
var bodyParser = require('body-parser')
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
//require mongodb

///TODO: store each device in a data base so that the user doesn't have to wait to populate list
///TODO:, MDNS works so much better
///TODO: Send get request to /info of device when it is found before sending it to the user

//***********************************************
//****************MDNS Block*********************
browser.on('ready', function () {
  console.log("MDNS query started");
  browser.discover();
});

browser.on('update', function (data) {
    console.log('data:', data);
    console.log(data.type[0].name);
    //for(var prop in data.type){

      if(data.type[0].name === 'soundtouch'){
        //console.log("soundtouch");
        console.log(data.addresses[0]);
        if(global.address !== data.addresses[0]){
            global.address = data.addresses[0];
            emitSpeakerInfo(global.address);
        }
      }
    //}
});
//***********************************************
//************AJAX request to speaker************
var emitSpeakerInfo = function(address){
  var options = {
    host: address,
    port: 8090,
    path: '/info'
  };
  http.get(options, function(res) {
    res.on('data', function (chunk) {
      parseString(chunk, function(err, result){
        console.log("Emitting Speaker Info");
        io.emit('new speaker', JSON.stringify(result)); ///TODO: Store in DB
        options2= {
          host: address,
          port: 8090,
          path: '/presets'
        };
        http.get(options2, function(res) {
          res.on('data', function (chunk) {
            parseString(chunk, function(err, result){
              console.log("Emitting Presets");
              result.address = address;
              io.emit('presets', JSON.stringify(result)); ///TODO: Store in DB
            });
          });
        }).on('error', function(e) {
          console.log("Got error: " + e.message);
        });
      });
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });

}

function setVolume(address, level) {//TODO: call this function asynchronously, increeasing volume every x seconds until level reaches 100 or another set amount
  var xmlData = "<volume> "+level+" </volume>";
  //console.log(xmlData);
  var options = {
    host: address,
    port: 8090,
    path: '/volume',
    method:'POST',
    headers:{ 'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(xmlData)
    }
  };

  var req = http.request(options, function(res){
    res.on('data', function(chunk){
      console.log("Volume Res: "+chunk);
    })
  }).on('error', function(e){
    console.log("Got error: " + e.message);
  });
  req.write(xmlData);
  req.end('xmlbody');
}

function setAlarm(body){///setup node schedule to call runAlarm
  body.time=body.time.split(':');
  var s = schedule.scheduleJob(body.time[1] + ' ' + body.time[0] + ' * * ' + body.daysSet, function(){
    setVolume(body.addr, 15);
    runAlarm(body);
    setTimeout(function(){
      setVolume(body.addr, 20)
    }, 6000);
    setTimeout(function(){
      setVolume(body.addr, 25)
    }, 9000);
    setTimeout(function(){
      setVolume(body.addr, 30)
    }, 12000);
    setTimeout(function(){
      setVolume(body.addr, 35)
    }, 15000);
    setTimeout(function(){
      setVolume(body.addr, 40)
    }, 18000);
  })//min hour * * days_of_the_week
}

function runAlarm(body){///make series of AJAX calls to play music and set volume etc
  var xmlData = "<ContentItem source=" + body.source + " sourceAccount=" + body.sourceAccount + " location=" + body.location +"><itemName>"+body.itemName+"</itemName></ContentItem>";
  console.log(xmlData);
  var options = {
    host: body.addr,
    port: 8090,
    path: '/select',
    method: 'POST',
    headers: { 'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(xmlData)
    }
  };
  var req = http.request(options, function(res){
    res.on('data', function(chunk){
      console.log('Alarm Res: ' + chunk);
    })
  }).on('error', function(e){
    console.log("Got Error: " + e.message);
  });
  req.write(xmlData);
  req.end('xmlbody');
}

//*************************************************
//*****************SSPD Block**********************
/*
client.on('response', function inResponse(msg, rinfo) {
  console.log('Got a response to an m-search.');
  console.log(rinfo);
  if(rinfo.address !== global.address){
    global.address=rinfo.address;
    emitSpeakerInfo(rinfo.address);
  }
});*/

//client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
//console.log('SSDP query');

//*************************************************

app.use('/static', express.static(__dirname+'/bower_components'));

app.get('/', function (req, res) {
  res.sendFile( __dirname + '/index.html');
});

app.post('/alarmSet', function(req, res){
  console.log('Recieved:');
  console.log(req.body);
  setAlarm(req.body);
  res.send("Success!");
});

io.on('connection', function(socket){
  console.log('a user connected');
  if(global.address){
    emitSpeakerInfo(global.address);
    //io.emit('new speaker', global.speaker);
  }

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

//app.listen(3000);
httpServer.listen(3000);
