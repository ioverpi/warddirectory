var canvas, ctx;
var virtualCanvas, vctx;
var img, img2;
var testp;
var initCoordx = -80;
var initCoordy = 40;
var currCoordx,currCoordy;

var scale = .8;
function init(){
    canvas = document.getElementById("canvas");
    //console.log(canvas);
    ctx = canvas.getContext("2d");
    canvas.width = 500;
	canvas.height = 500;
    virtualCanvas = document.createElement("canvas");
    vctx = virtualCanvas.getContext("2d");
    virtualCanvas.width = finalWidth;
    virtualCanvas.height = finalHeight;
	
	// img = new Image();
    // //img.src = "Kellon Sandall.jpg";
    // img.src = "/photos/Jim_Apple.jpg";
	// img.addEventListener("load", draw, false);
	canvas.addEventListener("mousemove", movePicture, false);
	canvas.addEventListener("mousedown", prepCoords, false);
	canvas.addEventListener("wheel", scalePicture, false);
}

function loadImage(dataURL){
    img = new Image();
    img.src = dataURL;
    img.addEventListener("load", draw, false);
}

function saveImageBase64(){
    vctx.drawImage(canvas, xCorner, yCorner, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);
    return virtualCanvas.toDataURL("image/jpeg", 1.0);
}

async function saveImageBlob(){
    vctx.drawImage(canvas, xCorner, yCorner, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);
    const blob = await new Promise(resolve => virtualCanvas.toBlob(resolve, "image/jpeg", 1));
    return blob;
}

var xCorner = 150;
var yCorner = 100;
var finalWidth = 200;
var finalHeight = 300;

function draw(){
	//console.log(img.width, img.height);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, initCoordx, initCoordy, img.width*scale, img.height*scale);
    placeBoundaries(xCorner, yCorner, 1);
	//traceRect(80, 80, 1);
	//cutOutImage();
}

function cutOutImage(){
    ctx.drawImage(canvas, xCorner, yCorner, 200, 300, 300, 200, 200, 300);
    
}

function placeBoundaries(x, y, scale){
    //var width = finalWidth;
    //var height = finalHeight;
    ctx.fillStyle="rgba(0, 0, 0, .5)";
    ctx.fillRect(0, 0, canvas.width, y);
    ctx.fillRect(0, y, x, finalHeight*scale);
    ctx.fillRect(x + finalWidth*scale, y, x, finalHeight*scale);
    ctx.fillRect(0, y + finalHeight*scale, canvas.width, canvas.height - y - finalHeight*scale);
}

function traceRect(x, y, scale){
	var internalscale = .5;
	var width = 400 * internalscale;
	var height = 600 * internalscale;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x, y + height*scale);
	ctx.lineTo(x + width*scale, y + height*scale);
	ctx.lineTo(x + width*scale, y);
	ctx.lineTo(x, y);
	ctx.stroke();
}

function movePicture(event){
	if(event.which == 1){
		initCoordx -= currCoordx - event.offsetX;
		initCoordy -= currCoordy - event.offsetY;
		draw();
		currCoordx = event.offsetX;
		currCoordy = event.offsetY;
		//console.log((currCoordx - event.offsetX) + ", " + (currCoordy - event.offsetY));
		//testp.innerHTML = "Button: " + event.which + " at (" + event.offsetX + ", " + event.offsetY + ")"; 
	}
	return false;
}



function prepCoords(event){
	currCoordx = event.offsetX;
	currCoordy = event.offsetY;
}

function scalePicture(event){
	event.preventDefault();
	var oldscale = scale;
	if (event.deltaY < 0) {
		scale += event.deltaY * -.01;
	} else if(event.deltaY > 0){
		scale -= event.deltaY * .01;
	}
	//testp.innerHTML = "Scrolling at (" + event.offsetX + ", " + event.offsetY + "). The corner of the picture is at (" + initCoordx + ", " + initCoordy + ").";
	//(event.deltaY != 0)?console.log(scale):"";
	scale = Math.min(Math.max(.125, scale), 2);
	initCoordx = event.offsetX - scale*(event.offsetX - initCoordx)/oldscale;
	initCoordy = event.offsetY - scale*(event.offsetY - initCoordy)/oldscale;
	draw();
}

//window.addEventListener("load", init, false);

//This is a function to make a string with some coordinates.
function coordStr(x, y){
	return "(" + x + ", " + y + ")";
}