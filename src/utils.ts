import  puppeteer, { Page, Browser } from  'puppeteer';

const fillField = (selector, val) => { document.querySelector(selector).value = val; };
// @ts-ignore
const clickButton = (selector: string) => { document.querySelector(selector).click(); };

export interface LoginForm {
  readonly username: string;
  readonly password: string;
  readonly submit: string;
}

class Utils {
  public browser: Browser;
  public page: Page;

  public  constructor(browser: Browser, page: Page) { // don't call this directly
    this.browser = browser;
    this.page = page;
  }

  public static async builder(config) {
      // https://stackoverflow.com/questions/43431550/async-await-class-constructor
    const browser = await puppeteer.launch(config);

    const page = await browser.newPage();
    page.setViewport({ width: 1366, height: 768 });

    return new Utils(browser, page);
  }

  public static promisedBasedSleep(milliseconds: number): Promise<any> {
    console.log(`sleeping for ${milliseconds}ms`);
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  async clickButton(field: string) {
    await this.page.evaluate(clickButton, field);
  }
  async clickSubmit() {
    await this.clickButton('button[type="submit"]');
  }
  getArrayOf(items) { // todo: what is the type of `items`
    return Array.from(items);
  }
  getArrayOfSelectors(selectors, document) {
    return this.getArrayOf(document.querySelectorAll(selectors));
  }

  getSelectorFromArrayOfSelectors(selectors, searchValue, document) {
    const listOfSelectors = this.getArrayOfSelectors(selectors, document);
    // @ts-ignore
    return listOfSelectors.find(e => e.text === searchValue);
  }

  async getSelectorFromArrayAndClick(selectors: string, searchValue: string) {

    const selectedSelector: HTMLAnchorElement = await this.page.evaluate((selectors, searchValue, sleepTime= 0) =>  {
      const queryList = document.querySelectorAll<HTMLAnchorElement>(selectors) as any;
      const listOfSelectors = Array.from(queryList) as any;
      const selector = listOfSelectors.find(e => e.text === searchValue) as any;
  //   await Utils.promisedBasedSleep(sleepTime);
      selector.click();
      return selector;

    },
                                                      selectors, searchValue);

    const a = {};
  }
  async getInnerTextOfSelector(selector) {
    await this.waitForSelector(selector);

    return await this.page.evaluate((elementSelector) => {
      return document.querySelector(elementSelector).innerText;
    },                              selector);
  }

  async login(username: string, password: string, form: LoginForm) {
    await this.page.type(form.username, username);
    await this.page.type(form.password, password);
    this.clickButton(form.submit);
  }

  async waitForSelector(selector: string) {
    await this.page.waitForSelector(selector)
            .then(() => console.log(`Saw '${selector}'`))
            .catch(this.closeBrowser);
  }

  async isSelectorPresent(selector, timeOut = 5000) {
    try {
      await Utils.promisedBasedSleep(timeOut);
      await this.waitForSelector(selector);
      return true;

    } catch (error) {
      console.log(error); // might be an error because of a bad selector
      return false;
    }
  }

  async waitAndClick(selector: string) {
    this.waitForSelector(selector);
    this.clickButton(selector);
  }
  async navigateTo(url: string) {
    this.page.goto(url);
  }
  async closeBrowser() {
    await this.browser.close();
  }

  parseBool(val: boolean | string) {
    return val === true || val === 'true';
  }
}

export default Utils;