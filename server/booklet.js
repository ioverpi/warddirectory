const mongoose = require("mongoose");
const auth = require("./auth.js");
const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const auth2 = require("./auth2.js");
const path = require("path");
//const variables = require("./variables.js"); //TODO: Need to fix this.
const variables = {};

const tempBookletTek = path.resolve("./temp.tex");
const tempBookletPdf = path.resolve("./temp.pdf");

const temp1BookletTek = path.resolve("./temp1.tex");
const temp1BookletPdf = path.resolve("./temp1.pdf");

// Booklet

const Member = mongoose.model("Member");
const Ward = mongoose.model("Ward");

router.get("/", auth.verifyToken, async (req, res) => {
    try{
        await loadVariables(req.user_id);
        try{
            await fs.access(genBookletPdfName());
        } catch(error){
            if(error.code == "ENOENT"){
                try{
                    await genBooklet(req.user_id);
                } catch(error){
                    console.log(error);
                    return res.sendStatus(500);
                }
            }else{
                console.log(error);
                return res.sendStatus(500);
            }
        }
        res.download(genBookletPdfName());
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.get("/generate", [auth.verifyToken, auth2.permissionsGreaterThan(2)], async (req, res) => {
    try{
        await genBooklet(req.user_id);
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.get("/old", [auth.verifyToken, auth2.permissionsGreaterThan(2)], async (req, res) => {
    try{
        const files = (await fs.readdir("./booklets")).filter(f => f.match(".pdf"));
        return res.status(200).send({
            booklets: files
        });
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.get("/:file", [auth.verifyToken, auth2.permissionsGreaterThan(2)], async (req, res) => {
    try{
        try{
            await fs.access(path.resolve(`./booklets/${req.params.file}`));
        } catch(error){
            return res.sendStatus(400);
        }
        return res.download(path.resolve(`./booklets/${req.params.file}`));
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

async function loadVariables(currUserId) {
    const currentUser = await Member.findById(currUserId);
    const userWard = await Ward.findById(currentUser.ward);
    variables.apartments = userWard.apartments;
    variables.callings = JSON.parse(userWard.callings);
    variables.name = userWard.name;//.replace(/ /g, "_");
}

function genPages(num){
    var arr=[];
    if(num % 4 != 0){
        return "This isn't going to work!";
    }
    for(var i = 0; i < num/4; i++){
        arr.push(num - i*2);
        arr.push(i*2 + 1);
        arr.push(i*2 + 2);
        arr.push(num - i*2 - 1);
    }
    
    return "{" + arr.join() + "}";
}

function parseString(str, variables){ //This might come in handy. 
	for(x in variables){
		str = str.replace(new RegExp("{{"+x+"}}", "g"), variables[x]);
	}
	let missingArgument = str.match(/{{(([^}][^}]?|[^}]}?)*)}}/);
	if(missingArgument) throw new Error("Missing a value for the argument " + missingArgument[1] + ".");
	return str;
}

function parseStringUpdated(str, variables){
    function getValue(obj, parts){
        //console.log(typeof obj[parts[0]]);
        if(typeof obj[parts[0]] != "object" || parts[0] == "_id"){
            return obj[parts[0]]
        }
        return getValue(obj[parts.shift()], parts)
    }
    let nextArgument, query, parts1, parts2, sep;
    while(true){
        nextArgument = str.match(/{{(([^}][^}]?|[^}]}?)*)}}/);
        if(!nextArgument) break;
        query = nextArgument[1];
        parts1 = query.split(".");
        parts2 = [];
        for(part of parts1){
            sep = part.match(/([^\[]+)\[([^\]])\]/);
            if(sep){
                parts2.push(sep[1]);
                parts2.push(parseInt(sep[2]));
            }else{
                parts2.push(part)
            }
        }
        str = str.replace("{{" + query + "}}", getValue(variables, parts2));
    }
    return str;
}

async function readTexPiece(filename, variables){
    let piece = await fs.readFile(filename, "utf8");
    return parseStringUpdated(piece, variables);
}

//readTexPiece("apt1people.tex", {m0_id:"asdf", photoDir:"../photo/", m0firstname:"Jim", m0lastname:"Apple", m0phone:"(801) 123-4567", m0email:"cool@email.com"})

async function genBooklet(userId){
    await loadVariables(userId);
    /*let data = {};
    data.m = await Member.find({
        apt: "S301",
        hidden: {$ne: true}
    });
    console.log(data.m[0]._id.toString());
    data.photoDir = "../photos/";
    let part = await readTexPiece(`./booklet_pieces/test.tex`, data);
    console.log(part);
    await createApartmentPageBlock()*/
    console.log(await createBishopricPage());
}

async function genBookletOld(userId){
    await loadVariables(userId);
    let members = [];
    for(let i = 0; i < variables.apartments.length; i++){
        members[i] = await Member.find({
            apt: variables.apartments[i],
            hidden: {$ne: true}
        });
    }
    
    var pb = "\\pagebreak\n";
    var finalBooklet = createFirstPart();
    finalBooklet += createFrontCover();
    finalBooklet += pb;
    finalBooklet += await createBishopricPage();
    finalBooklet += pb;
    finalBooklet += await createLeadershipPage();
    finalBooklet += pb;
    finalBooklet += createApartmentPage(variables.apartments[1], members[1]);
    for(let i = 2; i < variables.apartments.length; i++){
        finalBooklet += pb;
        finalBooklet += createApartmentPage(variables.apartments[i], members[i]);
    }
    finalBooklet += pb;
    finalBooklet += createEmergencyInfoPage();
    finalBooklet += pb;
    finalBooklet += createBackCover();
    finalBooklet += createLastPart();
    //console.log(finalBooklet);
    await createPDF(finalBooklet);
    await createPDFLandscape(landscapeString(genPages(32), "temp.pdf")); //TODO: figure out how many pages are in a pdf. 
    await renamePDF();
}

function getYear(){
    return (new Date()).getFullYear();
}

function getSemester(){
    let today = Date.now();
    let year = getYear();
    if(today > new Date("August 29, " + year)) return "Fall";
    if(today > new Date("June 19, " + year)) return "Summer";
    if(today > new Date("April 24, " + year)) return "Spring";
    return "Winter";
}

function genBookletPdfName(currSemester){
    let year = getYear();
    let semester = currSemester || getSemester();
    return `./booklets/${semester}_${year}_${variables.name.replace(/ /g, "_")}_Ward.pdf`;
}

async function renamePDF(currSemester){
    const newBookletPath = path.resolve(genBookletPdfName(currSemester));
    await fs.rename(temp1BookletPdf, newBookletPath);
}

async function createPDF(bookletString){
    try{
        await fs.writeFile(tempBookletTek, bookletString);
        const {stdout, stderr} = await exec(`pdflatex -interaction=nonstopmode ${tempBookletTek}`);
        console.log("stdout: ", stdout);
        console.log("stderror: ", stderr);
    } catch(error){
        //I don't know what to put here at the moment...
    }
}

async function createPDFLandscape(str){
    try{
        await fs.writeFile(temp1BookletTek, str);
        const {stdout, stderr} = await exec(`pdflatex -interaction=nonstopmode ${temp1BookletTek}`);
        console.log("stdout: ", stdout);
        console.log("stderror: ", stderr);
    } catch(error){
        //I don't know what to put here at the moment...
    }
}

//Variables
let photoDir = "../photos/";

async function createApartmentPageBlock(){
    let members = {}
    for(apt of variables.apartments){
        // Get data from database
        let data = {};
        data.m = await Member.find({
            apt: apt,
            hidden: {$ne: true}
        });
        data.photoDir = photoDir;
        if(data.m.length > 6) continue;
        // Load the fields in the tex files with data. 
        let part = await readTexPiece(`./booklet_pieces/apt${data.m.length}people.tex`, data);
        members[apt] = await readTexPiece("./booklet_pieces/apttemplate.tex", {aptName: apt, aptLayout: part});
    }
    let apartmentPages = await readTexPiece("./booklet_pieces/aptnamelist.tex", members);
    return apartmentPages;
}

async function createBishopricPage(){
    let data = {};
    data["bishop"] = await Member.findOne({
        calling: "Bishopric;Bishop"
    });
    data["bishopWife"] = await Member.findOne({
        lastname: data["bishop"].lastname,
        firstname: {$ne: data["bishop"].firstname}
    })
    data["firstCounselor"] = await Member.findOne({
        calling: "Bishopric;1st Counselor"
    });
    data["firstCounselorWife"] = await Member.findOne({
        lastname: data["firstCounselor"].lastname,
        firstname: {$ne: data["firstCounselor"].firstname}
    })
    data["secondCounselor"] = await Member.findOne({
        calling: "Bishopric;2nd Counselor"
    });
    data["secondCounselorWife"] = await Member.findOne({
        lastname: data["secondCounselor"].lastname,
        firstname: {$ne: data["secondCounselor"].firstname}
    })
    data["highCounselor"] = await Member.findOne({
        calling: "Bishopric;Assigned Stake High Counselor"
    });
    data["highCounselorWife"] = await Member.findOne({
        lastname: data["highCounselor"].lastname,
        firstname: {$ne: data["highCounselor"].firstname}
    })
    
    for(person in data){
        if(!data[person]){
            throw new Error("All of the bishopric and their wives need to exist to create the booklet.");
        }
        if(person.includes("Wife")) continue;
        let address = data[person]["address"].split(";")
        data[person].street = address[0];
        data[person].city = address[1];
    }

    data.photoDir = photoDir;
    return await readTexPiece("./booklet_pieces/bishopricpage.tex", data);
}

async function createLeadershipPage(){
    var result = "";
    result += "\\begin{center}\n";
    result += "\\textbf{\\Huge Ward Leadership:}\n";
    result += "\\end{center}\n";
    result += "\\begin{multicols}{2}\n";
    result += "\\raggedright\n";
    result += "\\begin{large}\n";

    for(category in variables.callings){
        if(category == "Bishopric") continue; 
        if(category == "Misc"){
            for(dcalling in variables.callings[category]){
                let currCalling = await Member.findOne({
                    calling: category + ";" + dcalling
                });
                if(currCalling){
                    //console.log(currCalling.calling);
                    //if(currCalling.calling ==  "Ward Clerks;Ward Clerk"){
                    //    result += "\\textbf{" + dcalling + ":} \\mbox{" + currCalling.firstname.split(" &")[0] + " " + currCalling.lastname + "}\n";
                    //}else{
                    result += "\\textbf{" + dcalling + ":} \\mbox{" + currCalling.firstname + " " + currCalling.lastname + "}\n";
                    //}
                } else{
                    result += "\\textbf{" + dcalling + ":}\n";
                }
                result += "\n";
            }
            continue;
        }
        result += "\\textbf{" + category + ":}\n";
        result += "\n";
        for(dcalling in variables.callings[category]){
            let currCalling = await Member.findOne({
                calling: category + ";" + dcalling
            });
            if(currCalling){
                if(currCalling.calling ==  "Ward Clerks;Ward Clerk"){
                    result += dcalling + " \\mbox{- " + currCalling.firstname.split(" &")[0] + " " + currCalling.lastname + "}\n";
                }else{
                    result += dcalling + " \\mbox{- " + currCalling.firstname + " " + currCalling.lastname + "}\n";
                }
            }else{
                result += dcalling + " - \n";
            }
            result += "\n";
        }
    }

    result += "\\end{large}\n";
    result += "\\end{multicols}\n"

    let wardClerk = await Member.findOne({
        calling: "Ward Clerks;Ward Clerk"
    })
    let wardClerkWife = await Member.findOne({
        lastname: wardClerk.lastname,
        firstname: {$ne: wardClerk.firstname}
    })

    if(wardClerk){
        result += "\\setlength{\\tabcolsep}{5pt}\n";
        result += "\\begin{tabular}{c c}\n";
        
        result += "\\multirow{4}{*}{\\includegraphics[width=10cm]{../photos/" + wardClerk._id + ".jpg}}\n";

        result += "& \\vspace{2cm} \\\\\n";
        //result += "\\begin{Large}\n"
        result += "& \\Large " + wardClerk.firstname + " \\& " + wardClerkWife.firstname + " " + wardClerk.lastname + " \\\\\n";
        //result += "& David \\& Sonia Smaldone \\\\\n";
        result += "& \\Large " + wardClerk.phone + " \\\\\n";
        //result += "& 801-209-7024 \\\\\n";
        result += "& \\Large " + wardClerk.email + " \\\\\n";
        //result += "& smaldone.david@gmail.com\n";
        //result += "\\end{Large}\n"

        result += "\\end{tabular}\n";
        result += "\\setlength{\\tabcolsep}{17pt}\n";
    }
    return result;
}

function createEmergencyInfoPage(){
    var result = "";
    result += "\\begin{center}\n";
	result += "\\textbf{\\huge Personal Emergency Response}\n";
    result += "\\end{center}\n";
    result += "\n";
    result += "\\begin{itemize}\n";
	result += "\\item \\textbf{Food}\n";
	result += "\n";
	result += "Keep one week worth of groceries on hand at all times, along with food for emergencies (granola bars, etc.)\n";
    result += "\n";
	result += "Keep at least a 3-day supply of emergency water (one gallon per person per day).\n";
    result += "\n";
	result += "\\item \\textbf{Transportation}\n";
	result += "\n";
	result += "Keep your car’s gas tank at least half full at all times.\n";
    result += "\n";
	result += "\\item \\textbf{Money}\n";
	result += "\n";
	result += "Have enough money available to get to your parent’s home (if that is where you would go in case of an emergency).\n";
    result += "\n";
	result += "\\item \\textbf{Communication}\n";
	result += "\n";
	result += "Have your cell phone programmed to call family and other important people in your life. Program an ICE (In Case of Emergency) number in your cell phone directory.\n";
    result += "\n";
	result += "Designate an out of area family member as a family communication contact.\n";
    result += "\n";
	result += "Keep your roommates/spouse apprised of your whereabouts.\n";
	result += "\n";
	result += "Know about emergency info sources, including KSL AM1160 and FM 102.7 and KBYU FM 89.1 and 89.5. Remember that your car radio is a source for emergency info.\n";
	result += "\n";
	result += "\\item \\textbf{Other Emergency Items}\n";
	result += "\n";
	result += "Designate a place for meeting your roommates, or your spouse and children (right outside your home for emergencies such as fires, and outside your neighborhood if you can’t get home).\n";
	result += "\n";
	result += "Be aware of your ward’s emergency response plan, especially the ward emergency locations.\n";
    result += "\n";
	result += "Identify primary and alternate escape routes out of your home and conduct drills with your family/roommates.\n";
	result += "\n";
	result += "Keep all needed medications readily available (one-week supply).\n";
	result += "\n";
	result += "Have items available for warmth in cold weather (coats, blankets, etc)\n";
	result += "\n";
	result += "Keep insurance policies (policy \\# and contact information) available, along with any other important documents, such as birth certificates and marriage licenses.\n";
	result += "\n";
	result += "Learn what to do for the different hazards that could impact you or your family.\n";
	result += "\n";
	result += "Go to http://risk.byu.edu/emergency for more information\n";
    result += "\\end{itemize}\n";
    result += "\\textbf{The Provo YSA 32nd Ward emergency meeting place is the space in between the Thomas L. Martin Building (MARB) and Life Science Building (LSB).}\n";
    return result;
}

function createFrontCover(){
    var result="";
    result += "\n";
    result += "\\begin{center}\n";
	result += "\\vspace*{2cm}\n";
	result += "\n";
	result += "\\textbf{\\Large Provo YSA 32nd Ward}\n";
	result += "\n";
	result += "\\vspace{2mm}\n";
	result += "\n";
    result += "\\textbf{\\Large " + getSemester() + " Semester " + getYear() + "}\n";
	result += "\n";
	result += "\\vspace{1cm}\n";
	result += "\n";
	result += "\\includegraphics[width=16cm, trim={0 12cm 0 0}, clip]{../photos/emptytomb.jpg}\n";
	result += "\n";
	result += "\\vspace{2cm}\n";
	result += "\n";
	result += "\\textbf{\\textit{FOR CHURCH USE ONLY}}\n";
    result += "\\end{center}\n";
    return result;
}

function createBackCover(){
    var result = "";
    result += "\\begin{center}\n";
	result += "\\includegraphics[width=9cm]{../photos/presnelson.jpg}\n";
    result += "\\end{center}\n";
    result += "\n";
    result += "\\begin{large}\n";
	result += "``Nothing is more liberating, more ennobling, or more crucial to our individual progression than is a regular, daily focus on repentance. Repentance is not an event; it is a process. It is the key to happiness and peace of mind. When coupled with faith, repentance opens our access to the power of the Atonement of Jesus Christ.\n";
	result += "\n";
	result += "Whether you are diligently moving along the covenant path, have slipped or stepped from the covenant path, or can’t even see the path from where you are now, I plead with you to repent. Experience the strengthening power of daily repentance --- of doing and being a little better each day.\n";
	result += "\n";
	result += "When we choose to repent, we choose to change! We allow the Savior to transform us into the best version of ourselves. We choose to grow spiritually and receive joy --- the joy of redemption in Him. When we choose to repent, we choose to become more like Jesus Christ!\"\n";
	result += "\n";
	result += "--- President Russell M. Nelson (We Can Do Better and Be Better)\n";
	result += "\n";
    result += "\\end{large}\n";
    return result;
}

function createFirstPart(){
    var result = "";
    result += "\\documentclass[12pt]{article}\n";
    result += "\\usepackage[utf8]{inputenc}\n";
    result += "\n";
    result += "\\usepackage[top=1in,left=.5in,right=.5in,bottom=.5in]{geometry}\n";
    result += "\\usepackage[space]{grffile}\n";
    result += "\n";
    //%\usepackage[landscape]{geometry}
    result += "\\usepackage{graphicx}\n";
    result += "\\newcommand\\picscale{.65}\n";
    result += "\\renewcommand{\\arraystretch}{1.75}\n";
    result += "\\setlength{\\tabcolsep}{17pt}\n";
    result += "\\pagenumbering{gobble}\n";
    result += "\\usepackage{multirow}\n";
    result += "\\usepackage{multicol}\n";
    result += "\n";
    //\title{Ward Directory}
    //\author{kellon08 }
    //\date{October 2019}

    result += "\\begin{document}\n"
    return result;
}

function createLastPart(){
    var result = "";
    result += "\\end{document}";
    return result;
}

module.exports = router;