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

let bookletType = "byapartment";

function setBookletType(param){
    switch(param){
        case "alphabetical":
            bookletType = "alphabetical";
            break;
        default:
            bookletType = "byapartment";
    }
}

// Booklet

const Member = mongoose.model("Member");
const Ward = mongoose.model("Ward");

router.get("/", auth.verifyToken, async (req, res) => {
    try{
        setBookletType(req.query.type);
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
        setBookletType(req.query.type);
        await genBooklet(req.user_id);
        return res.sendStatus(200);
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

router.get("/old", [auth.verifyToken, auth2.permissionsGreaterThan(2)], async (req, res) => {
    try{
        setBookletType(req.query.type);
        const files = (await fs.readdir("./booklets")).filter(f => f.match(`${bookletType}.pdf`));
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

function parseString(str, variables){
    function getValue(obj, parts){
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
    return parseString(piece, variables);
}

//readTexPiece("apt1people.tex", {m0_id:"asdf", photoDir:"../photo/", m0firstname:"Jim", m0lastname:"Apple", m0phone:"(801) 123-4567", m0email:"cool@email.com"})

async function genBooklet(userId){
    await loadVariables(userId);
    let data = {
        frontCover: await createFrontCover(),
        bishopricPage: await createBishopricPage(),
        leadershipPage: await createLeadershipPage(),
        apartmentPages: await createApartmentPageBlock(bookletType),
        emergencyInfoPage: await createEmergencyInfoPage(),
        backCover: await createBackCover()
    }
    finalBooklet = await readTexPiece(`./booklet_pieces/structure.tex`, data);
    console.log(finalBooklet.match(/pagebreak/g).length);
    await createPDF(finalBooklet);
    await createPDFLandscape(landscapeString(genPages(getBookletLength(finalBooklet)), "temp.pdf")); //TODO: figure out how many pages are in a pdf. 
    await renamePDF();
}

const getBookletLength = (bookletString) => bookletString.match(/pagebreak/g).length + 1

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
    return `./booklets/${semester}_${year}_${variables.name.replace(/ /g, "_")}_Ward_${bookletType}.pdf`;
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

function landscapeString(pageOrder, bookletName){
    return `\\documentclass{article}
\\usepackage{pdfpages}
\\begin{document}
\\pagestyle{plain}
\\includepdf[pages=${pageOrder}, nup=1x2, landscape]{${bookletName}}
\\end{document}`;
}

//Variables
let photoDir = "../photos/";

async function createApartmentPageBlock(order = "byapartment"){
    if(order == "alphabetical"){
        let members = {};
        let memberCollection = await Member.find({
            apt: {$ne: "Bishopric"},
            hidden: {$ne: true}
        }).sort({lastname: 1});

        let page = 0;
        while(memberCollection.length > 0){
            page++;
            let data = {};
            data.m = [];
            while(data.m.length < 6 && memberCollection.length > 0){
                data.m.push(memberCollection.shift());
            }
            data.photoDir = photoDir;
            let part = await readTexPiece(`./booklet_pieces/apt${data.m.length}people.tex`, data);
            members[page] = await readTexPiece("./booklet_pieces/apttemplate.tex", {aptName: page, aptLayout: part});
        }
        //let apartmentPages = await readTexPiece("./booklet_pieces/alphabeticallist.tex", members);
        let apartmentPages = parseString(genAlphabeticalFormat(page), members);
        return apartmentPages;
    }
    else{
        let members = {};
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
}

function genAlphabeticalFormat(length){
    let parts = [];
    for(var i = 0; i < length; i++){
        parts.push(`{{${i+1}}}

\\pagebreak

`);  
    }

    while((parts.length+1) % 4 != 0){
        parts.push(`\\begin{center}
Page intentionally left blank
\\end{center}

\\pagebreak

`);
    }
    return parts.join("");
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

async function createEmergencyInfoPage(){
    return await readTexPiece("./booklet_pieces/emergencyinfopage.tex", {});
}

async function createFrontCover(){
    let data = {
        semester: getSemester(), 
        year: getYear(), 
        photoDir: photoDir,
        photoName: "emptytomb.jpg"
    }; 
    return await readTexPiece("./booklet_pieces/frontcover.tex", data);
}

async function createBackCover(){
    let data = {photoDir: photoDir}; 
    return await readTexPiece("./booklet_pieces/backcover.tex", data);
}

module.exports = router;