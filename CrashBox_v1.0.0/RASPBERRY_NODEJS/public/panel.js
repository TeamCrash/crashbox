var socket = io.connect(location.host);

/* == Pause mode == */

var pause = 0;

function togglePause(){
	if(!pause){
		pause = 1;
		document.getElementsByClassName("pause")[0].style.display = "block";
	}
	else {
		if(!accident){
			pause = 0;
			document.getElementsByClassName("pause")[0].style.display = "none";
		}
	}
}

document.onkeyup = function(e){
	if(e.keyCode == 32 && e.target.tagName !== "INPUT"){
		togglePause();
	}
}

/* == Accident detected == */

socket.on('accident', function(){
	accidentDetected();
});

socket.on('falsepositive', function(){
	location.reload();
});

var accident = 0;

function accidentDetected(){
	accident = 1;
	togglePause();
	document.getElementsByClassName("accident")[0].style.visibility = "visible";
	if(typeof(latitude_dd) !== "undefined" && typeof(longitude_dd) !== "undefined"){
		document.getElementsByClassName("mapLink")[0].href = "http://maps.google.com?q=" + latitude_dd + "," + longitude_dd;
		if(document.getElementsByClassName("status")[0].getElementsByTagName("span")[0].innerText !== "OK")
			document.getElementsByClassName("mapLink")[0].innerText = "Dernière localisation connue";
	}
	else
		document.getElementsByClassName("mapLink")[0].style.display = "none";
	socket.emit("accident");
}

/* == Toggle advanced options == */

document.getElementsByClassName("toggleOptions")[0].onclick = function(){
	if(document.getElementsByClassName("options")[0].style.visibility == "hidden"){
		document.getElementsByClassName("options")[0].style.visibility = "visible";
		document.getElementsByClassName("toggleOptions")[0].style.backgroundColor = "#2ECC71";
	}
	else {
		document.getElementsByClassName("options")[0].style.visibility = "hidden";
		document.getElementsByClassName("toggleOptions")[0].style.backgroundColor = "transparent";
	}
}

document.getElementsByClassName("accidentDetected")[0].onclick = accidentDetected;