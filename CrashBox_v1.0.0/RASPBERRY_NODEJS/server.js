/* ==== VARIABLES ET PARAMÈTRES PAR DEFAUT ==== */

var settings = require('./settings.json');

var detectionLimit = settings.detectionLimit, // Nombre de G à partir duquel on considère qu'un accident s'est produit
	timeOffset = settings.timeOffset, // Décalage horaire
	noAlarm = settings.noAlarm, // Variable pour rendre le boitier muet (en phase de tests)
	disableSecretCodes = settings.disableSecretCodes, // Variable pour desactiver les actions speciales au clavier
	historyFile = settings.historyFile // Fichier de log
	accidentDirectory = settings.accidentDirectory, // Emplacement des sauvegardes de log en cas d'accident
	serverPort = settings.serverPort; // Port du serveur web

// Les variables suivantes ne doivent pas être changées ici (elles évoluent au cours de la progression du programme)
var phoneNumber = ""; // Numero de telephone d'urgence
var accident = false; // Variable pour empêcher des actions en cas d'accident

/* ==== STATUT PARAMÈTRES ==== */
console.log('Detection limit : ' + detectionLimit + 'g'
	+ '\nTime offset : ' + timeOffset + 'h');
if(noAlarm)
	console.log('Alarm disabled');
if(disableSecretCodes)
	console.log('Secret codes disabled');

/* ==== LIBRAIRIES ==== */

const
	http = require('http'),
	path = require('path'),
	fs = require('fs'),
	SerialPort = require('serialport');
	exec = require('child_process').exec,
	ip = require('ip'),
	ADXL345 = require('adxl345-sensor'),
	Gpio = require('pigpio').Gpio;

/* ==== LOG BOOT ==== */
fs.appendFile(historyFile, 'BOOT\n', function(err){ if(err) console.log(err); });

/* ==== NUMERO DE TELEPHONE ==== */

if(fs.readFileSync('phoneNumber.txt', 'utf-8').length == 10 && fs.readFileSync('phoneNumber.txt', 'utf-8')[0] == '0'){
	phoneNumber = fs.readFileSync('phoneNumber.txt', 'utf-8');
	console.log('Phone number : ' + phoneNumber);
}
else
	console.log('Undefined phone number');

/* ==== BUZZER ===== */

var buzzer = new Gpio(18, {mode: Gpio.OUTPUT});

function bip(){
	buzzer.pwmWrite(255);
	setTimeout(function(){
		buzzer.pwmWrite(0);
	}, 60);
}

var alarmLoop;
function alarm(state){
	var dutyCycle = 0;
	if(typeof(state) == 'string'){
		if(state == 'on'){
			console.log('ALARM ON');
			alarmLoop = setInterval(function(){
				buzzer.pwmWrite(dutyCycle);
				if(dutyCycle == 0)
					dutyCycle = 255;
				else
					dutyCycle = 0;
			}, 60);
		}
		else {
			console.log('ALARM OFF');
			clearInterval(alarmLoop);
			buzzer.pwmWrite(0);
		}
	}
}

/* ==== SERVEUR WEB ==== */

/* Extensions de fichiers serveur et content-type associés */

extensions = {
	'.html' : 'text/html',
	'.css'  : 'text/css',
	'.js'   : 'application/javascript',
	'.txt'  : 'text/plain'
};

/* Récupération des fichiers */

function getFile(filePath,res,page404,mimeType){
	fs.exists(filePath,function(exists){
		if(exists){
			fs.readFile(filePath,function(err,contents){
				if(!err){
					res.writeHead(200,{
						'Content-type' : mimeType,
						'Content-Length' : contents.length
					});
					res.end(contents);
				}
				else {
					console.dir(err);
				};
			});
		} else {
			fs.readFile(page404,function(err,contents){
				if(!err){
					res.writeHead(404, {'Content-Type': 'text/html'});
					res.end(contents);
				}
				else {
					console.dir(err);
				};
			});
		};
	});
};

