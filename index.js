const express = require("express");
const path = require("path");
const axios = require("axios");
const app = express();
const port = process.env.PORT || 3001;

app.set("view engine", "ejs");
//to access the view files from any directory
app.set("views", path.join(__dirname, "/views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

const searchURL = "https://www.cheapshark.com/api/1.0/games?title=";

const dealsURL = "https://www.cheapshark.com/api/1.0/games?id=";
const storesURL = "https://www.cheapshark.com/api/1.0/stores";

const imageURL =
  "https://api.cognitive.microsoft.com/bing/v7.0/images/search/?minheight=250&minwidth=250&q=";
const subscriptionKey = process.env.SECRET;

app.use (function (req, res, next) {
  if (req.get('X-Forwarded-Proto')=='https' || req.hostname == 'localhost') {
          // if https request
          next();
  } else {
          // if http request, redirect to https
          res.redirect('https://' + req.headers.host + req.url);
  }
});

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/results", function (req, res) {
  let searchKeyword;
  const titles = [];
  const cheapest = [];
  const images = [];
  const gameID = [];
  searchKeyword = req.query.game_title;
  titles.length = 0;
  cheapest.length = 0;
  images.length = 0;
  gameID.length = 0;
  axios
    .get(searchURL + searchKeyword)
    .then(function (response) {
      // handle success
      for (let i = 0; i < response.data.length; ++i) {
        titles.push(response.data[i]["external"]);
        cheapest.push(response.data[i]["cheapest"]);
        images.push(response.data[i]["thumb"]);
        gameID.push(response.data[i]["gameID"]);
      }
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .finally(function () {
      res.render("results", {
        searchKeyword: searchKeyword,
        titles: titles,
        lowestPrice: cheapest,
        image: images,
        gameID: gameID,
      });
    });
  
});

app.get("/deals/:id", function (req, res) {
  let image;
  let id;
  let selectedTitle;
  let cheapestPriceEver;
  let deals = [];
  let storeID;
  let dealID;
  let price;
  let retailPrice;
  let savings;
  let storeName;
  id = req.params.id;
  deals.length = 0;
  selectedTitle = "";
  axios
    .all([axios.get(dealsURL + id), axios.get(storesURL)])
    .then(
      axios.spread((responseDeals, responseStore) => {
        selectedTitle = responseDeals.data.info.title;
        cheapestPriceEver = responseDeals.data.cheapestPriceEver.price;
        retailPrice = responseDeals.data["deals"][0]["retailPrice"];
        for (let i = 0; i < responseDeals.data.deals.length; ++i) {
          storeID = responseDeals.data["deals"][i]["storeID"];
          dealID = responseDeals.data["deals"][i]["dealID"];
          price = responseDeals.data["deals"][i]["price"];
          savings = responseDeals.data["deals"][i]["savings"];
          storeName = responseStore.data[storeID - 1]["storeName"];
          deals.push({
            storeID: storeID,
            dealID: dealID,
            currentPrice: price,
            retailPrice: retailPrice,
            savings: savings,
            storeName: storeName,
          });
        }
      })
    )
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .finally(function () {
      // always executed
      axios
        .get(imageURL + encodeURIComponent(selectedTitle + "PC game"), {
          headers: {
            "Ocp-Apim-Subscription-Key": subscriptionKey,
          },
        })
        .then((responseImage) => {
          image = responseImage.data.value[0].thumbnailUrl;
        })
        .catch(function (error) {
          console.log(error);
        })
        .finally(function () {
          res.render("deals", {
            image: image,
            selectedTitle: selectedTitle,
            retailPrice: retailPrice,
            cheapestPriceEver: cheapestPriceEver,
            deals: deals,
          });
        });
    });
});

app.get("*", function (req, res) {
  res.render("404");
});

app.listen(port, function (req, res) {
  console.log(`Server has started on ${port}!`);
});
