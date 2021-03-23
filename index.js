var express = require('express');
var app     = express();
var port    = 3000;

var jwt = require('jsonwebtoken');
var crypto = require('crypto');


const multer=require('multer')
const path= require('path')
// var bodyParser = require('body-parser')
// const bcrypt = require('bcrypt')
// var jsonParser = bodyParser.json()

// comparePassword = (_password, password) => {
//   return new Promise((resolve, reject) => {
//     bcrypt.compare(_password, password, (err, isMatch) => {
//       if (!err) resolve(isMatch)
//       else reject(err)
//     })
//   })
// }


const Pool = require('pg').Pool
const pool = new Pool({
  // user: "Austin",
  user: "postgres",
  password: "latte-a1",
  database: "db",
  hostname: "localhost",
  port: 5432,
})

const KEY = "awesome austin ceo!!!";



app.use('/uploads', express.static(__dirname +'/uploads'));
var storage = multer.diskStorage({
   destination: function (req, file, cb) {
     cb(null, 'uploads')
   },
   filename: function (req, file, cb) {
     cb(null, new Date().toISOString()+file.originalname)
   }
 })
  
 var upload = multer({ storage: storage })
 app.post('/upload', upload.single('myFile'), async(req, res, next) => {
   const file = req.file
  //  if (!file) {
  //    const error = new Error('Please upload a file')
  //    error.httpStatusCode = 400
  //    return next("hey error")
  //  }
     
     console.log(file.path, req.body['userid'])
    //  const imagepost= new model({
    //    image: file.path
    //  })
    //  const savedimage= await imagepost.save()
    const results = (await pool.query(`UPDATE "USER" SET image = $1 WHERE id = $2 RETURNING id, image`, [file.path, req.body.userid])).rows;
    res.json(file.path)
   
 })

 app.post('/image', express.urlencoded(),async(req, res)=>{
  const { image }= (await pool.query(`SELECT image FROM "USER" WHERE id = $1`, [req.body.userid])).rows[0];
  if(image){
    res.send(image)

  }else{
    res.send('no photo')

  }
  
 })


app.post('/signup', express.urlencoded(), function(req, res)  {
  // in a production environment you would ideally add salt and store that in the database as well
  // or even use bcrypt instead of sha256. No need for external libs with sha256 though
  var password = crypto.createHash('sha256').update(req.body.password).digest('hex');
  pool.query(`SELECT * FROM "USER" WHERE name = $1`, [req.body.username], async function(err, result) {
    if( result.rows.length > 0 ) {
      console.error("can't create user " + req.body.username);
      res.status(409);
      res.send("An user with that username already exists");
    } else {
      console.log("Can create user " + req.body.username);
      await pool.query('INSERT INTO "USER" (name, password) VALUES ($1, $2)', [req.body.username, password]);
      res.status(201);
      res.send("Success");
    }
  });
});

app.post('/login', express.urlencoded(), function(req, res) {
  console.log(req.body.username + " attempted login");
  var password = crypto.createHash('sha256').update(req.body.password).digest('hex');
  pool.query(`SELECT * FROM "USER" WHERE (name, password) = ($1, $2)`, [req.body.username, password], function(err, result) {
    if( result.rows.length == 1 ) {
      var payload = {
        username: req.body.username,
        userid: result.rows[0].id,
      };

      var token = jwt.sign(payload, KEY, {algorithm: 'HS256', expiresIn: "365d"});
      console.log("Success");
      res.send(token);
    } else {
      console.error("Failure");
      res.status(401)
      res.send("There's no user matching that");
    }
  });
});


app.post('/user', express.urlencoded(), function(req, res) {
  var str = req.get('Authorization');
  try {
    jwt.verify(str, KEY, {algorithm: 'HS256'});
    pool.query(`SELECT id, name, location, token, cnt FROM "USER" WHERE id = $1`, [req.body.userid], function(err, result) {
      if( result.rows.length === 1 ) {
        console.log("Can get user " + req.body.userid);
        res.status(201);
        console.log("Success");
        res.send(result.rows[0]);
      } else {
        console.error("can't get user " + req.body.userid);
        res.status(409);
        res.send("An user with that userid not found");
      }
    });
  } catch {
    res.status(401);
    res.send("Bad Token");
  }

});



app.post('/userLocation', express.urlencoded(), async function(req, res) {
  var str = req.get('Authorization');
  try {
    jwt.verify(str, KEY, {algorithm: 'HS256'});
    const results = (await pool.query(`UPDATE "USER" SET location = geography (ST_Point($1, $2)) WHERE id = $3 RETURNING id, location`, [req.body.long, req.body.lat, req.body.userid])).rows;
    // const results = (await pool.query(`UPDATE "USER" SET location = 'SRID=4326;POINT(121.2561563 24.9766524)' WHERE id = $3 RETURNING id, location`, [parseFloat(req.body.long), parseFloat(req.body.lat), req.body.userid])).rows;
    console.log("Can update user location " + req.body.userid, results);
    return res.send(results);
  } catch {
    res.status(401);
    res.send("Bad Token");
  }

});


app.post('/userToken', express.urlencoded(),  async function (req, res) {
  var str = req.get('Authorization');
  try {
    jwt.verify(str, KEY, {algorithm: 'HS256'});
    const results = (await pool.query(`UPDATE "USER" SET token = $1 WHERE id = $2 RETURNING id, token`, [req.body.token, req.body.userid])).rows;
    console.log("Can update user token " + req.body.userid, results);
    return res.send(results);
  } catch {
    res.status(401);
    res.send("Bad Token");
  }

});


