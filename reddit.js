'use strict'
var bcrypt = require('bcrypt-as-promised');
var HASH_ROUNDS = 10;

class RedditAPI {
    constructor(conn) {
        this.conn = conn;
    }

    createUser(user) {
        return bcrypt.hash(user.password, HASH_ROUNDS)
            .then(hashedPassword => {
                return this.conn.query('INSERT INTO users (username,password, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [user.username, hashedPassword]);
            })
            .then(result => {
                return result.insertId;
            })
            .catch(error => {
                // Special error handling for duplicate entry
                if (error.code === 'ER_DUP_ENTRY') {
                    throw new Error('A user with this username already exists');
                }
                else {
                    throw error;
                }
            });
    }
    
    
    createSubreddit(subreddit) {
        return this.conn.query(
            `
            INSERT INTO subreddits (name, description, createdAt, updatedAt)
            VALUES (?, ?, NOW(), NOW())`, [subreddit.name, subreddit.description]
            ) 
            .then(result => {
                return result.insertId;
            })
            .catch(error => {
                
                if(error.code === 'ER_DUP_ENTRY') {
                    throw new Error('A subreddit with this name already exists! Try another topic :)')
                } 
                else {
                    throw error;
                }
            });
    }


//modify the createPost function to look for a subredditId property in the post 
//object and use it. createPost should return an error if subredditId is not provided.

//INSERT INTO posts (userId, title, url, createdAt, updatedAt)

    createPost(post) {
        return this.conn.query(
            `INSERT INTO posts (userId, title, url, createdAt, updatedAt, subredditId) VALUES (?, ?, ?, NOW(), NOW(), ?)`,
            [post.userId, post.title, post.url, post.subredditId])
            .then(result => {
                //console.log(result.subredditId);
                return result.subredditId;
            })
            .catch(error => {
                // Special error handling for no subreddit ID
                if (error.code === 'ER_NO_SRID') {
                    throw new Error('This Subreddit does not exist');
                }
                else {
                    throw error;
                }
                });
    }


    createVote(vote) {
            if(vote.voteDirection === 1 || vote.voteDirection === 0 || vote.voteDirection === -1) {
                return this.conn.query(
                    `
                    INSERT INTO votes SET postId = ?, userId = ?, voteDirection = ? 
                    ON DUPLICATE KEY UPDATE voteDirection = ?
                    `
                    [vote.postId, vote.userId, vote.voteDirection, vote.voteDirection])
                    .catch(console.log);
            } 
            else {
                throw new Error('Bad Vote');
            }
        }



    getAllPosts(callback) {
        return this.conn.query(
            `
            SELECT SUM(votes.voteDirection), posts.id, posts.title, posts.url, posts.userId, posts.createdAt, posts.updatedAt, users.username, users.createdAt AS usercreatedAt, users.updatedAt AS userupdatedAt
            FROM posts LEFT JOIN users ON users.id = posts.userId
            JOIN subreddits ON posts.subredditId = subreddit.id
            JOIN votes ON posts.id = votes.postId
            ORDER BY votes.voteScore DESC 
            LIMIT 25
            GROUP BY votes.postId`
            
        ).then (//console.log('testing');
            function(result) {
            return result.map(function(val) {
                return {
                    id: val.id,
                    title: val.title,
                    url: val.url,
                    createdAt: val.createdAt,
                    updatedAt: val.updatedAt,
                    userId: val.userId,
                    user:{
                        id:val.id,
                        username: val.username,
                        createdAt: val.createdAt,
                        updatedAt: val.updatedAt
                    }
                }
                //console.log('this is the result', val);
            })
        });
        
    }
    
    getAllSubreddits() {
        return this.conn.query(
            `
            SELECT *
            FROM subreddits
            ORDER BY subreddits.createdAt DESC 
            LIMIT 25
            `
            );
    }
    
    
}


module.exports = RedditAPI;

