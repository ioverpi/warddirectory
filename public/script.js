var app = new Vue({
    el: "#app",
    data: {
        wardName: "",
        address: "",
        showFormUsername: false,
        showFormPassword: false,
        showPhotoEditor: false,
        user: null,
        username: "",
        password: "",
        error: "",
        message: "",
        addedFirstname: "",
        addedLastname: "",
        addedEmail: "",
        addedPhone: "",
        //addedApt: "",
        editedFirstname: "",
        editedLastname: "",
        editedEmail: "",
        editedPhone: "",
        permissionLevel: 0,
        //editedApt: "",
        members: {},
        memberSubset: [],
        editId: "",
        addId: "",
        showAddTile: false,
        memberId: "",
        reloadImage: 0,
        apartments: [],
        currApt: "",
        currMember: {},
        callings: {},
        callingField: "",
        plainPhoto: null,
        hiddenMember: false,
        oldBooklets: [],
        batchData: "",
        showBatchForm: false,
        bookletType: "byapartment",
        bookletUpdate: 0
    },
    async created(){
        await this.getUser();
        if(this.user){
            if(this.user.permissions > 2) this.getOldBooklets();
            this.getApartmentList();
            this.getWardName();
            this.getMembers();
        //this.getCallings();
        }
    },
    computed: {
        byapartment: function(){
            return {
                current: this.bookletType == "byapartment"
            };
        },
        alphabetical: function(){
            return {
                current: this.bookletType == "alphabetical"
            };
        }
    },
    methods: {
        getApartment(aptnumber){
            var arr = [];
            for(member in this.members){
                if(this.members[member].apt == aptnumber){
                    arr.push(this.members[member]);
                }
            }
            return arr;
            // return this.members.filter(function(testApt){
            //     return testApt == aptnumber;
            // });
        },
        toggleTable(aptnumber, event){
            this.currApt = aptnumber;
            event.target.scrollIntoView();
        },
        filterMembers(aptnumber){
            this.currApt = aptnumber;
            this.memberSubset = this.members.filter(m => m.apt == aptnumber);
        },
        async showLeadership(){
            this.currApt = "leadership";
            this.memberSubset = null;
            await this.getCallings();
        },
        showBishopric(){
            this.currApt = "Bishopric";
            //Something...
        },
        showAddButton(){
            if(!this.currApt || this.currApt == "leadership"){
                return false;
            }
            if(this.user != null){
                if(this.user.permissions > 0) {
                    return true;
                }
            }
            return false;
        },
        async getApartmentList(){
            try{
                let response = await axios.get("/api/info/apartments");
                this.apartments = response.data.apartments.filter(m => m != "Bishopric");
            } catch(error){
                console.log(error);
            }
        },
        async getCallings(){
            try{
                let response = await axios.get("/api/info/callings");
                this.callings = response.data.callings;
                for(member in this.members){
                    if(this.members[member].calling){
                        let temp = this.members[member].calling.split(";");
                        this.callings[temp[0]][temp[1]] = this.members[member];
                    }
                }
            } catch(error){
                console.log(error);
            }
        },
        async getWardName(){
            try{
                let response = await axios.get("/api/info/name");
                this.wardName = response.data.name;
            } catch(error){
                console.log(error);
            }
        },
        async getMembers(){
            try{
                let response = await axios.get("/api/members");
                this.members = response.data;
                this.filterMembers(this.currApt);
            } catch(error){
                console.log(error);
            }
        },
        loadFile(event) {
            this.plainPhoto = event.target.files[0];
        },
        async addMember(apartment){
            try{
                let response = await axios.post("/api/members", {
                    firstname: this.addedFirstname,
                    lastname: this.addedLastname,
                    email: this.addedEmail,
                    phone: this.addedPhone,
                    apt: apartment
                });
                //this.tempMember = response.data;
                this.addedFirstname = "";
                this.addedLastname = "";
                this.addedEmail = "";
                this.addedPhone = "";
                //this.addedApt = "";
                this.addId = "";
                if(apartment != "Bishopric"){
                    this.editId = response.data._id;
                    this.togglePhotoEditor(0);
                } else {
                    if(this.plainPhoto){
                        let formData = new FormData();
                        formData.append("photo", this.plainPhoto, response.data._id + ".jpg");
                        formData.append("photoType", "leadership");
                        formData.append("id", response.data._id);
                        /*let response = */await axios.post("/api/photos", formData, {
                            headers: {"Content-Type": "multipart/form-data"}
                        });
                    }
                    this.getMembers();
                }
                this.toggleAddField();
                //this.getMembers();
            } catch(error){
                console.log(error);
            }
        },
        async addBatch(){
            try{
                let repsonse = axios.post("/api/members/batch", {
                    data: JSON.parse(this.batchData)
                });
                this.toggleBatchForm();
                this.getMembers()
            } catch(error){
                console.log(error);
            }
        },
        toggleBatchForm(){
            this.batchData = `
javascript: (function () { 
    var jsCode = document.createElement('script'); 
    jsCode.setAttribute('src', 'https://warddirectory.org/exportdata.js');                  
    document.body.appendChild(jsCode); 
    }());
`;
            this.showBatchForm = !this.showBatchForm
        },
        showAddField(apartment){
            this.addId = apartment;
        },
        toggleAddField() {
            this.plainPhoto = null; //Reset the photo for Bishopric members. 
            this.showAddTile = !this.showAddTile;
        },
        async editMember(member){
            if(this.user){
                this.editId = member._id;
                this.editedFirstname = member.firstname;
                this.editedLastname = member.lastname;
                this.editedEmail = member.email;
                this.editedPhone = member.phone;
                this.editedApt = member.apt;
                this.permissionLevel = member.permissions;
                this.address = member.address?member.address:"";
                this.hiddenMember = member.hidden?member.hidden:false;
            }else{
                this.toggleForm();
            }
        },
        async updateMember(member){
            try{
                let response = await axios.post("/api/members/update", {
                    firstname: this.editedFirstname,
                    lastname: this.editedLastname,
                    email: this.editedEmail,
                    phone: this.editedPhone,
                    apt: this.editedApt,
                    id: member._id,
                    address: this.address
                })
                this.editedFirstname = "";
                this.editedLastname = "";
                this.editedEmail = "";
                this.editedPhone = "";
                this.editedApt = "";
                this.editId = "";
                this.address = "";
                if(this.plainPhoto){
                    let formData = new FormData();
                    formData.append("photo", this.plainPhoto, response.data._id + ".jpg");
                    formData.append("photoType", "leadership");
                    formData.append("id", response.data._id);
                    /*let response = */await axios.post("/api/photos", formData, {
                        headers: {"Content-Type": "multipart/form-data"}
                    });
                }
                this.getMembers();
            } catch(error){
                this.toggleForm();
                console.log(error);
            }
        },
        async deleteMember(member){
            try{
                if(member.photo > 0) {
                    let otherResponse = await axios.delete("/api/photos/" + member._id);
                }
                let response = await axios.delete("/api/members/" + member._id);
                this.getMembers();
            } catch(error){
                //this.toggleForm();
                console.log(error);
            }
        },
        async changePermissions(member){
            try{
                let response = await axios.post("/api/members/permissions", {
                    id: member._id,
                    permissions: this.permissionLevel
                });
                this.editId = "";
                this.getMembers();
            } catch(error){
                console.log(error);
            }
        },
        hasPermissions(member){
            return (this.user && this.user.permissions > 1 && member.permissions < this.user.permissions);
        },
        async changeHiddenState(member){
            try{
                await axios.post("/api/members/hidden", {
                    id: member._id,
                    hidden: this.hiddenMember
                });
                this.editId = "";
                this.getMembers();
            } catch(error){
                console.log(error);
            }
        },
        toggleForm(){
            this.error = "";
            this.message = "";
            this.username = "";
            this.password = "";
            this.showFormUsername = !this.showFormUsername;
        },
        closeForm(){
            this.error = "";
            this.message = "";
            this.username = "";
            this.password = "";
            this.showFormUsername = false;
            this.showFormPassword = false;
        },
        backForm(){
            this.showFormUsername = true;
            this.showFormPassword = false;
        },
        async togglePhotoEditor(hasPhoto){
            //Something...
            this.showPhotoEditor = !this.showPhotoEditor;
            /* Edit this in the future if needed. 
            if(hasPhoto > 0){
                setTimeout(function(){//Edit this in the future!
                    init();
                    loadImage("/photos/" + app.editId + "_original.jpg");
                }, 300);
                
                //console.log
                //let respose = await axios.get("/photos/" + this.editId + "_original.jpg");
                //console.log(response);
            }
            */
            if(!this.showPhotoEditor){
                this.getMembers();
            }
        },
        /*
        async register(){
            this.error = "";
            try{
                let response  = await axios.post("/api/users", {
                    username: this.username,
                    password: this.password
                });
                this.user = response.data;
                this.toggleForm();
            } catch(error){
                this.error = error.response.data.message;
            }
        },
        */
        async forgotPassword(){
            this.error = "";
            try{
                let response = await axios.post("/api/users/forgot_password", {
                    email: this.username
                });
                this.message = response.data.message;
            } catch(error){
                this.error = error.response.data.message;
            }
        },
        async verifyUsername(){
            this.error = "";
            this.message = "";
            
            try{
                let response = await axios.post("/api/users/verify_username", {
                    email: this.username
                });
                if(response.data.message) {
                    this.showFormUsername = false;
                    this.showFormPassword = true;
                    this.message = response.data.message;
                }
            } catch(error){
                this.error = error.response.data.message;
            }
        },
        async login(){
            this.error = "";
            try{
                let response = await axios.post("/api/users/login", {
                    email: this.username,
                    password: this.password
                });
                if(response.data.message) {
                    this.message = response.data.message;
                    return;
                }
                this.user = response.data;
                if(this.user.permissions > 2) this.getOldBooklets();
                this.getApartmentList();
                this.getWardName();
                this.getMembers();
                this.closeForm();
            } catch(error){
                this.error = error.response.data.message;
            }
        },
        async logout(){
            try{
                let response = await axios.delete("/api/users");
                this.user = null;
                this.memberSubset = null;
                this.members = null;
                this.apartments = null;
                this.currApt = null;
                this.callings = null;
                this.wardName = "";
                //this.getMembers(); //Do something different.
            } catch(error){
                //Party!
            }
        },
        async getUser(){
            try{
                let response = await axios.get("/api/users");
                this.user = response.data;
            } catch(error){
                //Party more!
            }
        },
        loadImage(){
            init();
            var file = this.$refs.file.files[0];
            if(file){
                var reader = new FileReader();
                reader.addEventListener("load", function(e){
                    loadImage(e.target.result);
                }, false);
                reader.readAsDataURL(file);
            }
        },
        async saveImage(){
            try{
                //console.log("check 0");
                /* I don't think we actually need this code at this instance of time. Maybe we do. 
                let formData = new FormData();
                if(this.$refs.file.files.length > 0){
                    formData.append("photo", this.$refs.file.files[0], this.editId + "_original.jpg");
                    formData.append("photoType", "original");
                    formData.append("id", this.editId);
                    await axios.post("/api/photos", formData, {
                        headers: {"Content-Type": "multipart/form-data"}
                    });
                }
                */
                //console.log("check 1");
                let imageBlob = await saveImageBlob();
                formData = new FormData();
                formData.append("photo", imageBlob, this.editId + ".jpg");
                formData.append("photoType", "cropped");
                formData.append("id", this.editId);
                /*let response = */await axios.post("/api/photos", formData, {
                    headers: {"Content-Type": "multipart/form-data"}
                });
                //console.log("check 2");
                this.editId = "";
                this.getMembers();
                this.togglePhotoEditor(0);
            } catch(error){
                console.log(error);
            }
        },
        photoPath(member){
            if(member.photo > 0) return member._id;
            return "Jim_Apple"; //Change this
        },
        photoAlt(first, last){
            return first + " " + last;
        },
        async updateCalling(memberId, newCalling){
            try{
                let response = await axios.post("/api/members/calling", {
                    id: memberId,
                    calling: newCalling
                });
                let temp = newCalling.split(";");
                //this.callings[temp[0]][temp[1]] = member;
                await this.getMembers();
                this.getCallings();
                this.editId = "";
                this.callingField = "";
                
            } catch(error){
                console.log(error);
            }
        },
        async generateBooklet(){
            try{
                let response = await axios.get(`/api/booklet/generate?type=${this.bookletType}`);
                if(response.status == 200) {
                    alert("Successfully generated the booklet!") //Make something fancier here. :)
                } 
            } catch(error){
                alert("Failed to generated booklet!");
                console.log(error);
            }
        },
        async getOldBooklets(){
            try{
                let response = await axios.get(`/api/booklet/old?type=${this.bookletType}`);
                this.oldBooklets = response.data.booklets;
            } catch(error){
                console.log(error);
            }
        },
        toggleBookletType(){
            this.bookletType = this.bookletType == "byapartment" ? "alphabetical" : "byapartment";
            this.getOldBooklets();
        }
    }
})

window.onscroll = function() {
    document.getElementById("leftMenu").style.paddingTop = (window.pageYOffset > 100)? 0 : (100 - window.pageYOffset) + "px";
    document.getElementById("rightMenu").style.paddingTop = (window.pageYOffset > 100)? 0 : (100 - window.pageYOffset) + "px";
}