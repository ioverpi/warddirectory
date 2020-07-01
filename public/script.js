var app = new Vue({
    el: "#app",
    data: {
        address: "",
        showForm: false,
        showPhotoEditor: false,
        user: null,
        username: "",
        password: "",
        error: "",
        addedFirstname: "",
        addedLastname: "",
        addedEmail: "",
        addedPhone: "",
        //addedApt: "",
        editedFirstname: "",
        editedLastname: "",
        editedEmail: "",
        editedPhone: "",
        //editedApt: "",
        members: {},
        editId: "",
        addId: "",
        memberId: "",
        reloadImage: 0,
        apartments: [],
        currApt: "",
        callings: {},
        callingField: ""//,
        //tempMember: {}
    },
    async created(){
        this.getUser();
        this.getApartmentList();
        await this.getMembers();
        this.getCallings();
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
        async getApartmentList(){
            try{
                let response = await axios.get("/api/members/variables/apartments");
                this.apartments = response.data.apartments;
            } catch(error){
                console.log(error);
            }
        },
        async getCallings(){
            try{
                let response = await axios.get("/api/members/variables/callings");
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
        async getMembers(){
            try{
                let response = await axios.get("/api/members");
                this.members = response.data;
            } catch(error){
                console.log(error);
            }
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
                    if(this.$refs.file2[0].files.length > 0){
                        let formData = new FormData();
                        formData.append("photo", this.$refs.file2[0].files[0], response.data._id + ".jpg");
                        formData.append("photoType", "leadership");
                        formData.append("id", response.data._id);
                        /*let response = */await axios.post("/api/photos", formData, {
                            headers: {"Content-Type": "multipart/form-data"}
                        });
                    }
                    this.getMembers();
                }
                //this.getMembers();
            } catch(error){
                console.log(error);
            }
        },
        showAddField(apartment){
            this.addId = apartment;
        },
        async editMember(member){
            if(this.user){
                this.editId = member._id;
                this.editedFirstname = member.firstname;
                this.editedLastname = member.lastname;
                this.editedEmail = member.email;
                this.editedPhone = member.phone;
                this.editedApt = member.apt;
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
                    id: member._id
                })
                this.editedFirstname = "";
                this.editedLastname = "";
                this.editedEmail = "";
                this.editedPhone = "";
                this.editedApt = "";
                this.editId = "";
                if(this.$refs.file2){
                    let formData = new FormData();
                    formData.append("photo", this.$refs.file2[0].files[0], response.data._id + ".jpg");
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
                this.toggleForm();
                console.log(error);
            }
        },
        toggleForm(){
            this.error = "";
            this.username = "";
            this.password = "";
            this.showForm = !this.showForm;
        },
        async togglePhotoEditor(hasPhoto){
            //Something...
            this.showPhotoEditor = !this.showPhotoEditor;
            if(hasPhoto > 0){
                setTimeout(function(){//Edit this in the future!
                    init();
                    loadImage("/photos/" + app.editId + "_original.jpg");
                }, 300);
                
                //console.log
                //let respose = await axios.get("/photos/" + this.editId + "_original.jpg");
                //console.log(response);
            }
            if(!this.showPhotoEditor){
                this.getMembers();
            }
        },
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
        async login(){
            this.error = "";
            try{
                let response = await axios.post("/api/users/login", {
                    username: this.username,
                    password: this.password
                });
                this.user = response.data;
                this.getMembers();
                this.toggleForm();
            } catch(error){
                this.error = error.response.data.message;
            }
        },
        async logout(){
            try{
                let response = await axios.delete("/api/users");
                this.user = null;
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
                let formData = new FormData();
                if(this.$refs.file.files.length > 0){
                    formData.append("photo", this.$refs.file.files[0], this.editId + "_original.jpg");
                    formData.append("photoType", "original");
                    formData.append("id", this.editId);
                    /*let response = */await axios.post("/api/photos", formData, {
                        headers: {"Content-Type": "multipart/form-data"}
                    });
                }
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
        async generateBooklet(){
            try{
                let response = axios.get("/api/booklet");
            } catch(error){
                //I need to think for what to put here as well. 
            }
        },
        async updateCalling(memberId, newCalling){
            try{
                let response = await axios.post("/api/members/calling", {
                    id: memberId,
                    calling: newCalling
                });
                let temp = newCalling.split(";");
                if(temp[0] == "Bishopric" || temp[1] == "Ward Clerk"){
                    await axios.post("/api/members/address", {
                        id: memberId,
                        address: this.address
                    });
                    this.address = "";
                }
                //this.callings[temp[0]][temp[1]] = member;
                await this.getMembers();
                this.getCallings();
                this.editId = "";
                this.callingField = "";
                
            } catch(error){
                console.log(error);
            }
        }
    }
})