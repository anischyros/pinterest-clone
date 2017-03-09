var consumerKey = "981l4yuhMftitpC0boHc30atz";
var consumerSecret = "cFwvab1fDazkRLh15Q4crR9PWd4rAj2kub7dTurSyqUW4fFH2v";

var fs = require("fs");
var express = require("express");
var twitterAPI = require("node-twitter-api");
var cookieParser = require("cookie-parser");
var cookieSession = require("cookie-session");
var ejs = require("ejs");
var mongo = require("mongodb");
var ObjectId = mongo.ObjectId;
var mongoClient = mongo.MongoClient;
var app = express();

// Set up cookies
app.use(cookieParser("$0ph13"));
app.use(cookieSession({
    name: "session",
    keys: ["$0ph13k177y3v1l"],
    maxAge: 24 * 60 * 60 * 1000
}));

// Initialize Twitter OAUTH API
var twitter = new twitterAPI(
{
	consumerKey: consumerKey,
	consumerSecret: consumerSecret,
	callback: "http://localhost:8080/logged-in"
});

var _requestTokenSecret;
var usersColl, picturesColl;

mongoClient.connect("mongodb://localhost/pinterest-clone",
	function(err, connection)
{
	initializeDatabaseCollections(connection);

	app.get("/", doShowIndex);
	app.get("/logged-in", function(request, response)
	{
		fs.createReadStream("logged-in.html", "utf-8").pipe(response);
	});
	app.get("/ViewMyPictures", doViewMyPictures);
	app.get("/logic.js", function(request, response)
	{
		fs.createReadStream("./client/logic.js", "utf-8").pipe(response);
	});
	app.get("/main.css", function(request, response)
	{
		fs.createReadStream("./css/main.css", "utf-8").pipe(response);
	});
	app.get("/noimage.png", function(request, response)
	{
		fs.createReadStream("./images/noimage.png").pipe(response);
	});
	
	app.get("/request-token", doRequestToken);
	app.get("/access-token", doAccessToken);
	app.get("/logout", doLogout);
	app.get("/AddPicture", doAddPicture);
	app.get("/RemovePicture", doRemovePicture);
	
	app.listen(8080);
	console.log("Listening to port 8080");
})

function initializeDatabaseCollections(db)
{
	db.collection("users", function(err, collection)
	{
		usersColl = collection;
		db.collection("pictures", function(err, collection)
		{
			picturesColl = collection;
		});
	});
}

function doShowIndex(request, response)
{
	picturesColl.find(function(err, pictures)
	{
		var list = [];
		pictures.each(function(err, picture)
		{
			if (picture)
				list.push(picture);
			else
			{
				var template = fs.readFileSync("./ejs/index.ejs", "utf-8");
				response.end(ejs.render(template,
				{
					loggedIn: request.session.loggedIn,
					twitter_id: request.session.twitter_id,
					name: request.session.name,
					pictures: list
				}));
			}
		});
	});
}

function doViewMyPictures(request, response)
{
	picturesColl.find({ twitter_id: request.session.twitter_id },
		function(err, pictures)
	{
		var list = [];
		pictures.each(function(err, picture)
		{
			if (picture)
				list.push(picture);
			else
			{
				var template = fs.readFileSync("./ejs/MyPictures.ejs", "utf-8");
				response.end(ejs.render(template,
				{
					loggedIn: request.session.loggedIn,
					twitter_id: request.session.twitter_id,
					name: request.session.name,
					pictures: list
				}));
			}
		});
	});
}

function doRequestToken(request, response)
{
	twitter.getRequestToken(function(error, requestToken, requestTokenSecret,
		results)
	{
		if (error)
			response.status(500).send(err);
		else
		{
			_requestTokenSecret = requestTokenSecret;
			response.redirect(
				"https://api.twitter.com/oauth/authenticate?oauth_token=" + 
				requestToken);
		}
	});
}

function doAccessToken(request, response)
{
	var requestToken = request.query.oauth_token;
	var verifier = request.query.oauth_verifier;

	twitter.getAccessToken(requestToken, _requestTokenSecret, verifier,
		function(error, accessToken, accessTokenSecret)
	{
		if (error)
			response.status(500).send(error);
		else
		{
			twitter.verifyCredentials(accessToken, accessTokenSecret,
				function(error, user)
			{
				if (error)
					response.status(500).send(error);
				else
				{
					request.session.loggedIn = true;
					request.session.twitter_id = user.id_str;
					request.session.name = user.name;
					response.send(user);

					updateUsersCollection(user.id_str, user.name);
				}
			});
		}
	});
}

function updateUsersCollection(twitter_id, name)
{
	usersColl.findOne({ twitter_id: twitter_id }, function(err, item)
	{
		if (!item)
		{
			usersColl.save(
			{
				twitter_id: twitter_id,
				name: name
			});
		}
	});
}

function doLogout(request, response)
{
	request.session.loggedIn = false;
	request.session.twitter_id = undefined;
	request.session.name = undefined;
	response.writeHead(302, { Location: "/" });
	response.end();
}

function doAddPicture(request, response)
{
	picturesColl.save(
	{
		twitter_id: request.session.twitter_id,
		title: request.query.title,
		url: request.query.url,
		owner_name: request.session.name
	}, 
	function()
	{
		response.setHeader("Content-Type", "text/json");
		response.end(JSON.stringify({ success: true }));
	});
}

function doRemovePicture(request, response)
{
	picturesColl.remove({ _id: ObjectId(request.query.id) }, function(err)
	{
		response.setHeader("Content-Type", "text/json");
		response.end(JSON.stringify({ success: true }));
	});
}


