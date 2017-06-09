var socket = io.connect(location.host);

document.getElementById("buzzerON").onclick = function(){
	socket.emit("buzzer", "on");
}
document.getElementById("buzzerOFF").onclick = function(){
	socket.emit("buzzer", "off");
}
socket.on("noAlarm", function(){
	document.getElementsByClassName("buzzerDisabled")[0].style.display = "block";
})