import {config} from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import {noSQL} from "../DB/noSQL.js";

export class TelegramChannelBot {
    constructor(token, groupStorageID, groupStorageThreadID) {
        this.bot = new TelegramBot(token, {interval: 3000, timeout: 10, limit: 20});
        // this.bot = new TelegramBot(token, {polling: true});

        this.groupStorageID = groupStorageID;
        this.groupStorageThreadID = groupStorageThreadID;
        this.scheduledMessages = {};
        this.publishedMessages = {};
        this.dbTB = new noSQL('./src/tst/dbTB.json');

        // Восстанавливаем состояние из БД
        this.restoreState();

        // Запускаем планировщик
        const loop = async () => {
            await this.checkScheduledMessages()
            setTimeout(loop, 15)
        }
        loop();

        // Регистрируем обработчики для сохранения состояния
        this.bot.on('polling_error', (error) => {
            console.error(`Polling error: ${error}`);
        });
    }

    async restoreState() {
        const {data} = this.dbTB.getByID('tb');
        this.scheduledMessages = data?.scheduledMessages ?? {};
        this.publishedMessages = data?.publishedMessages ?? {};
    }

    async storeState() {
        this.dbTB.update({
            id: 'tb', data: {
                scheduledMessages: this.scheduledMessages, publishedMessages: this.publishedMessages
            }
        });
    }

    uploadImages = this.sendStorageMessage;


    async sendStorageMessage(chatID, threadID, text, arrImg) {
        process.env.NTBA_FIX_350 = '1'; //фиксим предупреждение
        let arrResponse;
        if (arrImg.length > 1) {
            const media = arrImg.map((imagePath, index) => ({
                type: 'photo', media: imagePath, caption: index === 0 ? text : undefined, // Устанавливаем тему только для первого изображения
                fileOptions: {contentType: 'image/png'}
            }));
            arrResponse = await this.bot.sendMediaGroup(chatID, media, {message_thread_id: threadID})
        } else {
            arrResponse = [await this.bot.sendPhoto(chatID, arrImg[0], {message_thread_id: threadID, text})];
        }


        return arrResponse;
    }

    async publishMessage(channelID, text, arrImg, publishTime) {
        const messageId = Date.now().toString();
        const arrUploadedImage = await this.uploadImages(this.groupStorageID, this.groupStorageThreadID, text, arrImg);
        const arrImgID = arrUploadedImage.map(({photo}) => photo.pop().file_id);
        const arrMessageID = arrUploadedImage.map(({message_id}) => message_id);

        const task = {channelID, text, arrImgID, publishTime: new Date(publishTime), arrMessageID};
        this.scheduledMessages[messageId] = task;
        await this.bot.editMessageCaption(
            JSON.stringify({[messageId]: this.scheduledMessages[messageId]}), {chat_id: this.groupStorageID, message_id: arrMessageID[0]});
        // await this.bot.sendMessage(this.groupStorageID, JSON.stringify(this.scheduledMessages[messageId]), {message_thread_id: this.groupStorageThreadID})

        await this.storeState();
        return messageId;
    }

    async checkScheduledMessages() {
        const now = new Date();
        if (!this.scheduledMessages) return;
        const arr = Object.entries(this.scheduledMessages)
        for (let i = 0; i < arr.length; i++) {
            const [messageId, message] = arr[i];
            if (message.publishTime <= now) {
                try {
                    let arrSentMessage = await this.sendStorageMessage(message.channelID, null, message.text, message.arrImgID);
                    const arrMessage = arrSentMessage.map(({message_id}) => message_id)

                    this.publishedMessages[messageId] = {channelID: message.channelID, arrMessage, text: arrSentMessage[0].caption};

                    delete this.scheduledMessages[messageId];

                    await this.storeState();
                } catch (error) {
                    console.error(`Error publishing message: ${error}`);
                }
            }
        }
    }

    async editMessage(channelID, messageTaskID, newText, arrImg) {

        arrImg = arrImg.reverse();
        const {arrMessage} = this.publishedMessages[messageTaskID];
        if (arrImg.length) {
            const arrUploadedImage = await this.uploadImages(this.groupStorageID, this.groupStorageThreadID, newText, arrImg.filter(it => !!it));
            const arrImgID = arrUploadedImage.map(({photo}) => photo.pop().file_id)

            for (let i = 0; i < arrImg.length; i++) {
                if (!arrImg[i]) continue;
                const img = arrImgID.pop()
                await this.bot.editMessageMedia({type: 'photo', media: img}, {chat_id: channelID, message_id: arrMessage[i]});
            }
        }
        if (newText) await this.bot.editMessageCaption(newText, {chat_id: channelID, message_id: arrMessage[0]});

        this.publishedMessages[messageTaskID].text = newText;
        await this.storeState()
    }

    async deleteMessage(channelID, messageId) {
        const message = this.publishedMessages[messageId];
        if (!message) throw new Error('Message not found');

        for (const id of message.arrMessage) {
            await this.bot.deleteMessage(channelID, id);
        }
        delete this.publishedMessages[messageId];

        await this.storeState();
    }

    async getChannelId(channelName) {
        const chat = await this.bot.getChat(channelName);
        return chat.id;
    }
}