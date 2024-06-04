const express = require('express')
const bodyParser = require('body-parser')

const app = express()
const port = 3000

app.use(bodyParser.json())

const mysql = require('mysql')
const connection = mysql.createConnection({
    host: 'localhost',
    user:'testuser',
    password: 'testuser',
    database: 'nodejs-sql'
})

connection.connect((err)=>{
    if(err) throw err;
    console.log('Connected to MySQL')
})

app.post('/register', (req, res)=>{
    const {user_id, user_pw, user_name} = req.body
    const sql = 'INSERT INTO user (user_id, user_pw, user_name) VALUES (?, ?, ?);'
    const values = [user_id, user_pw, user_name]

    connection.query(sql, values, (err, result)=>{
        if(err){
            console.error(err);
            return res.status(500).json({message: 'registration failed'})
        }
        res.status(201).json({message: 'Registration success'})
    })
})

app.post('/login', (req, res)=>{
    const {user_id, user_pw} = req.body;
    const sql = 'SELECT * FROM user WHERE user_id = ? AND user_pw = ?'
    const values = [user_id, user_pw]

    connection.query(sql, values, (err, result) =>{
        if(err){
            console.error(err);
            return res.status(500).json({message:'login failed'})
        }

        if(result.length === 0){
            console.log('login failed')
            res.status(200).json({message: 'login failed', code:2})
        }else{
            console.log('login success')
            res.status(200).json({message: 'login success', code:1})
        }
    })
})

app.delete('/account/:user_id', (req, res)=>{
    const user_id = req.params.user_id

    const sql = 'DELETE FROM user WHERE user_id = ?'
    const values = [user_id]

    connection.query(sql, values, (err, result) => {
        if(err){
            console.error(err);
            return res.status(500).json({message: 'account deletion failed'})
        }

        if(result.affectedRows === 0){
            console.log('account deletion failed: User not found')
            res.status(404).json({message: 'account deletion failed', code: 2})
        }else{
            res.status(200).json({message: 'account deletion success', code: 1}, )
        }
    })
})

app.listen(port)