var socket = io.connect(location.host);

var detectionLimit;

socket.on('accelLimit', function(accelLimit){
	document.getElementById("accelLimit").value = accelLimit;
	detectionLimit = accelLimit;
});

document.getElementById("accelLimit").onchange = function(){
	socket.emit('accelLimit', document.getElementById("accelLimit").value);
}

socket.on('ACCEL', function(message){
	if(!pause){
		// console.log(message);
		if(message !== "ioerror"){
			document.getElementsByClassName("error")[0].style.visibility = "hidden";
			var data = JSON.parse(message);
			// console.log(data);
			document.getElementsByClassName("units")[0].getElementsByTagName("span")[0].innerText = data.units;
			document.getElementsByClassName("x")[0].getElementsByTagName("span")[0].innerText = data.x.toFixed(1);
			document.getElementsByClassName("y")[0].getElementsByTagName("span")[0].innerText = data.y.toFixed(1);
			document.getElementsByClassName("z")[0].getElementsByTagName("span")[0].innerText = data.z.toFixed(1);
			if(data.x >= detectionLimit || data.x <= -Math.abs(detectionLimit)){
				document.getElementsByClassName("x")[0].getElementsByTagName("b")[0].style.backgroundColor = "red";
				accidentDetected();
			}
			else
				document.getElementsByClassName("x")[0].getElementsByTagName("b")[0].style.backgroundColor = "transparent";
			if(data.y >= detectionLimit || data.y <= -Math.abs(detectionLimit)){
				document.getElementsByClassName("y")[0].getElementsByTagName("b")[0].style.backgroundColor = "red";
				accidentDetected();
			}
			else
				document.getElementsByClassName("y")[0].getElementsByTagName("b")[0].style.backgroundColor = "transparent";
			if(data.z >= detectionLimit || data.z <= -Math.abs(detectionLimit)){
				document.getElementsByClassName("z")[0].getElementsByTagName("b")[0].style.backgroundColor = "red";
				accidentDetected();
			}
			else
				document.getElementsByClassName("z")[0].getElementsByTagName("b")[0].style.backgroundColor = "transparent";
		}
		else {
			document.getElementsByClassName("error")[0].style.visibility = "visible";
			console.log('[!] I/O Error');
		}
	}
});