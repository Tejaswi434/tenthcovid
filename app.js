const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
const authentication = (request, response, next) => {
  let jwtoken;
  const authead = request.headers["authorization"];
  if (authead !== undefined) {
    jwtoken = authead.split(" ")[1];
  }
  if (jwtoken === undefined) {
    response.status(400);
    response.send("Invalid authorisation");
  } else {
    jwt.verify(jwtoken, "myaccess", async (error, payload) => {
      if (error) {
        response.status(400);
        response.send("Invalid authorisation");
      } else {
        next();
      }
    });
  }
};
/*Register*/
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedpassword = await bcrypt.hash(password, 10);
  const insertingQuery = `insert into user(username, name, password, gender, location)
    values('${username}','${name}','${hashedpassword}','${gender}','${location}');`;
  console.log(password);
  await db.run(insertingQuery);
  response.status(200);

  response.send(`${password}`);
});

/*login*/
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const query = `select * from user where username='${username}';`;
  const database = await db.get(query);
  if (database === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordcheck = await bcrypt.compare(password, database.password);
    console.log(password);
    console.log(database.password);
    if (passwordcheck !== true) {
      response.status(400);
      response.send("Invalid password");
    } else {
      let payload = { username: username };
      let jwtToken = jwt.sign(payload, "myaccess");
      response.status(200);
      response.send({ jwtToken });
    }
  }
});

/*getting*/
app.get("/states/", authentication, async (request, response) => {
  const gettingbooks = `select state_id as stateId ,state_name as stateName,population as population from state;`;
  const data = await db.all(gettingbooks);
  response.send(data);
});
/*pariular*/
app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const gettingparticularbook = `select 
  state_id as stateId ,state_name as stateName,population as population from state where state_id='${stateId}';`;
  const data = await db.get(gettingparticularbook);
  response.send(data);
});
/*posting*/
app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const insertingofdata = `insert into district(district_name,state_id,cases,cured,active,deaths)
    values('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');`;
  await db.run(insertingofdata);
  response.send("District Successfully Added");
});
/*particular district*/
app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const gettingparticulardistrict = `select district_id as districtId,district_name as districtName,
state_id as stateId,cases,cures,active,deaths from district where district_id='${districtId}';`;
    const districtspecial = await db.get(gettingparticulardistrict);
    response.send(districtspecial);
  }
);
/*deleting*/
app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const particulardis = request.response;
    const deletingdis = `delete from district where district_id='${particulardis}';`;
    await db.run(deletingdis);
    response.send("District Removed");
  }
);
app.put("/districts/:districtId/", authentication, async () => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const changing = `update district set district_name='${districtName}',state_id='${stateId}',
  cases='${cases}',cured='${cured}',active='${active}',deaths='${deaths}' 
  where district_id='${districtId}';`;
  await db.run(changing);
  response.send("District Details Up");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const dbdetails = `select sum(cases) as totalCases, sum(cured) as totalCured,sum(active)as totalActive, sum(deaths)as totalDeaths
    from district where state_id='${stateId}';`;
  const change = await db.get(dbdetails);
  response.send({change
});
