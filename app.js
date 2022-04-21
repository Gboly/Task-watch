//jshint esversion:6

const express = require("express");
const mongoose = require("mongoose");
//const date = require(__dirname + "/date.js");
const _ = require("lodash");
require("dotenv").config();

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));

//const items = ["Buy Food", "Cook Food", "Eat Food"];
//const workItems = [];

async function run() {
    //connecting to mongoDB atlas instead of the normal local host
    await mongoose.connect("mongodb+srv://" + process.env.clusterName + ":" + process.env.clusterPass + "@cluster0.a8gp4.mongodb.net/todoDB?retryWrites=true&w=majority")
    console.log("successfully connected to mongoDB")
}

run().catch(console.dir);


    const todoSchema = {
        Name: String
    }

    const Item = mongoose.model("Item", todoSchema)
    const item1 = new Item({
        Name:"Welcome"
    })
    const item2 = new Item({
        Name: "Click "+" to add new item."
    })
    const item3 = new Item({
        Name: "Check box to delete item."
    })

const item = [item1, item2, item3];

const newListSchema = {
    Name: String,
    items:[todoSchema]
}

const List = mongoose.model("List", newListSchema);


app.get("/", async function(req, res) {

    //const day = date.getDate(); 

    

    try {

        let results = await Item.find()
        function check() {
            if (results.length === 0) {
                Item.insertMany(item);
                console.log("Successfully inserted " + results.length);
                results = item;
            }
        }
       
        await check(); 
        res.render("list", { listTitle: "Today", results });
        console.log("Successfully rendered " + results.length+ " documents");
    }
    catch (err) {
        console.log(err);
    }
    
});

app.post("/", async function(req, res){

    const newItem = req.body.newItem;
    const newList = req.body.list

    const addNewItem = new Item({
        Name: newItem,
    })

    if (newList === "Today") {
        
        await addNewItem.save();
        res.redirect("/");
    }
    else {
        const result = await List.findOne({ Name: newList })
        const embedResult = result.items
        //when you have an embedded collection within a document(i.e one-to-many relationship), and you want to update its content, instead of the model.updateOne/many in the normal document situation,
        //you should just push the new item into the embed field just like below. This isn't saved in the database yet but only as a javascript array.
        await embedResult.push(addNewItem);
        //saving that particular document again would not create another document but just update it in the database.
        result.save(() => res.redirect("/" + newList));
    }  
     
});

app.post("/delete", async function (req, res) {

    const trash = req.body.delete
    // I had to turn this into a string for easier comparison with embedItemString too.
    const trashString = trash.toString();
    const newList = req.body.page

    if (newList === "Today") {
        await Item.findOneAndDelete({ _id: trash });
        console.log("sucessfully deleted document with the id " + trash);
        res.redirect("/")
    }
    else {
        const result = await List.findOne({ Name: newList })
        let embedResult = result.items

        //embedResult.filter should actually be used here.
        //Actually, the correct way to delete from this array would have been to use the mongoDB $pull operator. 
        //List.findOneAndUpdate({Name: newList},{$pull:{items:{_id:trash}}})

        //This is another method of using the pull method.
        //List.findOne({
        //    name: nameOfList,
        //}, (err, success) => {
        //    if (!err) {
        //        success.items.pull({
        //            _id: itemtoDelete,
        //        });
        //        success.save();
        //        res.redirect("/" + nameOfList)
        //    }
        //})




        embedResult.forEach(async function (embedItem, index) {

            const embedItemId = embedItem._id;
            const embedItemIdString = embedItemId.toString();            
            
            if (embedItemIdString===trashString) {
                embedResult.splice(index, 1);
                await result.save();
                res.redirect("/" + newList);
                console.log("Successfully deleted document with the id " + embedItemId + " from the " + newList+" list.")
            }
        })
        
    }

})

app.get("/:newList", async function (req, res) {

    const page = _.capitalize(req.params.newList);

    //favicon.ico originally runs as a parameter based on this route format, so extracting the parameter just as above would extract the parameter i set and also facvicon.ico.
    //Therefore, all operations taken afterwards would be done for both my param and favicon.ico each.
    //in order to correct this, i add "<link rel="icon" href="data:,">" to my ejs header just so that the favicon is being run through another route which in this case is an empty/inexistent data folder.    
    try {
        let existenceCheck = await List.find({ Name: page, })
            async function addnewList() {

                if (existenceCheck.length === 0) {
                    const list = new List({
                        Name: page,
                        items: item
                    })
                    await list.save();
                    console.log("Created a new List : " + page)
                    existenceCheck = [list];
                }

            }

            await addnewList();            
            const result = existenceCheck[0]
            const embedResult = result.items
            res.render("list", { listTitle: page, results: embedResult });
            console.log("Successfully rendered " + embedResult.length + " documents from " + page + " list.");
        }

        catch (err) {
            console.log(err);
        }   
    
})




//app.get("/work", function(req,res){
//  res.render("list", {listTitle: "Work List", newListItems: workItems});
//});

app.get("/about", function(req, res){
  res.render("about");
});



let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function() {
  console.log("Server started on port 3000");
});
