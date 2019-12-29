
import twilio  from 'twilio';
import mongodb from 'mongodb';
import utils, { LoginForm } from './utils';
import { ElementHandle } from 'puppeteer';

export default class Mint extends utils{
  private mongoUrl: string;
  private dbName: string;
  private twilioClient: any; // todo: figure out this type
  private loginForm: LoginForm;

  constructor(browser, page) { // don't call this directly
    super(browser, page);
    this.mongoUrl = process.env.DB_URL;
    this.dbName = process.env.DB_NAME;
    this.twilioClient =  twilio(process.env.TWLLIO_ACCOUNTSID, process.env.TWLLIO_AUTHTOKEN);

    this.loginForm = {
      username: 'input[type="email"]',
      password: 'input[type="password"]',
      submit: 'button[type="submit"]',
    };

  }

  public static async builder(config) {
    const superClassBuilder = await utils.builder(config);

    return new Mint(superClassBuilder.browser, superClassBuilder.page);
  }

  async getFacts() {
    // const output: object = {};
    return await this.page.$$eval('#facts dl:not(.hide)',
                                  (nodes: Element[]) => {
                                    const output = {};
                                    nodes.forEach((el: Element) => {
                                      const childrenNodes = el.children;
                                      const catagory: string = childrenNodes.item(0).textContent;
                                      const facts = childrenNodes.item(1).children;

                                      output[catagory] =
                                      {
                                        place: facts.item(1).textContent,
                                        amount: facts.item(0).textContent,
                                      };
                                    });
                                    console.log(`Facts: ${output}`);
                                    return output;
                                  });
  }

  async getVerifcationCode() {
    await Mint.promisedBasedSleep(30000);
    return await this.twilioClient.messages.list({ limit: 1 }).then((messages) => {
      const output = messages[0].body;
      console.log(output);
      const verifitionCode = output.match(/\d{6}/);
      return verifitionCode[0];
    });
  }

  async verifitionPage() {
    if (this.isSelectorPresent('#ius-label-mfa-send-an-email-to')) {
      await this.clickButton('input[type="submit"');

      const code = await this.getVerifcationCode();

      await this.waitForSelector('#ius-mfa-confirm-code');

      await this.page.type('input[id="ius-mfa-confirm-code"]', code);
      await this.page.keyboard.sendCharacter(code);
      await Mint.promisedBasedSleep(1000);
      await this.page.keyboard.press('Enter');
    }

  }

  async loginToMint() {
    await this.navigateTo('https://mint.intuit.com/overview.event');

    await this.waitForSelector(this.loginForm.username);
    await this.login(
            process.env.MINT_USERNAME,
            process.env.MINT_PASSWORD,
            this.loginForm,
        );

    const isThereAVerifcation: boolean = await this.isSelectorPresent('#ius-mfa-user-mobile-phone');
    if (isThereAVerifcation) {
      await this.verifitionPage();
    }
  }

  async getTrends() {
    await this.navigateTo('https://mint.intuit.com/trend.event');
    await this.waitForSelector('h1.spending');
    await Mint.promisedBasedSleep(5000);
    await this.getSelectorFromArrayAndClick('.left-nav .open a', 'By Merchant', 1000);
    await Mint.promisedBasedSleep(5000);
    await this.clickButton('a#show-more-less');

    await Mint.promisedBasedSleep(5000);

    interface Tranaction {
      company: string;
      amount: string;
    }
    const tranactionList: object[] = await this.page.$$eval('#portfolio-entries tr',
                                                            (nodes: Element[]) => nodes.map(
                                                              (e: Element) => {
                                                                const company = e.children.item(0).textContent;
                                                                const amount = e.children.item(1).textContent;

                                                                return { company, amount };
                                                              })
                                                              .filter(
                                                                (e: Tranaction) => e.amount.length > 0),
    );

    const funFacts = await this.getFacts();

    const netIncomeSelectors: ElementHandle[] = await this.page.$x('//ul[@class="top"]/li[3]/a[text()="Net Income"]');
    const netIncomeSelector: ElementHandle = netIncomeSelectors[0];
    await netIncomeSelector.click();

    const overTimeSelectors: ElementHandle[] = await this.page.$x('//ul[@class="top"]/li[3]/ul/li/a[text()="Over Time"]');
    const overTimeSelector: ElementHandle = overTimeSelectors[0];
    await overTimeSelector.click();

    await Mint.promisedBasedSleep(3000);

    const netIncome = await this.getFacts();

    return {
      funFacts,
      netIncome,
      spending: tranactionList,
    };
  }

  async insertInDB(output) {
    const client = new mongodb.MongoClient(this.mongoUrl);

    try {
      await client.connect();
      console.log(`correctly connected to ${this.mongoUrl}`);

      const db = client.db(this.dbName);

      await db.collection('inserts').insertOne(output);
    } catch (error) {
      console.log(error.stack);
    }
    client.close();

  }
}