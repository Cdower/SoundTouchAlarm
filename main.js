var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var ssdp = require('node-ssdp-lite')
  , client = new ssdp();

client.on('notify', function () {
      console.log('Got a notification.');
    });

client.on('response', function inResponse(msg, rinfo) {
  console.log('Got a response to an m-search.');
  console.log(rinfo);
  if(rinfo !== global.speaker){
      global.speaker=rinfo;
      io.emit('new speaker', {for: 'everyone'});
  }
});

client.search('urn:schemas-upnp-org:device:MediaRenderer:1');

app.get('/', function (req, res) {
  res.sendFile( __dirname + '/index.html');
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

//app.listen(3000);
http.listen(3000);
