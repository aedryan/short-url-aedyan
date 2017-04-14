const path = require("path");
const express = require('express');
const auth = require("./auth.js");
const dbUrl = "mongodb://" + auth.username + ":" + auth.password + "@ds161190.mlab.com:61190/heroku_b3ztxlbp"
const mongo = require("mongodb").MongoClient;
const app = express();

app.set('port', (process.env.PORT || 5000));
app.use('/favicon.ico', express.static("favicon.ico"));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/:url', (req, res) => {
    mongo.connect(dbUrl, (err, db) => {
        if (err) {
            throw err;
        } else {
            db.collection("urls", (err, urls) => {
                if (err) {
                    throw err;
                } else {
                    const url = urls.find({
                        shortUrl: {
                            $eq: req.params.url
                        }
                    }).toArray((err, arr) => {
                        if (err) {
                            throw err;
                        } else {
                            if (arr.length > 0) {
                                const location = arr.shift().longUrl;

                                res.redirect(location);
                            } else {
                                res.json({error: req.params.url + " not found."});
                            }
                        }
                    });
                }
            });
        }

        db.close();
    });
});

app.get(/\/short\/.*/, (req, res) => {
    const param = req.url.replace(/\/short\//, '')

    if (!/(https?|ftp):\/\/[^\s/$.?#].[^\s]*/.test(param)) {
        res.json({error: 'Bad URL', url: param});
    } else {
        mongo.connect(dbUrl, (err, db) => {
            if (err) {
                throw err;
            } else {
                db.collection("urls", (err, urls) => {
                    if (err) {
                        throw err;
                    } else {
                        const newShort = makeNewShort(urls);

                        urls.insert(newUrlDocument(newShort, param), (err, result) => {
                            if (err) {
                                throw err;
                            } else {
                                res.json({original: param, shortened: req.protocol + "://" + req.headers.host + "/" + newShort});
                                console.log("Inserted " + result.insertedCount + " new document");
                            }
                        });
                    }
                });
            }

            db.close();
        });
    }
});

app.listen(app.get('port'), () => {
    console.log("App is running", app.get('port'));
});

function newUrlDocument(short, long) {
    return {
        shortUrl: short,
        longUrl: long
    }
}

function makeNewShort(collection) {
    const newShort = makeShort();

    if (collection.count({ shortUrl: { $eq: newShort } }) > 0) {
        return checkExists(collection);
    } else {
        return newShort;
    }
}

function makeShort(){
    let text = "";
    let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let i = 0;

    for (i; i < 4; i++) {
        text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return text;
}