/* Restitution des pages */

function requestHandler(req, res){
	var
		fileName = path.basename(req.url) || 'index.html',
		ext = path.extname(fileName),
		localFolder = __dirname + '/public/',
		page404 = localFolder + '404.html';

	if(!extensions[ext]){
		res.writeHead(404, {'Content-Type': 'text/html'});
		res.end('&lt;html&gt;&lt;head&gt;&lt;/head&gt;&lt;body&gt;The requested file type is not supported&lt;/body&gt;&lt;/html&gt;');
	};
	getFile((localFolder + fileName),res,page404,extensions[ext]);
};

var myServer = http.createServer(requestHandler).listen(serverPort);

console.log('Node server is running on http://' + ip.address() + ':' + serverPort);

/* ==== SOCKET.IO ==== */

var io = require('socket.io').listen(myServer);
io.sockets.on('connection', function(socket){
	console.log('Detected client on server');
	io.emit('LCD', JSON.stringify(lcdScreen));
	io.emit('refreshLCD');
	io.emit('accelLimit', detectionLimit);
	io.emit('GSM', currentStatus);
	if(noAlarm)
		io.emit('noAlarm');
	if(phoneNumber.length == 10 && phoneNumber[0] == '0'){
		io.emit('phoneNumber', phoneNumber);
	}
	socket.on('LCD', function(lcd){
		if(!accident)
			LCD_updateScreenData(lcd);
	});
	socket.on('accelLimit', function(accelLimit){
		if(!accident){
			detectionLimit = accelLimit;
			console.log('New detection limit : ' + detectionLimit + 'g');
			LCD_set(detectionLimit + 'g', 'right', 1);
			io.emit('accelLimit', detectionLimit);
		}
	});
	socket.on('GSM', function(command){
		if(!accident){
			console.log('GSM Order received from client : ' + command);
			GSM_command(command);
		}
	});
	socket.on('accident', function(){
		if(!accident)
			accidentDetected();
	});
	socket.on('buzzer', function(state){
		if(!accident)
			alarm(state);
	});
});

/* ==== ACQUISITION GPS (USB) ==== */

/* Lecture port série */

var gpsPort = new SerialPort('/dev/ttyUSB0', {
	autoOpen: false,
	baudrate: 4800,
	parser: SerialPort.parsers.readline('\n')
});

gpsPort.open(function(err){
	if(err){
		console.log('Error opening port : ', err.message);
	}
	else {
  		console.log('GPS serial open');
	}
});

gpsPort.on('data', function(data){
	if(data.indexOf('$GPRMC') !== -1){
  		// console.log(data);
  		gps_decode(data);
	}
});

var firstTime = 1;

var time, timeH, timeM, timeS, fix_date, fix_dateD, status, latitude_dms, longitude_dms, latitude_dd, longitude_dd, speed, speedKmh, mapLink;

