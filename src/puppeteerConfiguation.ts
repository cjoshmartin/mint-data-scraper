import { LaunchOptions } from 'puppeteer';

const config: LaunchOptions = {
  executablePath: process.env.CHROMEPATH,
  args: ['--no-sandbox'],
  devtools: true,
  headless: false,
  slowMo: 10,
};

export default  config;