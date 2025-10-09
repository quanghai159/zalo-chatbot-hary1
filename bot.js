const { Zalo, ThreadType } = require("zca-js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// HTTP SERVER
// ============================================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Smart Zalo Bot</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                .status { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .online { color: #22c55e; font-weight: bold; }
                .smart { color: #3b82f6; font-weight: bold; }
                h1 { color: #333; }
            </style>
        </head>
        <body>
            <div class="status">
                <h1>🎯 Smart Zalo Bot</h1>
                <p>🤖 Bot chỉ trả lời khi đúng cú pháp</p>
                <p>📊 Status: <span class="online">ONLINE</span></p>
                <p>🎯 Mode: <span class="smart">EXACT MATCH</span></p>
                <p>⏰ Thời gian: ${new Date().toLocaleString("vi-VN")}</p>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 HTTP Server đang chạy tại port ${PORT}`);
});

// ============================================================
// CẤU HÌNH SESSION
// ============================================================
const SESSION_FILE = path.join(__dirname, "zalo-session.json");

// ============================================================
// FUNCTION TẢI CẤU HÌNH
// ============================================================
function loadConfig() {
    try {
        const configPath = path.join(__dirname, "config", "keywords.json");
        const configData = fs.readFileSync(configPath, "utf8");
        return JSON.parse(configData);
    } catch (error) {
        console.error("❌ Lỗi tải config:", error.message);
        return {
            keywords: [],
            defaultReply: "Xin chào! Vui lòng sử dụng cú pháp chính xác.",
            settings: {
                autoReply: true,
                replyDelay: 1000,
                logMessages: true,
            },
        };
    }
}

// ============================================================
// FUNCTION TÌM TỪ KHÓA - CHỈ EXACT MATCH
// ============================================================
function findExactKeyword(message, keywords) {
    const lowerMessage = message.toLowerCase().trim();

    for (const item of keywords) {
        const keyword = item.keyword.toLowerCase().trim();

        // CHỈ TRẢ LỜI KHI ĐÚNG CÚ PHÁP
        if (item.exactMatch) {
            // Exact match - phải giống hệt
            if (lowerMessage === keyword) {
                console.log(`✅ EXACT MATCH: "${message}" = "${item.keyword}"`);
                return item;
            }
        } else {
            // Contains match - nhưng phải đúng từ
            const words = lowerMessage.split(/\s+/);
            const keywordWords = keyword.split(/\s+/);
            
            // Kiểm tra từng từ trong keyword có xuất hiện trong message không
            let matchCount = 0;
            for (const keywordWord of keywordWords) {
                if (words.some(word => word === keywordWord)) {
                    matchCount++;
                }
            }
            
            // Phải match ít nhất 80% các từ
            const matchRatio = matchCount / keywordWords.length;
            if (matchRatio >= 0.8) {
                console.log(`✅ CONTAINS MATCH: "${message}" contains "${item.keyword}" (${Math.round(matchRatio * 100)}%)`);
                return item;
            }
        }
    }

    console.log(`❌ NO MATCH: "${message}" - không khớp với từ khóa nào`);
    return null;
}

// ============================================================
// FUNCTION GHI LOG
// ============================================================
function logMessage(message, threadId, threadType, isOutgoing = false, action = "") {
    const timestamp = new Date().toLocaleString("vi-VN");
    const direction = isOutgoing ? "📤 OUT" : "📥 IN";
    const thread = threadType === ThreadType.User ? "User" : "Group";
    const actionIcon = action ? `[${action}]` : "";
    
    console.log(`[${timestamp}] ${actionIcon} ${direction} ${thread} [${threadId}]: ${message}`);
}

// ============================================================
// FUNCTION KHỞI ĐỘNG BOT
// ============================================================
async function startBot() {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 ĐANG KHỞI ĐỘNG SMART ZALO BOT...");
    console.log("=".repeat(60) + "\n");

    const config = loadConfig();
    console.log(`📝 Đã tải ${config.keywords.length} từ khóa`);
    console.log(`⚙️  Auto Reply: ${config.settings.autoReply ? "BẬT" : "TẮT"}`);
    console.log(`⏱️  Delay: ${config.settings.replyDelay}ms`);
    console.log(`🎯 Mode: CHỈ TRẢ LỜI KHI ĐÚNG CÚ PHÁP\n`);

    const zalo = new Zalo({ imageMetadataGetter: async () => ({ height: 0, width: 0, size: 0 }) });

    try {
        let api;

        // Kiểm tra session
        if (fs.existsSync(SESSION_FILE)) {
            console.log("📂 Đã tìm thấy file session");
            console.log("🔐 Đang thử đăng nhập bằng session...");

            try {
                const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));
                const sessionAge = Date.now() - sessionData.timestamp;
                
                if (sessionAge > 30 * 24 * 60 * 60 * 1000) {
                    console.log("⚠️  Session quá cũ (>30 ngày)");
                    fs.unlinkSync(SESSION_FILE);
                    throw new Error("Session expired");
                } else {
                    console.log("✅ Session hợp lệ, đang đăng nhập...");
                    api = await zalo.login(sessionData.context);
                    console.log("✅ Đăng nhập thành công bằng session!\n");
                }
            } catch (error) {
                console.log("⚠️  Không thể đăng nhập bằng session:", error.message);
                throw new Error("Session login failed");
            }
        } else {
            console.log("❌ Không tìm thấy file session!");
            throw new Error("No session file found");
        }

        console.log("=".repeat(60));
        console.log("✅ BOT ĐĂNG NHẬP THÀNH CÔNG!");
        console.log("=".repeat(60) + "\n");

        // Lắng nghe tin nhắn với logic đơn giản
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

            // Log tin nhắn đến
            logMessage(messageContent, threadId, threadType, false, "RECEIVED");

            // Tìm từ khóa khớp CHÍNH XÁC
            const matchedKeyword = findExactKeyword(messageContent, config.keywords);

            // CHỈ TRẢ LỜI KHI ĐÚNG CÚ PHÁP
            if (matchedKeyword) {
                if (config.settings.replyDelay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, config.settings.replyDelay));
                }

                try {
                    // GỬI TIN NHẮN TRẢ LỜI
                    await api.sendMessage(
                        { msg: matchedKeyword.reply, quote: message.data },
                        threadId,
                        threadType
                    );
                    
                    logMessage(matchedKeyword.reply, threadId, threadType, true, "REPLIED");
                    
                    // ✅ SỬA LỖI: THỰC SỰ ĐÁNH DẤU CHƯA ĐỌC
                    try {
                        await api.addUnreadMark(threadId, threadType);
                        console.log(`📌 ✅ Đã đánh dấu chưa đọc thành công!`);
                    } catch (unreadError) {
                        console.error(`❌ Lỗi đánh dấu chưa đọc:`, unreadError.message);
                    }
                    
                    console.log(`\n`);
                    
                } catch (error) {
                    console.error("❌ Lỗi khi trả lời:", error.message);
                }
            } else {
                // KHÔNG TRẢ LỜI - CHỈ LOG
                console.log(`🚫 KHÔNG TRẢ LỜI: Tin nhắn không đúng cú pháp\n`);
            }
        });

        // Bắt đầu lắng nghe
        api.listener.start();

        console.log("🎧 Bot đang lắng nghe tin nhắn CÁ NHÂN...");
        console.log("🎯 Bot CHỈ trả lời khi đúng cú pháp");
        console.log("🚫 Bot BỎ QUA tin nhắn NHÓM");
        console.log("🛑 Nhấn Ctrl+C để dừng bot\n");
        console.log("=".repeat(60) + "\n");
    } catch (error) {
        console.error("\n❌ LỖI KHỞI ĐỘNG BOT:", error.message);
        process.exit(1);
    }
}

// ============================================================
// XỬ LÝ THOÁT CHƯƠNG TRÌNH
// ============================================================
process.on("SIGINT", () => {
    console.log("\n\n🛑 Đang dừng Bot...");
    console.log("👋 Tạm biệt!\n");
    process.exit(0);
});

process.on("uncaughtException", (error) => {
    console.error("\n❌ LỖI NGHIÊM TRỌNG:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
});

// ============================================================
// KHỞI ĐỘNG BOT
// ============================================================
startBot().catch((error) => {
    console.error("❌ Lỗi không mong đợi:", error.message);
    process.exit(1);
});