function gps_decode(frame){
	if(frame !== undefined && frame.indexOf('GPRMC') !== -1){
		io.emit('GPS', frame);
		frame = frame.split(',');
		time = frame[1][0] + frame[1][1] + ':' + frame[1][2] + frame[1][3] + ':' + frame[1][4] + frame[1][5];
		// console.log(time);
		fix_date = frame[9][0] + frame[9][1] + '/' + frame[9][2] + frame[9][3] + '/' + frame[9][4] + frame[9][5];
		if(frame[2] == 'A')
			status = 'OK';
		else
			status = 'Error';
		if(status == 'OK'){
			if(lcdScreen[0].left == 'GPS PERDU')
				LCD_clearLine(0, 'left');
			latitude_dms = frame[3][0] + frame[3][1] + '°' + frame[3][2] + frame[3][3] + '\'' + frame[3][5] + frame[3][6] + '.' + frame[3][7] + frame[3][8] + '\' ' + frame[4];
			longitude_dms = frame[5][1] + frame[5][2] + '°' + frame[5][3] + frame[5][4] + '\'' + frame[5][6] + frame[5][7] + '.' + frame[5][8] + frame[5][9] + '\' ' + frame[6];
			latitude_dd = ((frame[3].replace(frame[3][0] + frame[3][1], '')) / 60 + parseInt(frame[3][0] + frame[3][1])).toFixed(4);
			longitude_dd = ((frame[5].replace(frame[5][0] + frame[5][1] + frame[5][2], '')) / 60 + parseInt(frame[5][2])).toFixed(4);
			// console.log(latitude_dd + ' ' + longitude_dd);
			speed = frame[7]; // Knots
			speedKmh = (speed * 1.852).toFixed(2);
			mapLink = 'http://maps.google.com?q=' + latitude_dd + ',' + longitude_dd;
		}
		else {
			if(lcdScreen[0].left == '')
				LCD_set('GPS PERDU', 'left', 0);
		}
		if(time.indexOf("undefined") == -1){
			timeH = time.split(':')[0];
			timeM = time.split(':')[1];
			timeS = time.split(':')[2];
			fix_dateD = fix_date.split('/')[0];
			if(timeS == '00'){
				if(parseInt(timeH) + timeOffset == 24){
					LCD_set('00' + ':' + timeM, 'right', 0);
				}
				else
					LCD_set(((parseInt(timeH) + timeOffset) + ':' + timeM), 'right', 0);
			}
			if(firstTime){
				if(parseInt(timeH) + timeOffset == 24)
					LCD_set('00' + ':' + timeM, 'right', 0);
				else
					LCD_set(((parseInt(timeH) + timeOffset) + ':' + timeM), 'right', 0);
				firstTime = 0;
			}
			if((parseInt(timeH) + timeOffset) > 24){
				fix_date = fix_date.replace(fix_dateD, parseInt(fix_dateD) + 1);
				if(fix_dateD.length == 1)
					fix_date = fix_date.replace(fix_dateD, '0' + fix_dateD);
			}
		}
	}
}

/* ==== ACQUISITION ACCELEROMETRE ==== */

const options = {
	i2cBusNo: 1,
	i2cAddress: ADXL345.I2C_ADDRESS_ALT_GROUNDED()
};
const adxl345 = new ADXL345(options);
const getAcceleration = () => {
	adxl345.getAcceleration(true)
		.then((acceleration) => {
			// console.log(`acceleration = ${JSON.stringify(acceleration, null, 2)}`);
			io.emit('ACCEL', JSON.stringify(acceleration, null, 2));
			processAccelData(JSON.stringify(acceleration, null, 2));
			setTimeout(getAcceleration, 100);
		})
		.catch((err) => {
			console.log(`ADXL345 read error : ${err}`);
			if({err}.err.errno == 5 && {err}.err.code == 'EIO')
				io.emit('ACCEL', 'ioerror');
			setTimeout(getAcceleration, 2000);
		});
};
adxl345.init()
	.then(() => adxl345.setMeasurementRange(ADXL345.RANGE_8_G()))
	.then(() => adxl345.setDataRate(ADXL345.DATARATE_100_HZ()))
	.then(() => adxl345.setOffsetX(0))
	.then(() => adxl345.setOffsetY(0))
	.then(() => adxl345.setOffsetZ(0))
	.then(() => adxl345.getMeasurementRange())
	.then((range) => {
		return adxl345.getDataRate();
	})
	.then((rate) => {
		return adxl345.getOffsets();
	})
	.then((offsets) => {
		getAcceleration();
	})
	.catch((err) => {
		console.error(`ADXL345 initialization failed : ${err} `);
		if({err}.err.errno == 5 && {err}.err.code == 'EIO')
			io.emit('ACCEL', 'ioerror');
	})

/* ==== DÉTECTION D'ACCIDENT ==== */

var accel_x;
var accel_y;
var accel_z;