app.post('/userCount', express.urlencoded(),  async function (req, res) {
  var str = req.get('Authorization');
  try {
    jwt.verify(str, KEY, {algorithm: 'HS256'});
    const results = (await pool.query(`UPDATE "USER" SET cnt = cnt + 1 WHERE id = $1 RETURNING id, cnt`, [req.body.userid])).rows;
    console.log("Can update user count " + req.body.userid, results);
    return res.send(results);
  } catch {
    res.status(401);
    res.send("Bad Token");
  }

});

app.post('/chkDistance', express.urlencoded(),  async function (req, res) {
  var str = req.get('Authorization');
  try {
    jwt.verify(str, KEY, {algorithm: 'HS256'});
    var {followee} = (await pool.query(`SELECT followee FROM "FOLLOW" WHERE follower = $1 ORDER BY created_at DESC LIMIT 1`, [req.body.userid])).rows[0]
    const {st_distance} = (await pool.query(`SELECT ST_Distance(location, lag(location) over()) from "USER" where id = $1 or id = $2`, [req.body.userid, followee])).rows[1];
    console.log("Can check user distance " + req.body.userid, st_distance);
    const val = st_distance <= 100 ? true:false
    if(val === true){
      const {id, cnt} = (await pool.query(`UPDATE "USER" SET cnt = cnt + 1 WHERE id = $1 RETURNING id, cnt`, [followee])).rows[0];
    console.log("Can update user count " + id, cnt, val)
    }
    return res.send({data: val, followee: followee});
  } catch {
    res.status(401);
    res.send("Bad Token");
  }

});


app.post('/createFollow', express.urlencoded(),  async function (req, res) {
  var str = req.get('Authorization');
  try {
    jwt.verify(str, KEY, {algorithm: 'HS256'});
    const results = (await pool.query(`INSERT INTO "FOLLOW" (follower, followee) VALUES ($1, $2)`, [req.body.follower, req.body.followee])).rows;
    console.log("Can create user follow " + req.body.follower);
    return res.send(results);
  } catch {
    res.status(401);
    res.send("Bad Token");
  }

});






//================
app.get("/createUser/:name/:long/:lat/:token", async (req, res) => {
  console.log('==========')
  console.log(`/createUser/${req.params.name}/${req.params.long}/${req.params.lat}/${req.params.token}`)
  const results = (await pool.query(`INSERT INTO "USER" (name, location, token) VALUES ('${req.params.name}', 'SRID=4326;POINT(${req.params.long} ${req.params.lat})', '${req.params.token}') RETURNING id;`)).rows[0];
  console.log(results);
  return res.send(results);
});

app.get("/updateUserLocation/:id/:long/:lat", async (req, res) => {
  console.log('==========')
  console.log(`/updateUserLocation/${req.params.id.split('"').join('')}/${req.params.long}/${req.params.lat}`)
  const results = (await pool.query(`UPDATE "USER" SET location = 'SRID=4326;POINT(${req.params.long} ${req.params.lat})' WHERE id =  '${req.params.id.split('"').join('')}'::uuid;`)).rows;
  console.log(results);
  return res.send(results);
});

app.get("/updateUserCnt/:id", async (req, res) => {
  console.log('==========')
  console.log(`/updateUserCnt/${req.params.id}`)
  const results = (await pool.query(`UPDATE "USER" SET cnt = cnt + 1 WHERE id = '${req.params.id.split('"').join('')}'::uuid RETURNING id;`)).rows[0];
  console.log(results);
  return res.send(results);
});

app.get("/chkDis/:follower/:followee", async (req, res) => {
  console.log('==========')
  console.log(`/chkDis/${req.params.follower}/${req.params.followee}`)
  const results = (await pool.query(`SELECT ST_Distance(location, lag(location) over()) from "USER" where id = '${req.params.follower.split('"').join('')}'::uuid or id = '${req.params.followee.split('"').join('')}'::uuid;`)).rows[1];
  console.log(results);
  return res.send(results);
});



// app.get("/searchNearByFollower/:id/:long/:lat", async (req, res) => {
//   console.log(`/searchNearByFollower/${req.params.id}/${req.params.long}/${req.params.lat}`)
//   const results = (await pool.query(`SELECT * FROM "USER" u, "FOLLOW" f WHERE ST_DWithin ( location, geography (ST_Point(${req.params.long}, ${req.params.lat})), 10000) AND ${req.params.id} = f.followee;`)).rows;

//   return res.send(results);
// });

app.get("/createFollow/:follower/:followee", async (req, res) => {
  console.log('==========')
  console.log(`/createFollow/${req.params.follower}/${req.params.followee}`)
  const results = (await pool.query(`INSERT INTO "FOLLOW" (follower, followee) VALUES ('${req.params.follower.split('"').join('')}'::uuid, '${req.params.followee.split('"').join('')}'::uuid) RETURNING id;`)).rows;
  console.log(results);
  return res.send(results);
});


// app.get("/userName/:name", async (req, res) => {
//   console.log(`/userName/${req.params.name}`)
//   const results = (await pool.query(`SELECT * FROM "USER" WHERE name = '${req.params.name}';`)).rows[0];
//   return res.send(results);
// });

app.get("/userId/:id", async (req, res) => {
  console.log('==========')
  console.log(`/userId/${req.params.id}`)
  const results = (await pool.query(`SELECT * FROM "USER" WHERE id = $1`,[ req.params.id])).rows[0];
  console.log(results);
  return res.send(results);
});

app.get("/autocompleteUser/:term", async (req, res) => {
  console.log(`/autocompleteUser/${req.params.term}`)
  const results = (await pool.query(`SELECT * FROM "USER" WHERE word_similarity(name, '%${req.params.term}%') >= 0 ORDER BY word_similarity(name, '%${req.params.term}%') ASC;`)).rows;
  return res.send(results);
});







app.listen(port, () => {
  console.log(`App listening at http://66.228.52.222:${port}`)
})
