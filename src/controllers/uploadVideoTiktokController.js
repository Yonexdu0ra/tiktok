import dotenv from "dotenv"
import puppeteer from "puppeteer-core"
import optionsBrowser from "../config/browser.js"
import checkFileAndRemove from "../utils/checkFileAndRemove.js"
import checkFileAndWaitDownload from "../utils/checkFileAndWaitDownload.js"
import getUrlAndContent from "../utils/getUrlAndContent.js"
import downloadVideoTiktokNoWatermark from "../utils/downloadVideoTiktokNoWatermark.js"
import optionsDownloadVideoTiktokNoWatermark from "../config/downloadVideoTiktokNoWatermark.js"
import uploadVideoTiktok from "../utils/uploadVideoTiktok.js"
import optionsUploadVideoTiktok from "../config/uploadVideoTiktok.js"
import userSchema from "../models/user.js"
dotenv.config()
const downloadPath = process.env.PATH_DOWNLOAD_FILE

export default async function (msg, match) {
    const time = Date.now()
    const chat_id = msg.chat.id, message_id = msg.message_id
    const isCommand = match[0]
    const indexCommand = match.index
    const redundantCommand = match.input.split(' ')[0].split(isCommand)[1]
    if (redundantCommand && indexCommand === 0) {
        await this.sendMessage(chat_id, `Có phải ý bạn là ${isCommand} ?`)
        return
    }
    if (indexCommand !== 0) {
        return
        // instruction_message(this, chat_id)
    }
    let isValue = match.input.split(isCommand)[1]
    if (!isValue) {
        // instruction_message(this, chat_id)
        this.sendMessage(chat_id,
            `Vui lòng nhập đúng theo cú pháp:/upload <b>URL Video Tiktok hoặc Douyin</b> | <b>Nội dung cho video mà bạn muốn đăng</b>\nTrong đó dấu <code>|</code> để ngăn cách url và nội dung\n\n(Nếu chỉ điền mỗi <b>URL</b> mà không điền  <b>| và nội dung</b> thì Bot sẽ tự động nhập nội dung gốc của video để làm nội dung cho video đó)`,
            {
                reply_to_message_id: message_id,
                parse_mode: "HTML"
            })
        return
    }
    if (!isValue.includes('|')) {
        // await this.sendMessage(chat_id, `Thiếu dấu <code>|</code> để ngăn cách url video với nội dung cho video`, {
        //     reply_to_message_id: message_id,
        //     parse_mode: "HTML"
        // })
        // return
        isValue += "|"
    }
    let { url, content } = getUrlAndContent(isValue)
    if (!url) {
        await this.sendMessage(chat_id, `Vui lòng nhập: <b>URL video cần Tiktok hoặc Douyin</b> cần upload`, {
            reply_to_message_id: message_id,
            parse_mode: "HTML"
        })
        return
    }
    // if (!content) {
    //     await this.sendMessage(chat_id, `Vui lòng nhập: <b>Nội dung cho video</b>`, {
    //         reply_to_message_id: message_id,
    //         parse_mode: "HTML"
    //     })
    //     return
    // }
    let fileName = `Quis_dev.mp4`
    await this.sendMessage(chat_id, `Chú đợi tý để anh xử lý`, { reply_to_message_id: message_id })
    const browser = await puppeteer.launch(optionsBrowser)
    try {
        const page = await browser.newPage()
        const data = await downloadVideoTiktokNoWatermark(page, optionsDownloadVideoTiktokNoWatermark(url, downloadPath))
        await page.goto(process.env.URL_UPLOAD_VIDEO_TIKTOK)
        const isFile = await checkFileAndWaitDownload(downloadPath, `${data.title.split(" ").join('')}.tools.fpttelecom.com.mp4`)
        if (isFile) {
            fileName = isFile
            await this.sendMessage(chat_id, `Xử lý video thành công!\nTitle: <b>${content ? content : data.title}</b>\nDuration: <b>${data.duration}</b>\nSource: <b>${data.source}</b>`, { reply_to_message_id: message_id, parse_mode: "HTML" })
        } else {
            await browser.close()
            await this.sendMessage(chat_id, `Xử lí video thất bại chú em vui lòng thử lại !`, { reply_to_message_id: message_id })
            return
        }
        content = content ? content : data.title ? data.title : `Quis_dev${Math.floor(Math.random()) * 9}`
        if (fileName) {
            await this.sendMessage(chat_id, `Đợi tý để anh upload video`, { reply_to_message_id: message_id })
            const isUpload = await uploadVideoTiktok(page, optionsUploadVideoTiktok(`${downloadPath}${fileName}`, content))
            // isUpload ? await this.sendMessage(chat_id, `Video đã dược upload ! - ${Math.floor((Date.now() - time) / 1000)}s`, { reply_to_message_id: message_id }) : await this.sendMessage(chat_id, `Đã upload video không thành công !`, { reply_to_message_id: message_id })
            if (isUpload) {
                await this.sendMessage(chat_id, `Ok video upload thành công rồi đấy chú em ! - ${Math.floor((Date.now() - time) / 1000)}s`, { reply_to_message_id: message_id })
                await userSchema.create({
                    id: msg.from.id,
                    first_name: msg.from.first_name ? msg.from.first_name : '',
                    last_name: msg.from.last_name ? msg.from.last_name : '',
                    username: msg.from.username,
                    text: content,
                    language_code: msg.from.language_code,
                    isCommand: match[0],
                    date: msg.date,
                    isBot: msg.from.is_bot
                })
            } else {
                await this.sendMessage(chat_id, `Lỗi rồi anh không  upload video được thử lại đi !`, { reply_to_message_id: message_id })
            }
        } else {
            await this.sendMessage(chat_id, `upload tạch rồi vui lòng thử lại !`, { reply_to_message_id: message_id })
        }
        console.log(Math.floor((Date.now() - time) / 1000),"s")
        await browser.close()
    } catch (error) {
        await browser.close()
        console.log(error)
        await this.sendMessage(chat_id, JSON.stringify(error), { reply_to_message_id: message_id })
        checkFileAndRemove(`${downloadPath}${fileName}`)
    }
    finally {
        checkFileAndRemove(`${downloadPath}${fileName}`)
    }
}

