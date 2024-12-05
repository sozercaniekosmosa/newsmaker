import Sqlite3 from "sqlite3";


export class Database {
    db = null;

    constructor(databaseFile) {
        this.databaseFile = databaseFile;
        this.db = null;

    }

    // Метод для подключения к базе данных
    connect() {
        return new Promise((resolve, reject) => {
            const sql = Sqlite3.verbose();
            this.db = new sql.Database(this.databaseFile, (err) => {
                if (err) {
                    reject(err.message);
                } else {
                    console.log('Connected to the SQLite database.');
                    resolve();
                }
            });
        });
    }

    // Метод для выполнения запросов (INSERT, UPDATE, DELETE)
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err.message);
                } else {
                    resolve({id: this.lastID, changes: this.changes});
                }
            });
        });
    }

    // Метод для выполнения запросов SELECT с возвратом одной записи
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Метод для выполнения запросов SELECT с возвратом всех записей
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err.message);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Метод для закрытия соединения с базой данных
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err.message);
                } else {
                    console.log('Closed the database connection.');
                    resolve();
                }
            });
        });
    }
}
