import { LaunchOptions } from 'puppeteer';

const config: LaunchOptions = {
    executablePath: process.env.CHROMEPATH,
    args: ['--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'] ,
        // devtools: true,
        headless: true,
        slowMo: 10,
};

export default  config;
