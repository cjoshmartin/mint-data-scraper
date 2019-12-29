
import twilio  from 'twilio';
import mongodb from 'mongodb';
import utils, { LoginForm } from './utils';

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
    const forEachFact = (output) => {
      return (el) => { // Currying
        const childrenNodes = el.children;
        const catagory = childrenNodes[0].textContent;
        const facts = childrenNodes[1].childrenret;

        output[catagory] = { place: facts[1].textContent, amount: facts[0].textContent };
      };
    };

    return await this.page.evaluate(() => {
      const output = {};
      const factsSelectors = this
                             .getArrayOfSelectors('#facts dl:not(.hide)', document);
      factsSelectors.forEach(forEachFact(output));
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
    await this.getSelectorFromArrayAndClick('.left-nav .open a', 'By Merchant');
    const a = {};
//     await Mint.promisedBasedSleep(5000);
//     await this.clickButton('a#show-more-less');

//     await Mint.promisedBasedSleep(5000);

//     const spending = await this.page.evaluate(() => {
//       const tranactionList = this
//                             .getArrayOfSelectors('#portfolio-entries tr', document)
//                             .map((element) => {

//                 // @ts-ignore
//                 const child = element.children;
//                 const company = child[0].textContent;
//                 const amount = child[1].textContent;
//                 return { company, amount };
//             }).filter(e => e['amount'].length > 0);
//       return { ...tranactionList };
//     });

//     const funFacts = await this.getFacts();

//     await this.page.evaluate(async () => {
//       const netIncomeSelector = this
//                        .getSelectorFromArrayOfSelectors('.left-nav a', 'Net Income', document);
// // @ts-ignore
//       netIncomeSelector.click();

//       const netIncomeContainer = this
//                                  .getArrayOf(netIncomeSelector
// // @ts-ignore
//                                              .parentNode.querySelectorAll('.open a'),
//                                             );
// // @ts-ignore
//       const overTimeSelector = netIncomeContainer.find(e => e.text === 'Over Time');
// // @ts-ignore
//       overTimeSelector.click();
//     });

//     await Mint.promisedBasedSleep(3000);

//     const netIncome = await this.getFacts();

//     return {
//       spending,
//       funFacts,
//       netIncome,
//     };
    return {
      spending: 0,
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