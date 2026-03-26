const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "freshbasket"
});

connection.connect((err) => {
    if(err) {
        console.error('Error connecting to MySQL:',err);
        return;
    }
    console.error('connected to MySQL, Thread ID:', connection.threadid);
});
module.exports=connection