
const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");

mongoose.set('strictQuery', true);
const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// here I am not using async function for connecting to mongoose since it is causing timeout error while inserting documents
mongoose.connect('mongodb://localhost:27017/todolistDB');

const itemSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemSchema);

const item1 = new Item({ name: "Welcome to ToDo list" });
const item2 = new Item({ name: "Use + to insert new items" });
const item3 = new Item({ name: "Use checkbox to delete existing items" });

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema]
});

const List = mongoose.model("list", listSchema);

app.get("/", function (req, res) {

  const day = date.getDate();

  Item.find(function (err, items) {
    if (items.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("Successfully added default items in DB!");
        }
      });
      res.redirect("/");
    }
    else {
      res.render("list", { listTitle: day, newListItems: items });
    }
  })

});

app.get("/:customListName", function (req, res) {
  const day = date.getDate();
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName }, function (err, foundList) {
    if (err) {
      console.log(err);
    }
    else {
      if (!foundList) {
        // Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });

        list.save();
        res.redirect("/" + customListName);
      } else {
        // show an existing list
        // console.log(foundList);
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    }
  });

});


app.post("/", function (req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  })

  const day = date.getDate();
  console.log(day);

  if (listName === day) {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }, function (err, foundList) {
      if (err) {
        console.log(err);
      }
      else {
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      }
    })
  }

});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;
  const day = date.getDate();

  if (listName === day) {
    Item.findByIdAndRemove(checkedItemId, function (err) {
      if (!err) {
        console.log("Successfully deleted checked item from database.");
        res.redirect("/");
      }
    })
  } else {
    List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } }, function (err, foundList) {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }

})

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
