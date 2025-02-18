const axios = require('axios');
const readline = require('readline');
const fs = require('fs').promises;
const open = require('open');

// Tạo interface để đọc input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors class để tạo màu cho console
const Colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m"
};

// Headers cho requests
const headers = {
    'authority': 'traodoisub.com',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
    'user-agent': 'traodoisub tiktok tool'
};

// Các hàm tiện ích
const clearScreen = () => {
    console.clear();
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms * 1000));

const question = (text) => {
    return new Promise((resolve) => {
        rl.question(Colors.green + text + Colors.reset, resolve);
    });
};

// Class chính cho TDS API
class TraoDoiSubAPI {
    constructor() {
        this.baseUrl = 'https://traodoisub.com/api';
        this.token = '';
    }

    async loginTDS(token) {
        try {
            const response = await axios.get(`${this.baseUrl}/?fields=profile&access_token=${token}`, { headers });
            if (response.data.success) {
                clearScreen();
                console.log(Colors.green + `Đăng nhập thành công!\nUser: ${Colors.yellow}${response.data.data.user}${Colors.green} | Xu: ${Colors.yellow}${response.data.data.xu}`);
                this.token = token;
                return 'success';
            }
            return 'error_token';
        } catch (error) {
            return 'error';
        }
    }

    async checkTikTok(idTiktok) {
        try {
            const response = await axios.get(`${this.baseUrl}/?fields=tiktok_run&id=${idTiktok}&access_token=${this.token}`, { headers });
            if (response.data.success) {
                clearScreen();
                console.log(Colors.green + `${response.data.data.msg}|ID: ${Colors.yellow}${response.data.data.id}`);
                return 'success';
            }
            console.log(Colors.red + response.data.error);
            return 'error_token';
        } catch (error) {
            return 'error';
        }
    }

    async loadJob(typeJob) {
        try {
            const response = await axios.get(`${this.baseUrl}/?fields=${typeJob}&access_token=${this.token}`, { headers });
            if (response.data.data) {
                return response.data;
            }
            return 'error';
        } catch (error) {
            return 'error';
        }
    }

    async duyetJob(typeJob, uid) {
        try {
            const response = await axios.get(`${this.baseUrl}/coin/?type=${typeJob}&id=${uid}&access_token=${this.token}`, { headers });
            if (response.data.cache) {
                return response.data.cache;
            }
            if (response.data.success) {
                console.log(Colors.cyan + `Nhận thành công ${response.data.data.job_success} nhiệm vụ | ${Colors.green}${response.data.data.msg} | ${Colors.yellow}${response.data.data.xu}`);
                return 'success';
            }
            return 'error';
        } catch (error) {
            return 'error';
        }
    }
}

// Hàm chính
async function main() {
    const tds = new TraoDoiSubAPI();
    
    // Banner
    console.log(Colors.yellow + `
████████╗██████╗ ███████╗
╚══██╔══╝██╔══██╗██╔════╝
   ██║   ██║  ██║███████╗
   ██║   ██║  ██║╚════██║
   ██║   ██████╔╝███████║
   ╚═╝   ╚═════╝ ╚══════╝
    `);

    // Đăng nhập
    let token;
    try {
        token = await fs.readFile('TDS.txt', 'utf8');
    } catch {
        token = await question("Nhập token TDS: ");
    }

    const loginResult = await tds.loginTDS(token);
    if (loginResult !== 'success') {
        console.log(Colors.red + "Đăng nhập thất bại!");
        return;
    }

    // Lưu token
    await fs.writeFile('TDS.txt', token);

    // Nhập ID TikTok
    const idTiktok = await question("Nhập ID TikTok: ");
    const checkResult = await tds.checkTikTok(idTiktok);
    if (checkResult !== 'success') {
        console.log(Colors.red + "Kiểm tra ID TikTok thất bại!");
        return;
    }

    // Menu nhiệm vụ
    console.log(Colors.green + "\nDanh sách nhiệm vụ:");
    console.log(Colors.red + "1. Follow");
    console.log("2. Tim");
    
    const choice = await question("\nChọn nhiệm vụ (1-2): ");
    const delay = parseInt(await question("Nhập delay (giây): "));

    const jobType = choice === '1' ? 'tiktok_follow' : 'tiktok_like';
    const jobCache = choice === '1' ? 'TIKTOK_FOLLOW_CACHE' : 'TIKTOK_LIKE_CACHE';
    
    let count = 0;
    let successCount = 0;
    let failCount = 0;

    // Thêm xử lý Ctrl+C để dừng bot
    process.on('SIGINT', () => {
        console.log(Colors.yellow + '\n\nĐã dừng bot!');
        console.log(Colors.cyan + `Tổng số nhiệm vụ đã làm: ${count}`);
        console.log(Colors.green + `Thành công: ${successCount}`);
        console.log(Colors.red + `Thất bại: ${failCount}`);
        rl.close();
        process.exit();
    });

    console.log(Colors.cyan + '\nBắt đầu chạy bot... (Nhấn Ctrl+C để dừng)\n');

    while (true) {
        const jobs = await tds.loadJob(jobType);
        if (jobs === 'error' || !jobs.data) {
            console.log(Colors.yellow + 'Đang đợi nhiệm vụ mới...');
            await sleep(5);
            continue;
        }

        for (const job of jobs.data) {
            try {
                await open(job.link);
                const result = await tds.duyetJob(jobCache, job.id);
                
                if (result !== 'error') {
                    count++;
                    successCount++;
                    console.log(Colors.yellow + `[${count}] | ${new Date().toTimeString().split(' ')[0]} | ${job.id}`);
                    
                    // Hiển thị thống kê
                    const stats = `\n${Colors.cyan}Đã làm: ${count} | ${Colors.green}Thành công: ${successCount} | ${Colors.red}Thất bại: ${failCount}`;
                    console.log(stats);
                } else {
                    failCount++;
                }

                // Hiển thị countdown
                for (let i = delay; i > 0; i--) {
                    process.stdout.write(`\r${Colors.cyan}⏳ Đợi ${i}s...`);
                    await sleep(1);
                }
                process.stdout.write('\r' + ' '.repeat(20) + '\r');
                
            } catch (error) {
                console.log(Colors.red + `Lỗi: ${error.message}`);
                failCount++;
                await sleep(delay);
            }
        }
    }
}

main().catch(console.error);