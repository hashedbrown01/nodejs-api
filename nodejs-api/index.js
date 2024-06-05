const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const util = require('util');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'testuser',
    password: 'testuser',
    database: 'nodejs-sql'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

connection.query = util.promisify(connection.query);

//1. 회원관리

// 회원가입 관리
app.post('/register', async (req, res) => {
    const { user_id, user_pw, user_name } = req.body;
    const sql = 'INSERT INTO user (user_id, user_pw, user_name) VALUES (?, ?, ?);';
    const values = [user_id, user_pw, user_name];

    try {
        await connection.query(sql, values);
        res.status(201).json({ message: 'Registration success' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// 로그인 관리
app.post('/login', async (req, res) => {
    const { user_id, user_pw } = req.body;
    const sql = 'SELECT * FROM user WHERE user_id = ? AND user_pw = ?';
    const values = [user_id, user_pw];

    try {
        const result = await connection.query(sql, values);
        if (result.length === 0) {
            console.log('Login failed');
            res.status(200).json({ message: 'Login failed', code: 2 });
        } else {
            console.log('Login success');
            res.status(200).json({ message: 'Login success', code: 1 });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Login failed' });
    }
});

// 회원 검색
app.get('/search', async (req, res) => {
    const searchTerm = req.query.searchTerm;
    const sql = 'SELECT * FROM user WHERE user_name LIKE ? OR user_id LIKE ?;';
    const values = [`%${searchTerm}%`, `%${searchTerm}%`];

    try {
        const users = await connection.query(sql, values);
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Search failed' });
    }
});

// 회원 탈퇴
app.delete('/account/:user_id', async (req, res) => {
    const user_id = req.params.user_id;
    const sql = 'DELETE FROM user WHERE user_id = ?';
    const values = [user_id];

    try {
        const result = await connection.query(sql, values);
        if (result.affectedRows === 0) {
            console.log('Account deletion failed: User not found');
            res.status(404).json({ message: 'Account deletion failed', code: 2 });
        } else {
            res.status(200).json({ message: 'Account deletion success', code: 1 });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Account deletion failed' });
    }
});

// 2. 팔로우 관리

// 팔로우
app.post('/follow', async (req, res) => {
    const { shooter_id, target_id } = req.body;

    const checkFollowSql = 'SELECT * FROM follow WHERE shooter_id = ? AND target_id = ?;';
    const checkFollowValues = [shooter_id, target_id];

    try {
        const checkFollowResult = await connection.query(checkFollowSql, checkFollowValues);

        if (checkFollowResult.length > 0) {
            console.log('Already following');
            return res.status(400).json({ message: 'Already following' });
        }

        const sql = 'INSERT INTO follow (shooter_id, target_id) VALUES (?, ?);';
        const values = [shooter_id, target_id];

        await connection.query(sql, values);
        console.log('Follow successful');
        res.status(201).json({ message: 'Follow successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Follow action failed' });
    }
});

// 언팔로우
app.delete('/follow/:shooter_id/:target_id', async (req, res) => {
    const { shooter_id, target_id } = req.params;

    const sql = 'DELETE FROM follow WHERE shooter_id = ? AND target_id = ?;';
    const values = [shooter_id, target_id];

    try {
        const result = await connection.query(sql, values);

        if (result.affectedRows === 0) {
            console.log('Unfollow failed: Can\'t find target user');
            res.status(404).json({ message: 'Unfollow failed' });
        } else {
            console.log('Unfollow successful');
            res.status(200).json({ message: 'Unfollow successful' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Unfollow failed' });
    }
});

// 3. 게시글 관리

// 게시글 작성
app.post('/posts', async (req, res) => {
    const { post_context, user_id } = req.body;
    const sql = 'INSERT INTO post (post_context, user_id) VALUES (?, ?);';
    const values = [post_context, user_id];

    try {
        const result = await connection.query(sql, values);
        res.status(201).json({ message: 'Post created successfully', post_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Post creation failed' });
    }
});

// 게시글 목록 끌어오기
app.get('/posts', (req, res) => {
    const user_id = req.query.user_id;

    if (!user_id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        connection.query('SELECT * FROM post WHERE user_id = ?', [user_id], (err, userPosts) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to retrieve posts' });
            }

            connection.query('SELECT p.* FROM post p INNER JOIN follow f ON f.shooter_id = ? AND f.target_id = p.user_id', [user_id], (err, followPosts) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: 'Failed to retrieve posts' });
                }

                const allPosts = [...userPosts, ...followPosts];
                allPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                if (allPosts.length === 0) {
                    res.status(404).json({ message: 'There are nothing in posts yet' });
                } else {
                    res.json(allPosts);
                }
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to retrieve posts' });
    }
});

//내 포스트만 보여주기
app.get('/my-posts', (req, res) => {
    const user_id = req.query.user_id
    
    if(!user_id){
        return res.status(400).json({message:'User ID is required'})
    }

    const sql = "SELECT post_id, post_context FROM post WHERE user_id = ?;"
    const values = [user_id]

    connection.query(sql, values, (err, userPosts) => {
        if(err){
            console.error(err);
            return res.status(500).json({message: 'Failed to retrieve user posts'})
        }

        if(userPosts.length === 0){
            res.status(404).json({message: 'You have no posts yet'})
        }else{
            res.json(userPosts)
        }
    })
})

// 게시글 삭제
app.delete('/my-posts/:post_id', async (req, res) => {
    const post_id = parseInt(req.params.post_id);
    const sql = 'DELETE FROM post WHERE post_id = ?;';
    const values = [post_id];

    try {
        const result = await connection.query(sql, values);
        if (result.affectedRows === 0) {
            console.log('Post deletion failed: Post not found');
            res.status(404).json({ message: 'Post deletion failed' });
        } else {
            console.log('Post deleted successfully');
            res.status(200).json({ message: 'Post deleted successfully' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Post deletion failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
