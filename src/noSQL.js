import fs, {promises as fsPromises} from "fs";
import _ from "lodash";
import PATH from "path";

export class noSQL {
    constructor(dumpFilePath = './news_dump.json') {
        this.dumpFilePath = dumpFilePath;

        const strDump = this.getDumpDatabase(this.dumpFilePath);
        this.db = JSON.parse(strDump + '');

        // Debounced function to dump database
        this.debouncedDumpDatabase = _.debounce(this.dumpDatabase.bind(this), 1000);
    }

    // Add an item
    add(id, news) {
        news.id = id;
        this.db[id] = news;
        this.debouncedDumpDatabase();
        return news;
    }

    // Add an item
    del(id) {
        delete this.db[id];
        this.debouncedDumpDatabase();
        return id;
    }

    // get a news item by ID
    getByID = (id) => this.db[id];

    // Update a news item by ID
    update(id, updatedFields) {
        const news = this.db[id];
        if (!news) {
            throw new Error(`News with ID ${id} not found.`);
        }

        const updatedNews = {...news, ...updatedFields};
        this.db[id] = updatedNews;
        this.debouncedDumpDatabase();
        return updatedNews;
    }

    // Get news with sorting and optional date range filter
    getNews({fromDate = 0, toDate = Date.now()} = {}) {
        const arrVal = Object.values(this.db);
        const newsList = [];

        for (let i = 0; i < arrVal.length; i++) {
            const val = arrVal[i];
            if (val && val.dt >= fromDate && val.dt <= toDate) {
                newsList.push(val);
            }
        }

        return newsList.sort((a, b) => b.dt - a.dt);
    }

    // Get filter items
    getAllFilter(clbFilter) {
        const arrVal = Object.values(this.db);
        const newsList = [];

        for (let i = 0; i < arrVal.length; i++) {
            const val = arrVal[i];
            if (clbFilter(val)) {
                newsList.push(val);
            }
        }

        return newsList;
    }

    // Dump database to a file
    getDumpDatabase = async () => await this.readFileAsync(this.dumpFilePath);

    async dumpDatabase() {
        await this.writeFileAsync(this.dumpFilePath, JSON.stringify(this.db, null, 2));
        console.log('Database dumped to file:', this.dumpFilePath);
    }

    readFileAsync = async (path, options) => {
        try {
            const data = await fsPromises.readFile(path, options);
            return data;
        } catch (err) {
            throw 'Ошибка чтения файла: ' + path
        }
    };

    writeFileAsync = async (filePath, data) => {
        try {

            const dir = PATH.dirname(filePath)

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, {recursive: true});
            }
            await fsPromises.writeFile(filePath, data);
        } catch (err) {
            throw 'Ошибка записи файла: ' + filePath
        }
    };

    // Dump database to a file
    // async getDumpDatabase(table) {
    //     const keys = await this.keysAsync(`${table}:*`);
    //     const data = {};
    //
    //     for (const key of keys) {
    //         data[key] = await this.hgetallAsync(key);
    //     }
    //
    //     fs.writeFileSync(this.dumpFilePath, JSON.stringify(data, null, 2));
    //     console.log('Database dumped to file:', this.dumpFilePath);
    // }
}

// // Usage Example
// (async () => {
//     const db = redis.createClient();
//
//     const newsDB = new noSQL(db);
//
//     // Adding a news item
//     await newsDB.add(1284220219,{
//         dt: Date.now(),
//         url: 'https://example.com/news1',
//         title: 'Example News 1',
//         tags: ['example', 'news'],
//         text: 'This is the text of the news.',
//         type: 'article',
//         from: 'source1',
//         textHadled: 'Processed text.',
//         arrSrcImg: ['https://example.com/image1.jpg'],
//         srcAudio: '',
//         srcVideo: ''
//     });
//
//     // Getting news items
//     const newsList = await newsDB.getNews({fromDate: Date.now() - 86400000});
//     console.log('News List:', newsList);
//
//     // Updating a news item
//     await newsDB.update(newsList[0].id, {title: 'Updated News Title'});
//
//     db.quit();
// })();
