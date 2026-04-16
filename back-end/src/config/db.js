const sql = require('mssql');
require('dotenv').config();
 
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true 
    }
};
const connectDB = async () => {
   try {
     const pool = await sql.connect(dbConfig);
    console.log('Kết nối đến SQL Server thành công!');
    return pool;
   } catch (error)
   {
    console.error('Lỗi kết nối đến SQL Server:', error);
    process.exit(1);
   }
};
module.exports = 
{
    sql,
    connectDB
};