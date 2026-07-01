import mysql from 'mysql2/promise';

const NEW_PASSWORD = process.argv[2] ?? 'tiledb123';

const connection = await mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
});

await connection.query(`ALTER USER 'root'@'localhost' IDENTIFIED BY ?`, [NEW_PASSWORD]);
await connection.query(`ALTER USER 'root'@'127.0.0.1' IDENTIFIED BY ?`, [NEW_PASSWORD]);
await connection.query('FLUSH PRIVILEGES');
await connection.end();

const verify = await mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: NEW_PASSWORD,
});
await verify.query('SELECT 1');
await verify.end();

console.log(`MySQL root password set to: ${NEW_PASSWORD}`);
