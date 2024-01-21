const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
const bcrypt = require('bcrypt')
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')
let db = null
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log('DB Error: ${e.message}')
    process.exit(1)
  }
}
app.post('/register/', async (req, res) => {
  const {username, name, password, gender, location} = req.body
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}';
  `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    if (password.length < 5) {
      res.status(400)
      res.send('Password is too short')
    } else {
      const createUserQuery = `
      INSERT INTO user (username, name, password, gender, location) 
      VALUES ('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}')`
      const dbResponse = await db.run(createUserQuery)
      const newUserId = dbResponse.lastID
      res.send('User created successfully')
    }
  } else {
    res.status(400).send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)

    if (isPasswordMatched) {
      response.send('Login success!')
    } else {
      response.status(400).send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (
    dbUser === undefined ||
    !(await bcrypt.compare(oldPassword, dbUser.password))
  ) {
    response.status(400).send('Invalid current password')
  } else if (newPassword.length < 5) {
    response.status(400).send('Password is too short')
  } else {
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    const updatePasswordQuery = `UPDATE user SET password = '${hashedNewPassword}' WHERE username = '${username}'`

    await db.run(updatePasswordQuery)
    response.send('Password updated')
  }
})
initializeDBAndServer()
module.exports = app
