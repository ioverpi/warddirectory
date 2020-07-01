const mongoose = require("mongoose");
const auth = require("./auth.js");
const express = require("express");
const router = express.Router();
const fs = require("fs").promises;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const variables = require("./variables.js");

// Booklet

const Member = mongoose.model("Member");

router.get("/", auth.verifyToken, async (req, res) => {
    try{
        let members = [];
        for(let i = 0; i < variables.apartments.length; i++){
            members[i] = await Member.find({
                apt: variables.apartments[i]
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
        return res.download("./test.pdf");
    } catch(error){
        console.log(error);
        return res.sendStatus(500);
    }
});

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

async function createPDF(bookletString){
    var filename = "test.tek";
    try{
        await fs.writeFile(filename, bookletString);
        const {stdout, stderr} = await exec("pdflatex -interaction=nonstopmode " + filename);
        console.log("stdout: ", stdout);
        console.log("stderror: ", stderr);
    } catch(error){
        //I don't know what to put here at the moment...
    }
}

//Variables
let photoDir = "../photos/";

function createApartmentPageAlt(name, members){
    let page;
    switch(members.length){
        case 0:
            page = 
`\\vspace{3cm}

Nobody lives here.`;
        break;
        case 1:
            page = 
`\\vspace{3cm}

\\includegraphics[scale=\\picscale]{${photoDir}${members[0]._id}.jpg} \\\\
${members[0].firstname} ${members[0].lastname} \\\\
${members[0].phone} \\\\
${members[0].email} \\\\`;
        break;
        case 2:
            page = 
`\\vspace{3cm}

\\begin{tabular}{c c c}
\\includegraphics[scale=\\picscale]{${photoDir}${members[0]._id}.jpg} & & \\includegraphics[scale=\\picscale]{${photoDir}${members[1]._id}.jpg} \\\\ 
${members[0].firstname} ${members[0].lastname} & & ${members[1].firstname} ${members[1].lastname} \\\\
${members[0].phone} & & ${members[1].phone} \\\\
${members[0].email} & & ${members[1].email} \\\\
\\end{tabular}`;
        break;
        case 3:
            page = 
`\\setlength{\\tabcolsep}{5pt}
\\begin{tabular}{c c c}
\\includegraphics[scale=\\picscale]{${photoDir}${members[0]._id}.jpg} & & 
\\includegraphics[scale=\\picscale]{${photoDir}${members[1]._id}.jpg} \\\\
${members[0].firstname} ${members[0].lastname} & & ${members[1].firstname} ${members[1].lastname} \\\\
${members[0].phone} & & ${members[1].phone} \\\\
${members[0].email} & & ${members[1].email} \\\\
& \\includegraphics[scale=\\picscale]{${photoDir}${members[2]._id}.jpg} \\\\
& ${members[2].firstname} ${members[2].lastname} \\\\
& ${members[2].phone} \\\\
& ${members[2].email} \\\\
\\end{tabular}
\\setlength{\\tabcolsep}{17pt}`;
        break;
        case 4:
            hspace = "\\hspace{.5cm}"
            page = 
`\\begin{tabular}{c c c}
${Array(2).join(0).split(0).map((item, i) => `
\\includegraphics[scale=\\picscale]{${photoDir}${members[i*2]._id}.jpg} & ${hspace} & \\includegraphics[scale=\\picscale]{${photoDir}${members[i*2 + 1]._id}.jpg} \\\\
${members[i*2].firstname} ${members[i*2].lastname} & ${hspace} & ${members[i*2 + 1].firstname} ${members[i*2 + 1].lastname} \\\\
${members[i*2].phone} & ${hspace} & ${members[i*2 + 1].phone} \\\\
${members[i*2].email} & ${hspace} & ${members[i*2 + 1].email} \\\\`).join('').trim()}
\\end{tabular}`;
        break;
        case 5:
        case 6:
            let lastRowNum = members.length - 3;
            page = 
`\\begin{tabular}{c c c}
${Array(3).join(0).split(0).map((item, i) => `\\includegraphics[scale=\\picscale]{${photoDir}${members[i]._id}.jpg} `).join('& ')}\\\\
${Array(3).join(0).split(0).map((item, i) => `${members[i].firstname} ${members[i].lastname} `).join('& ')}\\\\
${Array(3).join(0).split(0).map((item, i) => `${members[i].phone} `).join('& ')}\\\\
${Array(3).join(0).split(0).map((item, i) => `${members[i].email} `).join('& ')}\\\\
\\end{tabular}
\\begin{tabular}{c c}
${Array(lastRowNum).join(0).split(0).map((item, i) => `\\includegraphics[scale=\\picscale]{${photoDir}${members[i + 3]._id}.jpg} `).join('& ')}\\\\
${Array(lastRowNum).join(0).split(0).map((item, i) => `${members[i + 3].firstname} ${members[i + 3].lastname} `).join('& ')}\\\\
${Array(lastRowNum).join(0).split(0).map((item, i) => `${members[i + 3].phone} `).join('& ')}\\\\
${Array(lastRowNum).join(0).split(0).map((item, i) => `${members[i + 3].email} `).join('& ')}\\\\
\\end{tabular}`;
        break;
        default:
            page = 
`\\vspace{3cm}

Something went wrong in compiling. There is probably too many people in this apartment`;
        break;
    }

    return `\\begin{center}

\\textbf{\\Huge ${name}}

\\vspace{2cm}

${page}

\\end{center}
`;
}

function createApartmentPage(name, members){
    var result = "";
    result += "\\begin{center}\n";
    result += "";
    result += "\\textbf{\\Huge " + name + "}\n";
    result += "\n";
    result += "\\vspace{2cm}\n";
    result += "\n";
    switch(members.length){
        case 0:
            result += "\\vspace{3cm}\n";
            result += "\n";
            result += "Nobody lives here. \n";
        break;
        case 1:
            result += "\\vspace{3cm}\n";
            result += "\n";
            result += "\\includegraphics[scale=\\picscale]{../photos/" + members[0]._id + ".jpg} \\\\\n";
            result += members[0].firstname + " " + members[0].lastname + " \\\\\n";
            result += members[0].phone + " \\\\\n";
            result += members[0].email + " \\\\\n";
        break;
        case 2:
            result += "\\vspace{3cm}\n";
            result += "\n";
            result += "\\begin{tabular}{c c c}\n";
            result += "\\includegraphics[scale=\\picscale]{../photos/" + members[0]._id + ".jpg} & & ";
            result += "\\includegraphics[scale=\\picscale]{../photos/" + members[1]._id + ".jpg} \\\\\n";
            result += members[0].firstname + " " + members[0].lastname + " & & ";
            result += members[1].firstname + " " + members[1].lastname + " \\\\\n";
            result += members[0].phone + " & & ";
            result += members[1].phone + " \\\\\n";
            result += members[0].email + " & & ";
            result += members[1].email + " \\\\\n";
            result += "\\end{tabular}\n";
        break;
        case 3:
            result += "\\setlength{\\tabcolsep}{5pt}\n"
            result += "\\begin{tabular}{c c c}\n";
            result += "\\includegraphics[scale=\\picscale]{../photos/" + members[0]._id + ".jpg} & & ";
            result += "\\includegraphics[scale=\\picscale]{../photos/" + members[1]._id + ".jpg} \\\\\n";
            result += members[0].firstname + " " + members[0].lastname + " & & ";
            result += members[1].firstname + " " + members[1].lastname + " \\\\\n";
            result += members[0].phone + " & & ";
            result += members[1].phone + " \\\\\n";
            result += members[0].email + " & & ";
            result += members[1].email + " \\\\\n";
            result += "& \\includegraphics[scale=\\picscale]{../photos/" + members[2]._id + ".jpg} \\\\\n";
            result += "& " + members[2].firstname + " " + members[2].lastname + " \\\\\n";
            result += "& " + members[2].phone + " \\\\\n";
            result += "& " + members[2].email + " \\\\\n";
            result += "\\end{tabular}\n";
            result += "\\setlength{\\tabcolsep}{17pt}\n"
        break;
        case 4:
            result += "\\begin{tabular}{c c c}\n";
            var i = 0;
            let hspace = "\\hspace{.5cm}"
            for(i = 0; i < 4; i+=2){
                result += "\\includegraphics[scale=\\picscale]{../photos/" + members[0 + i]._id + ".jpg} & ";
                result += hspace + " & ";
                result += "\\includegraphics[scale=\\picscale]{../photos/" + members[1 + i]._id + ".jpg} \\\\\n";
                result += members[0 + i].firstname + " " + members[0 + i].lastname + " & ";
                result += hspace + " & ";
                result += members[1 + i].firstname + " " + members[1 + i].lastname + " \\\\\n";
                result += members[0 + i].phone + " & ";
                result += hspace + " & ";
                result += members[1 + i].phone + " \\\\\n";
                result += members[0 + i].email + " & ";
                result += hspace + " & ";
                result += members[1 + i].email + " \\\\\n";
            }
            result += "\\end{tabular}\n";
        break;
        case 5:
            result += "\\begin{tabular}{c c c}\n";
            var i = 0;
            for(i = 0; i < 3; i++){
                result += "\\includegraphics[scale=\\picscale]{../photos/" + members[i]._id + ".jpg} " + ((i < 2)?"& ":"\\\\\n");
            }
            for(i = 0; i < 3; i++){
                result += members[i].firstname + " " + members[i].lastname + ((i < 2)?" & ":" \\\\\n");
            }
            for(i = 0; i < 3; i++){
                result += members[i].phone + ((i < 2)?" & ":" \\\\\n");
            }
            for(i = 0; i < 3; i++){
                result += members[i].email + ((i < 2)?" & ":" \\\\\n");
            }
            result += "\\end{tabular}\n";
            result += "\\begin{tabular}{c c}";
            for(i = 3; i < 5; i++){
                result += "\\includegraphics[scale=\\picscale]{../photos/" + members[i]._id + ".jpg} " + ((i < 4)?"& ":"\\\\\n");
            }
            for(i = 3; i < 5; i++){
                result += members[i].firstname + " " + members[i].lastname + ((i < 4)?" & ":" \\\\\n");
            }
            for(i = 3; i < 5; i++){
                result += members[i].phone + ((i < 4)?" & ":" \\\\\n");
            }
            for(i = 3; i < 5; i++){
                result += members[i].email + ((i < 4)?" & ":" \\\\\n");
            }
            result += "\\end{tabular}\n";
        break;
        case 6:
            result += "\\begin{tabular}{c c c}\n";
            var i = 0;
            for(i = 0; i < 3; i++){
                result += "\\includegraphics[scale=\\picscale]{../photos/" + members[i]._id + ".jpg} " + ((i < 2)?"& ":"\\\\\n");
            }
            for(i = 0; i < 3; i++){
                result += members[i].firstname + " " + members[i].lastname + ((i < 2)?" & ":" \\\\\n");
            }
            for(i = 0; i < 3; i++){
                result += members[i].phone + ((i < 2)?" & ":" \\\\\n");
            }
            for(i = 0; i < 3; i++){
                result += members[i].email + ((i < 2)?" & ":" \\\\\n");
            }
            for(i = 3; i < 6; i++){
                result += "\\includegraphics[scale=\\picscale]{../photos/" + members[i]._id + ".jpg} " + ((i < 5)?"& ":"\\\\\n");
            }
            for(i = 3; i < 6; i++){
                result += members[i].firstname + " " + members[i].lastname + ((i < 5)?" & ":" \\\\\n");
            }
            for(i = 3; i < 6; i++){
                result += members[i].phone + ((i < 5)?" & ":" \\\\\n");
            }
            for(i = 3; i < 6; i++){
                result += members[i].email + ((i < 5)?" & ":" \\\\\n");
            }
            result += "\\end{tabular}\n";
        break;
        default:
            result += "\\vspace{3cm}\n";
            result += "\n";
            result += "Something went wrong in compiling. There is probably too many people in this apartment";
        break;
    }
    result += "\\end{center}\n"
    return result;
}

async function createBishopricPageAlt(){
    let bishop = await Member.findOne({
        calling: "Bishopric;Bishop"
    });
    let firstCounselor = await Member.findOne({
        calling: "Bishopric;1st Counselor"
    });
    let secondCounselor = await Member.findOne({
        calling: "Bishopric;2nd Counselor"
    });
    let highCounselor = await Member.findOne({
        calling: "Bishopric;Assigned Stake High Counselor"
    });
    if(!bishop && !firstCounselor && !secondCounselor && !highCounselor){
        result += "You need to have all 4 members of the bishopbric. \n"
        result += "\\end{center}\n";
        return `\\begin{center}

\\textbf{\\Huge Bishopric}
You need to have all 4 members of the bishopbric.
\\end{center}
`;
    }
    
}

async function createBishopricPage(){
    var result = "";
    result += "\\begin{center}\n";
    result += "";
    result += "\\textbf{\\Huge Bishopric}\n";
    //result += "\n";
    //result += "\\vspace{2cm}\n";
    result += "\n";
    let hspace = "\\hspace{.25cm}";
    let bishop = await Member.findOne({
        calling: "Bishopric;Bishop"
    });
    let firstCounselor = await Member.findOne({
        calling: "Bishopric;1st Counselor"
    });
    let secondCounselor = await Member.findOne({
        calling: "Bishopric;2nd Counselor"
    });
    let highCounselor = await Member.findOne({
        calling: "Bishopric;Assigned Stake High Counselor"
    });
    if(!bishop && !firstCounselor && !secondCounselor && !highCounselor){
        result += "You need to have all 4 members of the bishopbric. \n"
        result += "\\end{center}\n";
        return result;
    }
    result += "\\renewcommand{\\picscale}{1}\n";
    result += "\\renewcommand{\\arraystretch}{1}\n";
    result += "\\begin{tabular}{c c}\n";
    // console.log(bishop);
    // console.log(firstCounselor);
    // console.log(secondCounselor);
    // console.log(highCounselor);
    result += "\\includegraphics[width=8cm]{../photos/" + bishop._id + ".jpg} & ";
    //result += hspace + " & ";
    result += "\\includegraphics[width=8cm]{../photos/" + firstCounselor._id + ".jpg} \\\\\n";
    result += "Bishop & ";
    //result += hspace + " & ";
    result += "1st Counselor \\\\\n";
    result += bishop.firstname.replace("&", "\\&") + " " + bishop.lastname + " & ";
    //result += hspace + " & ";
    result += firstCounselor.firstname.replace("&", "\\&") + " " + firstCounselor.lastname + " \\\\\n";
    result += bishop.phone + " & ";
    //result += hspace + " & ";
    result += firstCounselor.phone + " \\\\\n";
    result += bishop.email + " & ";
    //result += hspace + " & ";
    result += firstCounselor.email + " \\\\\n";
    result += bishop.address.split(";")[0] + " & ";
    //result += hspace + " & ";
    result += firstCounselor.address.split(";")[0] + " \\\\\n";
    result += bishop.address.split(";")[1] + " & ";
    //result += hspace + " & ";
    result += firstCounselor.address.split(";")[1] + " \\\\\n";
    
    result += "\\includegraphics[width=8cm]{../photos/" + secondCounselor._id + ".jpg} & ";
    //result += hspace + " & ";
    result += "\\includegraphics[width=8cm]{../photos/" + highCounselor._id + ".jpg} \\\\\n";
    result += "2nd Counselor & ";
    //result += hspace + " & ";
    result += "Assigned Stake High Counselor \\\\\n";
    result += secondCounselor.firstname.replace("&", "\\&") + " " + secondCounselor.lastname + " & ";
    //result += hspace + " & ";
    result += highCounselor.firstname.replace("&", "\\&") + " " + highCounselor.lastname + " \\\\\n";
    result += secondCounselor.phone + " & ";
    //result += hspace + " & ";
    result += highCounselor.phone + " \\\\\n";
    result += secondCounselor.email + " & ";
    //result += hspace + " & ";
    result += highCounselor.email + " \\\\\n";
    result += secondCounselor.address.split(";")[0] + " & ";
    //result += hspace + " & ";
    result += highCounselor.address.split(";")[0] + " \\\\\n";
    result += secondCounselor.address.split(";")[1] + " & ";
    //result += hspace + " & ";
    result += highCounselor.address.split(";")[1] + " \\\\\n";

    result += "\\end{tabular}\n";
    result += "\\end{center}\n"
    result += "\\renewcommand{\\picscale}{.7}\n";
    result += "\\renewcommand{\\arraystretch}{1.75}\n";
    return result;
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

    if(wardClerk){
        result += "\\setlength{\\tabcolsep}{5pt}\n";
        result += "\\begin{tabular}{c c}\n";
        
        result += "\\multirow{4}{*}{\\includegraphics[width=10cm]{../photos/" + wardClerk._id + ".jpg}}\n";

        result += "& \\vspace{2cm} \\\\\n";
        //result += "\\begin{Large}\n"
        result += "& \\Large " + wardClerk.firstname.replace("&", "\\&") + " " + wardClerk.lastname + " \\\\\n";
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
	result += "\\textbf{\\Large Winter Semester 2020}\n";
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