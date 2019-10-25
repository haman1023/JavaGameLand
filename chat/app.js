var express = require('express'), routes = require('./routes'), user = require('./routes/user'), http = require('http'), path = require('path'), socket = require('socket.io');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
	app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});
var io = socket.listen(server);

//	접속 유저 배열???
var usernames = [];
//	익명유저
var unknownUser = 0;

io.sockets.on('connection', function (socket) {
	socket.on('sendmsg', function (data) {
		io.sockets.in(socket.room).emit('recvmsg', socket.username, data);
	});

  // 아이디 중복 확인
  var confirmID = function (user) {
		if(!user){
			var name = '익명' + unknownUser;
			usernames[name] = true;
			unknownUser += 1;
			return name;
		}else if(usernames[user]){
			socket.emit('existID');
			var name = '익명' + unknownUser;
			usernames[name] = true;
			unknownUser += 1;
			return name;
		}else{
			usernames[user] = true;
			return user;
		}
  };

	socket.on('guestjoin', function(user, roomname){
		var username = confirmID(user);

		socket.username = username;
		socket.room = roomname;
		usernames[username] = username;
		socket.join(roomname);
		socket.emit('servernoti', 'green', 'you has connected J-Chat');

		var userlist = new Array();

		for (var name in usernames) {
			userlist.push(usernames[name]);
		}

		io.sockets.in(socket.room).emit('updateuser', userlist);

		socket.broadcast.to(roomname).emit('servernoti', 'green', username + ' has connected to ' + roomname);
		if (roomname!='lobby')
			socket.emit('updaterooms', rooms, roomname);
	});

	socket.on('disconnect', function(){
		delete usernames[socket.username];
		var userlist = new Array();
		for (var name in usernames) {
			userlist.push(usernames[name]);
		}
		io.sockets.emit('updateuser', userlist);
		socket.broadcast.emit('servernoti', 'red', socket.username + ' has disconnected');
		socket.leave(socket.room);
	});
});
