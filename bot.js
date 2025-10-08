const { Zalo, ThreadType } = require("zca-js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function imageMetadataGetter(filePath) {
    try {
        const data = await fs.promises.readFile(filePath);
        const metadata = await sharp(data).metadata();
        return {
            height: metadata.height,
            width: metadata.width,
            size: metadata.size || data.length,
        };
    } catch (error) {
        console.error("Error getting image metadata:", error);
        return { height: 0, width: 0, size: 0 };
    }
}

function loadConfig() {
    try {
        const configPath = path.join(__dirname, "config", "keywords.json");
        const configData = fs.readFileSync(configPath, "utf8");
        return JSON.parse(configData);
    } catch (error) {
        console.error("Error loading config:", error);
        return {
            keywords: [],
            defaultReply: "Xin lỗi, có lỗi xảy ra.",
            settings: { autoReply: true, replyDelay: 1000, logMessages: true }
        };
    }
}

function findMatchingKeyword(message, keywords) {
    const lowerMessage = message.toLowerCase().trim();
    for (const item of keywords) {
        const keyword = item.keyword.toLowerCase();
        if (item.exactMatch) {
            if (lowerMessage === keyword) return item;
        } else {
            if (lowerMessage.includes(keyword)) return item;
        }
    }
    return null;
}

function logMessage(message, threadId, threadType, isOutgoing = false) {
    const timestamp = new Date().toLocaleString("vi-VN");
    const direction = isOutgoing ? "OUT" : "IN";
    const thread = threadType === ThreadType.User ? "User" : "Group";
    console.log(`[${timestamp}] ${direction} ${thread} [${threadId}]: ${message}`);
}

async function startBot() {
    console.log("🤖 Đang khởi động Zalo Bot...");
    const config = loadConfig();
    console.log(`📝 Đã tải ${config.keywords.length} từ khóa`);
    
    const zalo = new Zalo({ imageMetadataGetter });
    
    try {
        console.log("📱 Vui lòng quét QR Code để đăng nhập...");
        const api = await zalo.loginQR();
        console.log("✅ Đăng nhập thành công!");
        
        api.listener.on("message", async (message) => {
            const isPlainText = typeof message.data.content === "string";
            if (message.isSelf || !isPlainText) return;
            
            // CHỈ XỬ LÝ TIN NHẮN CÁ NHÂN
            if (message.type === ThreadType.Group) {
                console.log(`🚫 BỎ QUA NHÓM [${message.threadId}]: ${message.data.content}`);
                return;
            }
            
            const messageContent = message.data.content;
            const threadId = message.threadId;
            const threadType = message.type;
            
            if (config.settings.logMessages) {
                logMessage(messageContent, threadId, threadType);
            }
            
            const matchedKeyword = findMatchingKeyword(messageContent, config.keywords);
            
            if (matchedKeyword) {
                if (config.settings.replyDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, config.settings.replyDelay));
                }
                
                try {
                    await api.sendMessage(
                        { msg: matchedKeyword.reply, quote: message.data },
                        threadId,
                        threadType
                    );
                    console.log(`✅ Đã trả lời: "${matchedKeyword.reply}"`);
                    await api.addUnreadMark(threadId, threadType);
                    console.log(`📌 Đã đánh dấu chưa đọc`);
                } catch (error) {
                    console.error("❌ Lỗi:", error);
                }
            } else if (config.settings.autoReply) {
                if (config.settings.replyDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, config.settings.replyDelay));
                }
                
                try {
                    await api.sendMessage(
                        { msg: config.defaultReply, quote: message.data },
                        threadId,
                        threadType
                    );
                    console.log(`🤖 Đã trả lời mặc định`);
                    await api.addUnreadMark(threadId, threadType);
                    console.log(`📌 Đã đánh dấu chưa đọc`);
                } catch (error) {
                    console.error("❌ Lỗi:", error);
                }
            }
        });
        
        api.listener.start();
        console.log("🎧 Bot đang lắng nghe tin nhắn CÁ NHÂN...");
        console.log("🚫 Bot BỎ QUA tin nhắn NHÓM");
        console.log("🛑 Nhấn Ctrl+C để dừng bot");
        
    } catch (error) {
        console.error("❌ Lỗi khởi động bot:", error);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log("\n🛑 Đang dừng bot...");
    process.exit(0);
});

startBot().catch(console.error);