function processAccelData(data){
	data = JSON.parse(data);
	accel_x = data.x.toFixed(3);
	accel_y = data.y.toFixed(3);
	accel_z = data.z.toFixed(3);
	if(data.x >= detectionLimit || data.x <= -Math.abs(detectionLimit)){
		accidentDetected();
	}
	if(data.y >= detectionLimit || data.y <= -Math.abs(detectionLimit)){
		accidentDetected();
	}
	if(data.z >= detectionLimit || data.z <= -Math.abs(detectionLimit)){
		accidentDetected();
	}
}

/* ==== DETECTION DES CARTES ARDUINO === */

var port1_device = '';

var port1 = new SerialPort('/dev/ttyACM0', {
	autoOpen: false,
	baudrate: 9600,
	parser: SerialPort.parsers.readline('\n')
});

port1.open(function(err){
	if(err){
		if(err.message.toLowerCase().indexOf('no such file or directory') !== -1)
			console.log('Nothing detected on ttyACM0')
		else
			console.log('Error opening ttyACM0 : ', err.message);
	}
	else
		console.log('Serial ttyACM0 open');
});

port1.on('data', function(data){
	data = data.substr(0, data.length - 1);
	if(data == 'i'){
		console.log('GSM detected on ttyACM0');
		port1_device = 'gsm';
		gsm(data);
		gsmPort = port1;
	}
	else if(data == 'hello'){
		console.log('NumKey detected on ttyACM0');
		port1_device = 'numkey';
		numkey(data);
	}
	else if(port1_device == 'gsm'){
		gsm(data);
		gsmPort = port1;
	}
	else if(port1_device == 'numkey')
		numkey(data);
});

var port2_device = '';

var port2 = new SerialPort('/dev/ttyACM1', {
	autoOpen: false,
	baudrate: 9600,
	parser: SerialPort.parsers.readline('\n')
});

port2.open(function(err){
	if(err){
		if(err.message.toLowerCase().indexOf('no such file or directory') !== -1)
			console.log('Nothing detected on ttyACM1')
		else
			console.log('Error opening ttyACM1 : ', err.message);
	}
	else
		console.log('Serial ttyACM1 open');
});

port2.on('data', function(data){
	data = data.substr(0, data.length - 1);
	if(data == 'i'){
		console.log('GSM detected on ttyACM1');
		port2_device = 'gsm';
		gsm(data);
		gsmPort = port2;
	}
	else if(data == 'hello'){
		console.log('NumKey detected on ttyACM1');
		port2_device = 'numkey';
		numkey(data);
	}
	else if(port2_device == 'gsm'){
		gsm(data);
		gsmPort = port2;
	}
	else if(port2_device == 'numkey')
		numkey(data);
});

/* ==== COMMUNICATION GSM (ARDUINO + SHIELD) ==== */

var currentStatus = '';

function gsm(data){
	currentStatus = data;
	io.emit('GSM', data);
	if(data == 'i')
		console.log('GSM Initializing...');
	if(data == 'c')
		console.log('GSM Connected');
	if(data == 'nc')
		console.log('GSM Connection Error');
	if(data == 'r'){
		console.log('GSM Ready');
		LCD_clearLine(3);
		bip();
	}
	if(data == 'rc'){
		console.log('GSM Receiving call');
		LCD_set('APPEL ENTRANT', 'center', 3);
		fs.appendFile(historyFile, 'INCOMING CALL\n', function(err){ if(err) console.log(err); });
	}
	if(data.startsWith('rn')){
		console.log('GSM Remote Number : ' + data.split(':')[1]);
		fs.appendFile(historyFile, 'REMOTE NUMBER ' + data.split(':')[1] + ' \n', function(err){ if(err) console.log(err); });
	}
	if(data == 't'){
		console.log('GSM Talking');
		if(lcdScreen[3].center !== 'EN COMMUNICATION')
			LCD_set('EN COMMUNICATION', 'center', 3);
	}
	if(data.startsWith('ct')){
		console.log('GSM Calling ' + data.split(':')[1]);
		fs.appendFile(historyFile, 'CALLING ' + data.split(':')[1] + ' \n', function(err){ if(err) console.log(err); });
		LCD_set('APPEL EN COURS', 'center', 3);
	}
	if(data.startsWith('s')){
		console.log('GSM Sending SMS to ' + data.split(':')[1]);
		fs.appendFile(historyFile, 'SENDING SMS ' + data.split(':')[1] + ' \n', function(err){ if(err) console.log(err); });
		LCD_set('ENVOI SMS', 'center', 3);
	}
	if(data.startsWith('sms')){
		console.log('GSM SMS Content : ' + data.split(':')[1]);
		fs.appendFile(historyFile, 'SMS ' + data.split(':')[1] + ' \n', function(err){ if(err) console.log(err); });
	}
}

