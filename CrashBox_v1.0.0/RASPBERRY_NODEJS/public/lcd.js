var socket = io.connect(location.host);

var lcdScreen = {};

socket.on("LCD", function(lcd){
	lcdScreen = JSON.parse(lcd);
});

document.getElementById("refreshScreen").onclick = function(){
	if(!pause){
		for(var i = 0; i <= 3; i++){
			document.getElementById("left" + i).value = lcdScreen[i].left;
			document.getElementById("center" + i).value = lcdScreen[i].center;
			document.getElementById("right" + i).value = lcdScreen[i].right;
		}
	}
};

socket.on("refreshLCD", function(){
	document.getElementById("refreshScreen").click();
});

document.getElementById("writeScreen").onclick = function(){
	var newScreen = {
		"0": {
			"left": "",
			"center": "",
			"right": ""
		},
		"1": {
			"left": "",
			"center": "",
			"right": ""
		},
		"2": {
			"left": "",
			"center": "",
			"right": ""
		},
		"3": {
			"left": "",
			"center": "",
			"right": ""
		}
	}
	for(var i = 0; i <= 3; i++){
		newScreen[i].left = document.getElementById("left" + i).value;
		newScreen[i].center = document.getElementById("center" + i).value;
		newScreen[i].right = document.getElementById("right" + i).value;
	}
	socket.emit("LCD", JSON.stringify(newScreen));
}

socket.on("phoneNumber", function(phoneNumber){
	document.getElementById('phoneNumber').value = phoneNumber;
});