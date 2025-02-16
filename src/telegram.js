import TelegramBot from "node-telegram-bot-api";
import {formatDateTime, getRandomRange} from "./utils.js";

export class TelegramChannelBot {
    constructor(token, groupStorageID, groupStorageThreadID, db) {
        this.bot = new TelegramBot(token, {interval: 3000, timeout: 10, limit: 20});
        // this.bot = new TelegramBot(token, {polling: true});

        this.groupStorageID = groupStorageID;
        this.groupStorageThreadID = groupStorageThreadID;
        this.scheduledMessages = {};
        this.publishedMessages = {};
        if (!db.getByID('tb')) db.add('tb', {scheduledMessages: {}, publishedMessages: {}})
        this.dbTB = db

        // Восстанавливаем состояние из БД
        this.#restoreState();

        // Запускаем планировщик
        const loop = async () => {
            await this.#checkScheduledMessages()
            setTimeout(loop, 1000)
        }
        loop();

        // Регистрируем обработчики для сохранения состояния
        this.bot.on('polling_error', (error) => {
            console.error(`Polling error: ${error}`);
        });
    }

    async #restoreState() {
        const {scheduledMessages, publishedMessages} = this.dbTB.getByID('tb') ?? {scheduledMessages: {}, publishedMessages: {}};
        this.scheduledMessages = scheduledMessages;
        this.publishedMessages = publishedMessages;
    }

    async #storeState() {
        this.dbTB.update({
            id: 'tb',
            scheduledMessages: this.scheduledMessages, publishedMessages: this.publishedMessages
        });
    }

    #uploadImages = this.#sendStorageMessage;

    async #sendStorageMessage(chatID, threadID, text, arrImg) {
        process.env.NTBA_FIX_350 = '1'; //фиксим предупреждение
        let arrResponse;
        try {

            if (arrImg.length > 1) {
                const media = arrImg.map((imagePath, index) => ({
                    type: 'photo', media: imagePath, caption: index === 0 ? text : undefined, // Устанавливаем тему только для первого изображения
                    fileOptions: {contentType: 'image/png'}
                }));
                arrResponse = await this.bot.sendMediaGroup(chatID, media, {message_thread_id: threadID, text, parse_mode: 'HTML'})
            } else {
                arrResponse = [await this.bot.sendPhoto(chatID, arrImg[0], {message_thread_id: threadID, caption: text, parse_mode: 'HTML'})];
            }
        } catch (e) {
            console.error(e)
            throw e;
        }


        return arrResponse;
    }

    async #checkScheduledMessages() {
        const now = new Date(Date.now() - getRandomRange(1e4, 3e5));
        if (!this.scheduledMessages) return;
        const arr = Object.entries(this.scheduledMessages)
        for (let i = 0; i < arr.length; i++) {
            const [messageId, message] = arr[i];
            if (new Date(message.publishTime) + 36e5 < now) continue;// новост протухла
            if (new Date(message.publishTime) <= now) {
                try {
                    let arrSentMessage = await this.#sendStorageMessage(message.channelID, null, message.text, message.arrImgID);
                    const arrMessage = arrSentMessage.map(({message_id}) => message_id)

                    this.publishedMessages[messageId] = {
                        channelID: message.channelID,
                        arrMessage,
                        text: arrSentMessage[0].caption,
                        publishTime: message.publishTime,
                        strTime: message.strTime
                    };

                    delete this.scheduledMessages[messageId];

                    await this.#storeState();
                } catch (error) {
                    console.error(`Error publishing message: ${error}`);
                }
            }
        }
    }

    async publishMessage(channelID, text, arrImg, publishTime, messageId = Date.now().toString()) {
        try {
            const arrUploadedImage = await this.#uploadImages(this.groupStorageID, this.groupStorageThreadID, text, arrImg);
            const arrImgID = arrUploadedImage.map(({photo}) => photo.pop().file_id);
            const arrMessageID = arrUploadedImage.map(({message_id}) => message_id);

            const task = {
                channelID,
                text,
                arrImgID,
                publishTime: new Date(publishTime),
                arrMessageID,
                strTime: formatDateTime(new Date(publishTime)),
            };
            this.scheduledMessages[messageId] = task;
            await this.bot.editMessageCaption(task.strTime + ': ' + task.text, {
                chat_id: this.groupStorageID,
                message_id: arrMessageID[0],
                parse_mode: 'HTML'
            });
            // await this.bot.sendMessage(this.groupStorageID, JSON.stringify(this.scheduledMessages[messageId]), {message_thread_id: this.groupStorageThreadID})

            await this.#storeState();
            return messageId;
        } catch (e) {
            console.error(e)
            ERR(e.toString())
            throw e;
        }finally {
            return messageId;
        }
    }

    async editMessage(channelID, messageTaskID, newText, arrImg) {

        arrImg = arrImg.reverse();
        const {arrMessage} = this.publishedMessages[messageTaskID];
        if (arrImg.length) {
            const arrUploadedImage = await this.#uploadImages(this.groupStorageID, this.groupStorageThreadID, newText, arrImg.filter(it => !!it));
            const arrImgID = arrUploadedImage.map(({photo}) => photo.pop().file_id)

            for (let i = 0; i < arrImg.length; i++) {
                if (!arrImg[i]) continue;
                const img = arrImgID.pop()
                await this.bot.editMessageMedia({type: 'photo', media: img}, {chat_id: channelID, message_id: arrMessage[i]});
            }
        }
        if (newText) await this.bot.editMessageCaption(newText, {chat_id: channelID, message_id: arrMessage[0]});

        this.publishedMessages[messageTaskID].text = newText;
        await this.#storeState()
    }

    async deleteMessage(channelID, messageId) {
        const message = this.publishedMessages[messageId];
        if (!message) throw new Error('Message not found');

        for (const id of message.arrMessage) {
            await this.bot.deleteMessage(channelID, id);
        }
        delete this.publishedMessages[messageId];

        await this.#storeState();
    }

    async getChannelId(channelName) {
        const chat = await this.bot.getChat(channelName);
        return chat.id;
    }
}