function GSM_sendSMS(remoteNumber, msg){
	if(remoteNumber !== undefined && remoteNumber.length == 10 && remoteNumber[0] == '0' && msg !== undefined){
		gsmPort.write('sms ' + remoteNumber + ' ' + msg + '\n');
		console.log('SMS Order sent');
		fs.appendFile(historyFile, 'SMS ' + remoteNumber + ' ' + msg + '\n', function(err){ if(err) console.log(err); });
	}
	else
		console.log('[!] ERROR : Bad phone number');
}

function GSM_call(remoteNumber){
	if(remoteNumber !== undefined && remoteNumber.length == 10 && remoteNumber[0] == '0'){
		gsmPort.write('call ' + remoteNumber + '\n');
		console.log('Call Order sent');
		fs.appendFile(historyFile, 'CALL ' + remoteNumber + ' \n', function(err){ if(err) console.log(err); });
	}
	else
		console.log('[!] ERROR : Bad phone number');
}

function GSM_hangUp(){
	gsmPort.write('e\n');
	console.log('Call ended');
	fs.appendFile(historyFile, 'CALL END\n', function(err){ if(err) console.log(err); });
}

function GSM_command(command){
	if(command.startsWith('sms'))
		GSM_sendSMS(command.split(' ')[1], command.substr(15));
	if(command.startsWith('call'))
		GSM_call(command.split(' ')[1]);
	if(command == 'hangUp')
		GSM_hangUp();
}

/* ==== AFFICHAGE LCD ==== */

var lcdScreen = {
    '0': {
        'left': '',
        'center': '',
        'right': ''
    },
    '1': {
        'left': '',
        'center': 'CRASH',
        'right': (detectionLimit + 'g')
    },
    '2': {
        'left': '',
        'center': 'BOX',
        'right': ''
    },
    '3': {
        'left': '',
        'center': '',
        'right': ''
    }
}

var lcdPort = new SerialPort('/dev/ttyAMA0', {
	autoOpen: false,
	baudrate: 19200
});

lcdPort.open(function(err){
	if(err)
		console.log('Error opening LCD Port : ', err.message);
	else
		console.log('LCD Port open');
});

lcdPort.on('open', function(){
	LCD_init();
});

function sW(text){
	lcdPort.write(text, function(err){
		if(err){
			console.log('Error on write : ', err.message);
		}
		// else
			// console.log('message \"' + text + '\" written');
	});
}

function sWH(text){
	lcdPort.write([text], function(err){
		if(err){
			console.log('Error on write : ', err.message);
		}
		// else
			// console.log('message \"' + text + '\" written');
	});
}

function LCD_init(){
	sWH('0xA0');
	console.log('LCD Initialized');
}

function LCD_clear(){
	sWH('0xA3');
	sWH('0x01')
	// console.log('LCD cleared');
}

