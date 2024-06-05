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

//유저 로그인 관리

//회원가입 관리
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

//로그인 관리
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

//회원 검색
app.get('/search', async(req, res)=>{
    const serachTerm = req.query.serachTerm

    const sql = 'SELECT * FROM user WHERE user_name LIKE ? OR user_id LIKE ?;'
    const values = [serachTerm, serachTerm]

    const users = await connection.query(sql, values)
    res.json(users)
})

//회원 탈퇴
app.delete('/account/:user_id', (req, res)=>{
    const user_id = req.params.user_id

    const sql = 'DELETE FROM user WHERE user_id = ?'
    const values = [user_id]

    connection.query(sql, values, (err, result) => {
        if(err){
            console.error(err)
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

//팔로우 관리

//팔로우
app.post('/follow', (req, res)=>{
    
    const{shooter_id, target_id} = req.body

    const checkFollowSql = 'SELECT * FROM follow where shooter_id = ? AND target_id = ?;'
    const checkFollowValues = [shooter_id, target_id]

    connection.query(checkFollowSql, checkFollowValues, (err, checkFollowResult) =>{
        if(err){
            console.error(err)
            return res.status(500).json({message: 'Follow action failed'})
        }
        
        if(checkFollowResult.length > 0){
            console.log('Already following')
            return res.status(400).json({message: 'Already Following'})
        }

        const sql = 'INSERT INTO follow (shooter_id, target_id) VALUES (?, ?);'
        const values = [shooter_id, target_id]

        connection.query(sql, values, (err, result) =>{
            if(err){
                console.error(err)
                return res.status(500).json({message: 'Follow action failed'})
            }

            console.log('Follow Successful')
            res.status(201).json({message: 'Follow Successful'})
        })
    })
})

//언팔로우
app.delete('follow/:shooter_id/:target_id', (req, res) =>{
    const shooter_id = req.params.shooter_id
    const target_id = req.params.target_id

    const sql = 'DELETE FROM follow WHERE shooter_id = ? AND target_id = ?;'
    const values = [shooter_id, target_id]

    connection.query(sql, values, (err, result)=>{
        if(err){
            console.error(err)
            return req.status(500).json({message: 'Unfollow failed'})
        }

        if(result.affectedRows === 0){
            console.log('Unfllow failed: Can\'t find target user')
            res.status(404).json({message: 'Unfollow failed'})
        }else{
            console.log('Unfollow successful')
            req.status(200).json({message: 'Unfollow Successful'})
        }
    })
})

//게시글 관리

//게시글 작성
app.post('/posts', (req, res) =>{
    const{ post_context, user_id } = req.body
    const sql = 'INSERT INTO post (post_context, user_id) VALUES (?, ?);'
    const values = [post_context, user_id]

    connection.query(sql, values, (err, result) =>{
        if (err){
            console.error(err)
            return res.status(500).json({message: 'post creation failed'})
        }

        res.status(201).json({message: 'Post created successfully', post_id: result.insertId})
    })
})

//게시글 목록 끌어오기
app.get('/posts', async(req, res)=>{
    const user_id = req.user.user_id

    const userPostSql = 'SELECT * FROM post WHERE user_id = ?;'
    const userPostValues = [user_id]

    const userPostResult = await connection.query(userPostSql, userPostValues)

    const followPostSql = 'SELECT p.* FROM post p INNER JOIN follow f ON f.shooter_id = ? AND f.target_id = p.user_id'
    const followPostValues = [user_id]
    
    const followPostResult = await connection.query(followPostSql, followPostValues)
    const allPost = [...userPostResult, ...followPostResult]

    allPost.sort((post1, post2) => post2.created_at - post1.created_at)
    res.json(allPost)
})

// 게시글 삭제
app.delete('/posts/:post_id', (req, res) => {
    const post_id = parseInt(req.params.post_id)
    const sql = 'DELETE FROM post WHERE post_id = ?;'
    const values = [post_id]

    connectionl.query(sql, values, (err, result) => {
        if(err){
            console.error(err)
            return res.status(500).json({message: 'post deletion failed'})
        }

        if(result.affectedRows === 0){
            console.log('post deletion failed: post not found')
            res.status(404).json({message: 'post deletion failed'})
        }else{
            console.log('post deleted successfully')
            res.status(200).json({message: 'post deleted successfully'})
        }
    })
})
app.listen(port)