const { Zalo, ThreadType } = require("zca-js");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================
// HTTP SERVER ĐỂ KEEP-ALIVE TRÊN REPLIT/RENDER
// ============================================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Zalo Bot Status</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px;
                    background: #f5f5f5;
                }
                .status { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .online { color: #22c55e; font-weight: bold; }
                h1 { color: #333; }
            </style>
        </head>
        <body>
            <div class="status">
                <h1>✅ Zalo Bot Đang Hoạt Động</h1>
                <p>🤖 Bot tự động trả lời tin nhắn Zalo</p>
                <p>📊 Status: <span class="online">ONLINE</span></p>
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
// FUNCTION XỬ LÝ METADATA ẢNH
// ============================================================
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
        console.error("❌ Lỗi đọc metadata ảnh:", error.message);
        return { height: 0, width: 0, size: 0 };
    }
}

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
            defaultReply: "Xin lỗi, có lỗi xảy ra.",
            settings: {
                autoReply: true,
                replyDelay: 1000,
                logMessages: true,
            },
        };
    }
}

// ============================================================
// FUNCTION TÌM TỪ KHÓA
// ============================================================
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

// ============================================================
// FUNCTION GHI LOG
// ============================================================
function logMessage(message, threadId, threadType, isOutgoing = false) {
    const timestamp = new Date().toLocaleString("vi-VN");
    const direction = isOutgoing ? "📤 OUT" : "📥 IN";
    const thread = threadType === ThreadType.User ? "User" : "Group";
    console.log(`[${timestamp}] ${direction} ${thread} [${threadId}]: ${message}`);
}