function LCD_c(a, b){
	if(b == undefined){
		if(a == 'on'){
			sWH('0xA3');
			sWH('0x0E');
			// console.log('LCD cursor enabled');
		}
		if(a == 'off'){
			sWH('0xA3');
			sWH('0x0C')
			// console.log('LCD cursor disabled');
		}
	}
	else if(a !== undefined && b !== undefined){
		sWH('0xA1');
		sWH(parseInt(a));
		sWH(parseInt(b));
		// console.log('LCD cursor position : ' + parseInt(a) + ' ' + parseInt(b));
	}
}

function LCD_w(text){
	if(text.length > 0){
		sWH('0xA2');
		sW(text);
		sWH('0x00');
		// console.log('Message displayed : ' + text);
	}
}

function LCD_wP(text, x, y){
	if(text !== undefined && text.length > 0 && x !== undefined && y !== undefined){
		LCD_c(x, y);
		LCD_w(text);
	}
}

function LCD_wA(text, position, line){
	if(text !== undefined && text.length > 0 && position !== undefined){
		if(typeof(position) == 'string' && line !== undefined){
			switch(position){
				case 'left':
					LCD_wP(text, 0, line);
					break;
				case 'right':
					LCD_wP(text, (20 - text.length), line);
					break;
				case 'center':
					LCD_wP(text, ((20 - text.length)/2), line);
					break;
			}
		}
		else if(typeof(position) == 'number'){
			LCD_wP(text, position, line);
		}
	}
}

function LCD_set(text, position, line){
	if(text !== undefined && position !== undefined && line !== undefined){
		lcdScreen[line][position] = text;
		LCD_updateScreen();
	}
}

function LCD_updateScreenData(newScreen){
	if(newScreen !== undefined){
		newScreen = JSON.parse(newScreen);
		for(var i = 0; i <= 3; i++){
			lcdScreen[i].left = newScreen[i].left;
			lcdScreen[i].center = newScreen[i].center;
			lcdScreen[i].right = newScreen[i].right;
		}
		LCD_updateScreen();
	}
}

function LCD_updateScreen(){
	LCD_clear();
	for(var i = 0; i <= 3; i++){
		LCD_wA(lcdScreen[i].left, 'left', i);
		LCD_wA(lcdScreen[i].center, 'center', i);
		LCD_wA(lcdScreen[i].right, 'right', i);
	}
	LCD_c('off');
	io.emit('LCD', JSON.stringify(lcdScreen));
	io.emit('refreshLCD', 'now');
}

function LCD_clearLine(line, position){
	if(position !== undefined)
		LCD_set('', position, line);
	else {
		LCD_set('', 'left', line);
		LCD_set('', 'center', line);
		LCD_set('', 'right', line);
	}
}

/* ==== CLAVIER NUMERIQUE ==== */

var secretCodes = [
	'1397',	// Arrêt système
	'2684',	// Redémarrage système
	'0550',	// Arrêt buzzer
	'5005'	// Afficher adresse IP
];

