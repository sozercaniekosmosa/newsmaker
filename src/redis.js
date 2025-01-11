const redis = require('redis');
const fs = require('fs');
const {promisify} = require('util');
const _ = require('lodash');


export class RedisDB {
    constructor(redisClient, dumpFilePath = './news_dump.json') {
        this.client = redisClient;
        this.dumpFilePath = dumpFilePath;

        // Promisify Redis methods
        this.hgetallAsync = promisify(this.client.hgetall).bind(this.client);
        this.hsetAsync = promisify(this.client.hset).bind(this.client);
        this.hdelAsync = promisify(this.client.hdel).bind(this.client);
        this.keysAsync = promisify(this.client.keys).bind(this.client);
        this.delAsync = promisify(this.client.del).bind(this.client);

        // Debounced function to dump database
        this.debouncedDumpDatabase = _.debounce(this.dumpDatabase.bind(this), 1000);
    }

    // Add a news item
    async add(table, id, news) {
        news.id = id;
        await this.hsetAsync(`${table}:${id}`, news);
        this.debouncedDumpDatabase();
        return id;
    }

    // Add a news item
    async del(table, id) {
        await this.hdelAsync(`${table}:${id}`);
        this.debouncedDumpDatabase();
        return id;
    }

    // get a news item by ID
    async getByID(table, id) {
        const key = `${table}:${id}`;
        const news = await this.hgetallAsync(key);
        return news
    }

    // Update a news item by ID
    async update(table, id, updatedFields) {
        const key = `${table}:${id}`;
        const news = await this.hgetallAsync(key);
        if (!news) {
            throw new Error(`News with ID ${id} not found.`);
        }

        const updatedNews = {...news, ...updatedFields};
        await this.hsetAsync(key, updatedNews);
        this.debouncedDumpDatabase();
        return updatedNews;
    }

    // Get news with sorting and optional date range filter
    async getNews(table, {fromDate = 0, toDate = Date.now()} = {}) {
        const keys = await this.keysAsync(`${table}:*`);
        const newsList = [];

        for (const key of keys) {
            const news = await this.hgetallAsync(key);
            if (news && news.dt >= fromDate && news.dt <= toDate) {
                newsList.push(news);
            }
        }

        return newsList.sort((a, b) => b.dt - a.dt);
    }

    // Dump database to a file
    async dumpDatabase(table) {
        const keys = await this.keysAsync(`${table}:*`);
        const data = {};

        for (const key of keys) {
            data[key] = await this.hgetallAsync(key);
        }

        fs.writeFileSync(this.dumpFilePath, JSON.stringify(data, null, 2));
        console.log('Database dumped to file:', this.dumpFilePath);
    }
}

// // Usage Example
// (async () => {
//     const client = redis.createClient();
//
//     const newsDB = new RedisDB(client);
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
//     client.quit();
// })();
