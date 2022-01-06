const express = require("express");
const app = express();
const https = require('https');
const path = require('path');
const fs = require('fs');
const homedir = require('os').homedir();
const options = {
  key: fs.readFileSync(path.join(homedir, '.keys', 'canary-webrtc-key.pem')),
  cert: fs.readFileSync(path.join(homedir, '.keys', 'canary-webrtc-cert.pem')),
};
const server = https.createServer(options, app);
const Turn = require('node-turn');

var turnServer = new Turn({
  // set options
  externalIps: '54.173.145.56'
});
turnServer.start();

const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
  ssl: options,
  port: 4000,
});

app.use("/peerjs", peerServer);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
  });
});

console.log(`server listening on ${process.env.PORT || 3030}`);
server.listen(process.env.PORT || 3030);