function numkey(data){
	// console.log(data);
	if(data[0] !== '#' && data !== 'hello'){
		LCD_set(data, 'center', 3);
		phoneNumber = data;
		io.emit('phoneNumber', phoneNumber);
	}
	else if(data[0] == '#'){
		if(phoneNumber.length == 10 && phoneNumber[0] == '0'){
			fs.writeFile('phoneNumber.txt', phoneNumber, function(err){ if(err) console.log(err); });
			LCD_set('NUMERO ENREGISTRE', 'center', 3);
			console.log('New phone number : ' + phoneNumber);
			setTimeout(function(){
				LCD_clearLine(3);
			}, 3000);
		}
		else {
			if(phoneNumber == secretCodes[0] || phoneNumber.substr(10) == secretCodes[0]){
				if(!disableSecretCodes)
					shutdown();
				else {
					LCD_set('COMMANDE DESACTIVEE', 'center', 3);
					setTimeout(function(){
						LCD_clearLine(3);
					}, 2000);
				}
			}
			else if(phoneNumber == secretCodes[1] || phoneNumber.substr(10) == secretCodes[1]){
				if(!disableSecretCodes)
					reboot();
				else {
					LCD_set('COMMANDE DESACTIVEE', 'center', 3);
					setTimeout(function(){
						LCD_clearLine(3);
					}, 2000);
				}
			}
			else if(phoneNumber == secretCodes[2] || phoneNumber.substr(10) == secretCodes[2]){
				if(!disableSecretCodes){
					alarm('off');
					console.log('ALARM OVERRIDE OFF');
				}
				else {
					LCD_set('COMMANDE DESACTIVEE', 'center', 3);
					setTimeout(function(){
						LCD_clearLine(3);
					}, 2000);
				}
			}
			else if(phoneNumber == secretCodes[3] || phoneNumber.substr(10) == secretCodes[3]){
				if(!disableSecretCodes)
					LCD_set(ip.address(), 'center', 3);
				else {
					LCD_set('COMMANDE DESACTIVEE', 'center', 3);
				}
				setTimeout(function(){
					LCD_clearLine(3);
				}, 2000);
			}
			else {
				if(fs.readFileSync('phoneNumber.txt', 'utf-8').length == 10 && fs.readFileSync('phoneNumber.txt', 'utf-8')[0] == '0'){
					phoneNumber = fs.readFileSync('phoneNumber.txt', 'utf-8');
				}
				LCD_set('NUMERO INVALIDE', 'center', 3);
				setTimeout(function(){
					LCD_set('TAPEZ.', 'center', 3);
				}, 5000);
			}
		}
	}
	else if(data == 'hello'){
		if(fs.readFileSync('phoneNumber.txt', 'utf-8').length == 10 && fs.readFileSync('phoneNumber.txt', 'utf-8')[0] == '0'){
			phoneNumber = fs.readFileSync('phoneNumber.txt', 'utf-8');
		}
		else
			LCD_set('TAPEZ.', 'center', 3);
	}
}

/* ==== CONSERVATION DES DONNEES ===== */

// Conservation des valeurs de vitesse, de position et d'acceleration des 2 dernières minutes relevees chaque seconde

function backup(){
	exec('wc -l ' + historyFile, (error, stdout, stderr) => {
		var numberOfLines = parseInt(stdout);
		if(numberOfLines > 120){
			var fileUpdate = fs.readFileSync(historyFile, 'utf-8').split('\n').slice(numberOfLines - 120).join('\n');
			fs.writeFile(historyFile, fileUpdate, function(err){ if(err) console.log(err); });
		}
		var logData;
		if(status !== undefined && status !== 'Error'){
			logData = fix_date + ' ' + time.replace(timeH, parseInt(timeH) + timeOffset) + ' | ' + 'GPS ' + status + ' | ' + latitude_dd + ' | ' + longitude_dd + ' | ' + speedKmh + ' km/h | ' + mapLink + ' | ' + accel_x + ' | ' + accel_y + ' | ' + accel_z + '\n';
			fs.appendFile(historyFile, logData, function(err){ if(err) console.log(err); });
		}
		else if(status !== undefined){
			logData = fix_date + ' ' + time.replace(timeH, parseInt(timeH) + timeOffset) + ' | ' + 'GPS ' + status + ' | ' + accel_x + ' | ' + accel_y + ' | ' + accel_z + '\n';
			fs.appendFile(historyFile, logData, function(err){ if(err) console.log(err); });
		}
	});
}

setInterval(function(){
	backup();
}, 1000);

/* ==== BOUTON VALIDATION/DEVALIDATION ===== */

var button = new Gpio(17,
{
	mode: Gpio.INPUT,
	pullUpDown: Gpio.PUD_DOWN,
	edge: Gpio.EITHER_EDGE
});

var a = false;

