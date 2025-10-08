const fs = require("fs");
const path = require("path");

// Test function để kiểm tra từ khóa
function testKeywords() {
    console.log("🧪 Testing keyword matching...");
    
    const configPath = path.join(__dirname, "config", "keywords.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    const testMessages = [
        "xin chào",
        "Xin chào bạn",
        "Tôi muốn hỏi giá",
        "Giá sản phẩm này bao nhiêu?",
        "Cần hỗ trợ",
        "Cảm ơn bạn",
        "Tạm biệt",
        "Tin nhắn không khớp"
    ];
    
    testMessages.forEach(message => {
        const lowerMessage = message.toLowerCase().trim();
        let matched = false;
        
        for (const item of config.keywords) {
            const keyword = item.keyword.toLowerCase();
            
            if (item.exactMatch) {
                if (lowerMessage === keyword) {
                    console.log(`✅ "${message}" -> "${item.reply}"`);
                    matched = true;
                    break;
                }
            } else {
                if (lowerMessage.includes(keyword)) {
                    console.log(`✅ "${message}" -> "${item.reply}"`);
                    matched = true;
                    break;
                }
            }
        }
        
        if (!matched) {
            console.log(`❌ "${message}" -> "${config.defaultReply}"`);
        }
    });
}

testKeywords();