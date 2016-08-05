var express = require('express');
var app = express();
var http = require('http');
var mdns = require('mdns-js')
var httpServer = http.createServer(app);
var io = require('socket.io')(httpServer);
var parseString = require('xml2js').parseString;
var browser = mdns.createBrowser();
var ssdp = require('node-ssdp-lite')
  , client = new ssdp();

///TODO: store each device in a data base so that the user doesn't have to wait to populate list
///TODO: use MDNS and SSDP
///TODO: Send get request to /info of device when it is found before sending it to the user

client.on('notify', function () {
      console.log('Got a notification.');
  });

//***********************************************
//****************MDNS Block*********************
browser.on('ready', function () {
    browser.discover();
});

browser.on('update', function (data) {
    console.log('data:', data);
});
//***********************************************
var emitSpeakerInfo = function(address){
  var options = {
    host: address,
    port: 8090,
    path: '/info'
  };
  http.get(options, function(res) {
    res.on('data', function (chunk) {
      parseString(chunk, function(err, result){
        //console.log('BODY: ' + result);
        io.emit('new speaker', JSON.stringify(result)); ///TODO: Store in DB
      });
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
}

client.on('response', function inResponse(msg, rinfo) {
  console.log('Got a response to an m-search.');
  console.log(rinfo);
  if(rinfo !== global.speaker){
    global.speaker=rinfo;
    emitSpeakerInfo(rinfo.address);
  }
});

client.search('urn:schemas-upnp-org:device:MediaRenderer:1');

app.use('/static', express.static(__dirname+'/public/'));
app.get('/', function (req, res) {
  res.sendFile( __dirname + '/index.html');
});

app.post('/alarmSet', function(req, res){
  console.log('Recieved: ' + req);
});

///InfoRequest may be depreciated
/*
app.get('/infoRequest', function(req, res) {
  res.sendFile(__dirname + '/index.html');
  console.log('info requested');
  var options = {
    host: '192.168.0.6',
    port: 8090,
    path: '/info'
  };
  http.get(options, function(res) {
    console.log(res);
    res.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
    });
    }).on('error', function(e) {
      console.log("Got error: " + e.message);
  });
});*/

io.on('connection', function(socket){
  console.log('a user connected, searching');
  client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
  if(global.speaker){
    emitSpeakerInfo(global.speaker.address);
    //io.emit('new speaker', global.speaker);
  }

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

//app.listen(3000);
httpServer.listen(3000);