button.on('interrupt', function (level){
	if(!a && level == 1){
		a = true;
		if(!accident){
			accidentDetected();
			console.log('USER-TRIGGERED ALERT');
			fs.appendFile(historyFile, 'USER-TRIGGERED ALERT\n', function(err){ if(err) console.log(err); });
			io.emit('accident');
		}
		else {
			clearInterval(countdown);
			console.log('FALSE POSITIVE - ABORT');
			alarm('off');
			fs.appendFile(historyFile, 'FALSE POSITIVE\n', function(err){ if(err) console.log(err); });
			accident = false;
			LCD_clearLine(3);
			io.emit('falsepositive');
		}
		setTimeout(function(){
			a = false;
		}, 150);
	}
});

/* ==== REACTION EN CAS DE DETECTION ==== */

var countdown;

function accidentDetected(){
	if(!accident){
		accident = true;
		alarm('on');
		console.log('/!\\ ===== ACCIDENT ===== /!\\');
		LCD_set('ACCIDENT', 'center', 3);
		fs.appendFile(historyFile, 'ACCIDENT\n', function(err){ if(err) console.log(err); });
		exec('cp ' + historyFile + ' ' + accidentDirectory + '/accident_' + fix_date.replace(/\//g, '-') + '_' + time.replace(/:/g, '-') + '.txt', (error, stdout, stderr) => {});
		var i = 12;
		console.log(i);
		countdown = setInterval(function(){
			if(i > 0){
				i--;
				console.log(i);
			}
			else {
				clearInterval(countdown);
				alarm('off');
				Accident();
			}
		}, 1000);
	}
}

function Accident(){
	if(status == 'OK'){
		console.log('Google maps : ' + mapLink);
		GSM_sendSMS(phoneNumber, 'Accident detecte');
		setTimeout(function(){
			GSM_sendSMS(phoneNumber, mapLink);
		}, 15000);
		setTimeout(function(){
			GSM_sendSMS(phoneNumber, 'Vous pouvez appeller votre ami.');
		}, 30000);
	}
	else {
		if(mapLink !== undefined){
			console.log('Google maps : ' + mapLink + ' (last known position)');
			GSM_sendSMS(phoneNumber, 'Accident detecte');
			setTimeout(function(){
				GSM_sendSMS(phoneNumber, mapLink + '(derniere localisation connue)');
			}, 8000);
			setTimeout(function(){
				GSM_sendSMS(phoneNumber, 'Vous pouvez appeller votre ami.');
			}, 16000);
		}
		else {
			console.log('[!] UKNOWN LOCATION - Waiting for location...');
			GSM_sendSMS(phoneNumber, 'Accident detecte');
			setTimeout(function(){
				GSM_sendSMS(phoneNumber, 'Localisation inconnue pour le moment');
			}, 8000);
			setTimeout(function(){
				GSM_sendSMS(phoneNumber, 'Vous pouvez appeller votre ami.');
			}, 16000);
			var waitForLocation = setInterval(function(){
				if(mapLink !== undefined){
					clearInterval(waitForLocation);
					console.log('GPS signal acquired');
					GSM_sendSMS(phoneNumber, 'Votre ami a ete localise');
					setTimeout(function(){
						GSM_sendSMS(phoneNumber, mapLink);
					}, 16000);
				}
			}, 500);
		}
	}
	accident = false;
}

/* ==== FONCTIONS SYSTEME ==== */

function shutdown(){
	LCD_clear();
	LCD_wA('ARRET', 'center', 1);
	LCD_wA('SYSTEME', 'center', 2);
	console.log('[!] SYSTEM SHUTDOWN');
	fs.appendFile(historyFile, 'SYSTEM SHUTDOWN\n', function(err){ if(err) console.log(err); });
	exec('sudo shutdown now', (error, stdout, stderr) => {});
}
function reboot(){
	LCD_clear();
	LCD_wA('REDEMARRAGE', 'center', 1);
	LCD_wA('SYSTEME', 'center', 2);
	console.log('[!] SYSTEM REBOOT');
	fs.appendFile(historyFile, 'SYSTEM REBOOT\n', function(err){ if(err) console.log(err); });
	exec('sudo reboot now', (error, stdout, stderr) => {});
}