// ============================================================
// FUNCTION TẠO QR URL
// ============================================================
function generateQRUrl() {
    try {
        const qrPath = path.join(__dirname, 'qr.png');
        console.log(`🔍 Kiểm tra file QR tại: ${qrPath}`);
        
        if (fs.existsSync(qrPath)) {
            console.log("✅ Tìm thấy file qr.png");
            
            // Đọc file QR và tạo URL
            const qrData = fs.readFileSync(qrPath);
            const base64QR = qrData.toString('base64');
            
            console.log("\n" + "=".repeat(60));
            console.log("🔗 QR CODE URL:");
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(base64QR)}`);
            console.log("\n👆 COPY URL TRÊN, DÁN VÀO TRÌNH DUYỆT ĐỂ XEM QR!");
            console.log("📱 Hoặc mở file 'qr.png' nếu đang chạy local");
            console.log("=".repeat(60) + "\n");
            return true;
        } else {
            console.log(`❌ Không tìm thấy file qr.png tại: ${qrPath}`);
            
            // Liệt kê tất cả file trong thư mục để debug
            try {
                const files = fs.readdirSync(__dirname);
                console.log("📁 Files trong thư mục:", files);
            } catch (listError) {
                console.log("❌ Không thể liệt kê files:", listError.message);
            }
            return false;
        }
    } catch (error) {
        console.log("⚠️ Không thể tạo QR URL:", error.message);
        console.log("📋 Error details:", error);
        return false;
    }
}

// ============================================================
// FUNCTION KHỞI ĐỘNG BOT
// ============================================================
async function startBot() {
    console.log("\n" + "=".repeat(60));
    console.log("🤖 ĐANG KHỞI ĐỘNG ZALO BOT...");
    console.log("=".repeat(60) + "\n");

    const config = loadConfig();
    console.log(`📝 Đã tải ${config.keywords.length} từ khóa`);
    console.log(`⚙️  Auto Reply: ${config.settings.autoReply ? "BẬT" : "TẮT"}`);
    console.log(`⏱️  Delay: ${config.settings.replyDelay}ms\n`);

    const zalo = new Zalo({ imageMetadataGetter });

    try {
        let api;

        // Thử đăng nhập bằng session cũ
        if (fs.existsSync(SESSION_FILE)) {
            console.log("📂 Đã tìm thấy session cũ");
            console.log("🔐 Đang thử đăng nhập bằng session cũ...");

            try {
                const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, "utf8"));

                // Kiểm tra session hợp lệ (< 30 ngày)
                const sessionAge = Date.now() - sessionData.timestamp;
                if (sessionAge > 30 * 24 * 60 * 60 * 1000) {
                    console.log("⚠️  Session quá cũ (>30 ngày), cần quét QR lại");
                    fs.unlinkSync(SESSION_FILE);
                } else {
                    // Đăng nhập bằng context
                    api = await zalo.login(sessionData.context);
                    console.log("✅ Đăng nhập thành công bằng session!\n");
                }
            } catch (error) {
                console.log("⚠️  Session hết hạn, cần quét QR lại...\n");
                fs.unlinkSync(SESSION_FILE);
            }
        }

        // Nếu không có session hoặc session hết hạn → Quét QR
        if (!api) {
            console.log("📱 QUÉT QR CODE:");
            console.log("👉 Mở file 'qr.png' trong thư mục dự án");
            console.log("👉 Quét bằng Zalo: Cá nhân → Thiết bị đã đăng nhập\n");

            // Tạo QR URL ngay lập tức
            console.log("🔍 Đang tạo QR code...");
            
            try {
                // Thêm timeout cho loginQR()
                const qrPromise = zalo.loginQR();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('QR generation timeout after 30 seconds')), 30000);
                });
                
                console.log("⏳ Đang chờ tạo QR code (timeout 30s)...");
                api = await Promise.race([qrPromise, timeoutPromise]);
                console.log("✅ QR code đã được tạo!");
                
            } catch (qrError) {
                console.error("❌ Lỗi tạo QR code:", qrError.message);
                console.log("💡 QR generation failed trên Render environment");
                console.log("🔄 Bot sẽ dừng - cần dùng session từ Replit");
                
                throw qrError;
            }
            
            // Tạo QR URL ngay sau khi loginQR() hoàn thành
            console.log("🔄 Đang tạo QR URL...");

            // Thử tạo QR URL nhiều lần với debug chi tiết
            let qrUrlCreated = false;
            for (let i = 0; i < 5; i++) {
                console.log(`🔄 Thử lần ${i + 1}/5...`);
                
                if (generateQRUrl()) {
                    qrUrlCreated = true;
                    break;
                }
                
                // Đợi 2 giây giữa các lần thử
                if (i < 4) { // Không đợi ở lần cuối
                    console.log("⏳ Đợi 2 giây...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (!qrUrlCreated) {
                console.log("⚠️ Không thể tạo QR URL từ file sau 5 lần thử");
                console.log("💡 Có thể file qr.png không được tạo trên Render");
                console.log("💡 Thử mở file 'qr.png' trực tiếp nếu có");
                
                // Debug: Kiểm tra quyền ghi file
                try {
                    const testFile = path.join(__dirname, 'test-write.txt');
                    fs.writeFileSync(testFile, 'test');
                    fs.unlinkSync(testFile);
                    console.log("✅ Có quyền ghi file trong thư mục");
                } catch (writeError) {
                    console.log("❌ Không có quyền ghi file:", writeError.message);
                }
            }

            // Lưu session sau khi login thành công
            if (api && api.getContext) {
                try {
                    const context = api.getContext();

                    // Lưu TOÀN BỘ context
                    const sessionData = {
                        timestamp: Date.now(),
                        loginMethod: "QR",
                        context: context,
                    };

                    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
                    console.log(`✅ Đã lưu session vào ${SESSION_FILE}`);
                    console.log("💡 Lần sau sẽ tự động đăng nhập, không cần quét QR!\n");
                } catch (err) {
                    console.error("❌ Lỗi lưu session:", err.message);
                }
            }
        }

        console.log("=".repeat(60));
        console.log("✅ ĐĂNG NHẬP THÀNH CÔNG!");
        console.log("=".repeat(60) + "\n");

        // Lắng nghe tin nhắn
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
            if (config.settings.logMessages) {
                logMessage(messageContent, threadId, threadType);
            }

            // Tìm từ khóa khớp
            const matchedKeyword = findMatchingKeyword(messageContent, config.keywords);

            // Trả lời theo từ khóa
            if (matchedKeyword) {
                if (config.settings.replyDelay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, config.settings.replyDelay));
                }

                try {
                    await api.sendMessage(
                        { msg: matchedKeyword.reply, quote: message.data },
                        threadId,
                        threadType
                    );
                    console.log(`✅ Đã trả lời: "${matchedKeyword.reply}"`);

                    // Đánh dấu chưa đọc
                    await api.addUnreadMark(threadId, threadType);
                    console.log(`📌 Đã đánh dấu chưa đọc\n`);
                } catch (error) {
                    console.error("❌ Lỗi khi trả lời:", error.message);
                }
            }
            // Trả lời mặc định
            else if (config.settings.autoReply) {
                if (config.settings.replyDelay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, config.settings.replyDelay));
                }

                try {
                    await api.sendMessage(
                        { msg: config.defaultReply, quote: message.data },
                        threadId,
                        threadType
                    );
                    console.log(`🤖 Đã trả lời mặc định`);

                    // Đánh dấu chưa đọc
                    await api.addUnreadMark(threadId, threadType);
                    console.log(`📌 Đã đánh dấu chưa đọc\n`);
                } catch (error) {
                    console.error("❌ Lỗi khi trả lời mặc định:", error.message);
                }
            }
        });

        // Bắt đầu lắng nghe
        api.listener.start();

        console.log("🎧 Bot đang lắng nghe tin nhắn CÁ NHÂN...");
        console.log("🚫 Bot BỎ QUA tin nhắn NHÓM");
        console.log("🛑 Nhấn Ctrl+C để dừng bot\n");
        console.log("=".repeat(60) + "\n");
    } catch (error) {
        console.error("\n❌ LỖI KHỞI ĐỘNG BOT:", error.message);
        console.log("\n💡 Gợi ý:");
        console.log("   - Kiểm tra kết nối internet");
        console.log("   - Thử quét lại QR code");
        console.log("   - Chạy lại bot: npm start\n");
        process.exit(1);
    }
}

// ============================================================
// XỬ LÝ THOÁT CHƯƠNG TRÌNH
// ============================================================
process.on("SIGINT", () => {
    console.log("\n\n🛑 Đang dừng bot...");
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
