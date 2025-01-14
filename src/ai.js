import axios from "axios";
import path from "path";
import {readFileAsync, writeFileAsync} from "./utils.js";
import {config} from "dotenv";

const {parsed: {FOLDER_ID, OAUTH_TOKEN, ARLIAI_API_KEY, MISTRAL_API_KEY}} = config();

export async function yandexGPT(prompt, text, res) {
    const iam_token = await getIAM();
    const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

    const promptData = {
        // modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite`,
        modelUri: `gpt://${FOLDER_ID}/yandexgpt/rc`,//
        completionOptions: {stream: false, "temperature": 0, "maxTokens": "15000"},
        messages: [{role: "system", "text": prompt ?? "Упрости текст до 30 слов"}, {role: "user", text}]
    }
    try {
        const {data} = await axios.post(url, promptData, {
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${iam_token}`},
            params: {folderId: FOLDER_ID,},
        })

        return data.result.alternatives.map(({message: {text}}) => text).join('\n')
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function arliGPT(prompt, text, res) {
    try {
        const {data} = await axios.post("https://api.arliai.com/v1/chat/completions", {
            model: "Mistral-Nemo-12B-Instruct-2407",
            messages: [
                {role: "system", content: prompt},
                {role: "user", content: text}
            ]
            , repetition_penalty: 1.1, temperature: 0.7, top_p: 0.9, top_k: 40, max_tokens: 1024, stream: false
        }, {
            headers: {
                "Authorization": `Bearer ${ARLIAI_API_KEY}`, "Content-Type": "application/json"
            }
        })
        return data.choices.map(({message: {content}}) => content).join('\n');
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function mistralGPT(prompt, text, res) {
    try {
        const {data} = await axios.post('https://api.mistral.ai/v1/chat/completions', {
            model: 'mistral-large-latest',//'mistral-small-latest',
            messages: [
                {role: "system", content: prompt},
                {role: "user", content: text}
            ],
        }, {
            headers: {
                'Content-Type': 'application/json', 'Authorization': `Bearer ${MISTRAL_API_KEY}`  // Замените на ваш API ключ
            }
        });

        return data.choices.map(({message: {content}}) => content).join('\n');
    } catch (error) {
        console.log(error)
        throw error;
    }
}

export async function yandexToSpeech({text, path, voice = 'marina', speed = 1.4}) {
    try {
        const iam_token = await getIAM();
        const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

        const {data} = await axios({
            method: 'POST', url, headers: {
                'Authorization': `Bearer ${iam_token}`
            }, responseType: 'arraybuffer',  // Получаем данные как бинарный массив
            data: new URLSearchParams({
                text, lang: 'ru-RU', voice,
                //voice: 'jane', // voice: 'ermil',
                // voice: 'filipp',
                // voice: 'lera',
                speed, folderId: FOLDER_ID, format: 'mp3', sampleRateHertz: '48000'
            })
        })

        await writeFileAsync(`./public/public/${path}/speech.mp3`, data);
        console.log('Аудиофайл успешно создан.');
    } catch (error) {
        console.log(error)
        throw error;
    }
}

let iamToken, dtExpMs;
const getIAM = async () => { //для работы нужен AIM для его получения нужен OAUTH его можно взять тут: https://oauth.yandex.ru/verification_code
    let expiresAt, dtNowMs = (new Date()).getTime();
    const filePath = path.join('./', 'iam.json');

    if (dtExpMs && dtExpMs > dtNowMs) return iamToken; //dtExpMs-заиничен и время не истекло, то выход

    if (!dtExpMs) {//dtExpMs - не заиничен
        try {
            const raw = await readFileAsync(filePath);
            ({iamToken, expiresAt} = JSON.parse(raw.toString()));
            dtExpMs = (new Date(expiresAt)).getTime();
        } catch (error) {
            console.log(error)
        }
    }

    if (dtExpMs && dtExpMs > dtNowMs) return iamToken; //если файл есть и время не истекло, то выход

    try {
        const resp = await axios.post('https://iam.api.cloud.yandex.net/iam/v1/tokens', {yandexPassportOauthToken: OAUTH_TOKEN})
        console.log(resp)
        const {data} = resp;
        ({iamToken, expiresAt} = data);
        await writeFileAsync(filePath, JSON.stringify(data))

    } catch (error) {
        console.log(error)
    }

    return iamToken;
}