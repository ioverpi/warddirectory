(function(){
let exportArr = [];
let tbody = document.getElementsByTagName("tbody")[0].childNodes;
for(let i = 0; i < tbody.length; i++){
	/*console.log(tbody[i]);*/
	if(tbody[i].nodeName == "TR"){
		let apartment = "Unknown";
		if(tbody[i].childNodes[13].innerText.match(/[NS]\d\d\d/)){
			apartment = tbody[i].childNodes[13].innerText.match(/[NS]\d\d\d/)[0];
		}else if(tbody[i].childNodes[13].innerText.match("820")){
			apartment = "Pink House";
		}else if(tbody[i].childNodes[13].innerText.match(/81[57]/)){
			apartment = "Loft";
		}else if(tbody[i].childNodes[13].innerText.match("605")){
			apartment = "White House";
		}
		exportArr.push({
			firstname: tbody[i].childNodes[3].innerText.split(", ")[1].split(" ")[0],
			lastname: tbody[i].childNodes[3].innerText.split(", ")[0],
			apartment: apartment,
			phone: tbody[i].childNodes[15].innerText,
			email: tbody[i].childNodes[17].innerText
		});
	}
}

let mask = document.createElement("div");
let wrapper = document.createElement("div");
let container = document.createElement("div");
let message = document.createElement("p");
let textarea = document.createElement("textarea");
let button = document.createElement("button");
mask.appendChild(wrapper);
wrapper.appendChild(container);
container.appendChild(message);
container.appendChild(textarea);
container.appendChild(button);

mask.style.position = "fixed";
mask.style.zIndex = 9999;
mask.style.top = 0;
mask.style.left = 0;
mask.style.width = "100%";
mask.style.height = "100%";
mask.style.backgroundColor = "rgba(0, 0, 0, .5)";
mask.style.display = "table"; /*Don't know why.*/

wrapper.style.display = "table-cell";
wrapper.style.verticalAlign = "middle";

container.style.width = "800px";
container.style.margin = "0px auto";
container.style.padding = "20px 30px";
container.style.backgroundColor = "#fff";
container.style.borderRadius = "2px";
container.style.boxShadow = "0 2px 8px rgba(0, 0, 0, .33)";

message.innerHTML = "Here is what you need to copy";

textarea.innerHTML = JSON.stringify(exportArr);
textarea.rows = "30";
textarea.style.width = "600px";
textarea.cols = "800";

button.innerHTML = "Close";

button.onclick = function(){
	mask.remove();
};

document.body.appendChild(mask);
textarea.focus();
textarea.select();
})();