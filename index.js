require('dotenv').config({ debug: true})

const puppeteer = require('puppeteer');
const client = require('twilio')(process.env.TWLLIO_ACCOUNTSID, process.env.TWLLIO_AUTHTOKEN);
const MongoClient = require('mongodb').MongoClient;

const { utils, sleep } = require("./utils");

class Mint {
    constructor() {
        this._browser = await puppeteer.launch(
            {
                // args: ['--no-sandbox'],
                // devtools: true,
                headless: false,
            },
        )
        this._page = await this._browser.newPage()
        this._page.setViewport({ width: 1366, height: 768 })

        this.utilsFunctions = new utils(this._browser, this._page)

        this._MongoUrl = process.DB_URL
        this._dbName = process.env.DB_NAME

        this._loginForm = {
            username: 'input[type="email"]',
            password: 'input[type="password"]',
            submit: 'button[type="submit"]'
        }

    }

    async getFacts() {
        const forEachFact = (output) => {
            return (el) => { // Currying
            const childrenNodes = el.children
            const catagory = childrenNodes[0].textContent
            const facts = childrenNodes[1].childrenret

            output[catagory] = { "place": facts[1].textContent, amount: facts[0].textContent }
        }
    }

        return await this.utilsFunctions.page.evaluate(() => {
            output = {}
           const factsSelectors = this.utilsFunctions.getArrayOfSelectors('#facts dl:not(.hide)', document)
           factsSelectors.forEach(forEachFact(output))
            console.log(`Facts: ${output}`)
            return output
        })
    }

    async getVerifcationCode(){
        await sleep(30000)
        return await client.messages.list({ limit: 1 }).then((messages) => {
            const output = messages[0].body
            console.log(output)
            const verifitionCode = output.match(/\d{6}/)
            return verifitionCode[0]
        })
    }

    async verifitionPage(){
        if (this.utilsFunctions.isSelectorPresent('#ius-label-mfa-send-an-email-to')) {
            await this.utilsFunctions.clickButton('input[type="submit"')

            const code = this.getVerifcationCode()

            await this.utilsFunctions.waitForSelector('#ius-mfa-confirm-code')

            await this.utilsFunctions.page.evaluate((verificationCode) => {
                // const inputField =
                (document.getElementById('ius-mfa-confirm-code')).value = 999
                // console.log(inputField)
                // inputField.value = verificationCode
            }, code)

            await this.utilsFunctions.page.type('input[id="ius-mfa-confirm-code"]', code)
            await this.utilsFunctions.page.keyboard.sendCharacter(code)
            const input = await this.utilsFunctions.page.$(`#ius-mfa-confirm-code`);
            await input.press('Backspace');
            await input.type(code);

            await this.utilsFunctions.clickButton('#ius-mfa-otp-sms-header')
            await sleep(1000)
            await this.utilsFunctions.clickButton('input[type="submit"]')
        }

    }

    async login(){
        await this.utilsFunctions.navigateTo('https://mint.intuit.com/overview.event')

        await this.utilsFunctions.waitForSelector(form.username)
        await this.utilsFunctions.login(
            process.env.MINT_USERNAME,
            process.env.MINT_PASSWORD,
            this._loginForm
        )
        if(this.utilsFunctions.parseBool(process.env.Should_LOAD_VERIFIY)){
            await this.verifitionPage()
        }
    }

    async getTrends(){
        await this.utilsFunctions.navigateTo("https://mint.intuit.com/trend.event")
        await this.utilsFunctions.waitForSelector('h1.spending')
        await sleep(5000)
        await this.utilsFunctions.getSelectorFromArrayAndClick('.left-nav .open a', 'By Merchant')

        await sleep(5000)
        await this.utilsFunctions.clickButton('a#show-more-less')

        await sleep(5000)

        const spending = await this.utilsFunctions.page.evaluate(() => {
            const tranactionList = this.utilsFunctions.getArrayOfSelectors('#portfolio-entries tr', document).map((element) => {
                const child = element.children
                const company = child[0].textContent
                const amount = child[1].textContent
                return { company, amount }
            }).filter(e => e['amount'].length > 0)
            return { ...tranactionList }
        })

        const funFacts = await mint.getFacts()

        await this.utilsFunctions.page.evaluate(async () => {
            const netIncomeSelector = this.utilsFunctions.getSelectorFromArrayOfSelectors('.left-nav a', 'Net Income')
            netIncomeSelector.click()

            const netIncomeContainer = this.utilsFunctions.getArrayOf(netIncomeSelector.parentNode.querySelectorAll('.open a'))
            const OverTimeSelector = netIncomeContainer.find(e => e.text == 'Over Time')
            OverTimeSelector.click()
        })

        await sleep(3000)

        const netIncome = await mint.getFacts()

        return {
            spending,
            funFacts,
            netIncome
        }
    }

    async insertInDB(output){
        const client = new MongoClient(this._MongoUrl)

        try {
            await client.connect()
            console.log(`correctly connected to ${this._MongoUrl}`)

            const db = client.db(this._dbName)

            await db.collection('inserts').insertOne(output)
        } catch (error) {
            console.log(error.stack)
        }
        client.close()

    }
}


const mintScrape = async () => {
    const mint =  new Mint(funcs)

    // login
    await mint.login()

    await sleep(5000)
    await mint._page.screenshot({ path: 'buddy-screenshot.png' });

    // breaking here 

    const assetsSelector = "li.asset-total >  span"
    const DebtTotalSelector = "li.debt-total >  span"
    const netWorthSelector = "li.net-worth >  span"
    const cashSelector = ".cash >  var"
    const assetsList = [
        [assetsSelector, "assetsAmount"],
        [DebtTotalSelector, 'DebtAmount'],
        [netWorthSelector, 'netWorthAmount'],
        [cashSelector, 'cashAmount']
    ]
    assetsObj = {}
    await sleep(3000)

    for (const asset in assetsList ){
        const selector = asset[0]
        const assetName = asset[1]
        console.log(`Scraping the asset: ${assetName}`)

        assetsObj[assetName] = await funcs.getInnerTextOfSelector(selector)
    }

    const trends = await mint.getTrends()
    await funcs.closeBrowser()

    const output = {
        ...assetsObj,
        ...trends
    }

    // MongoDb stuff
    mint.insertInDB(output)
    return output
}

mintScrape().catch((e) => console.log(e)).then(output => console.log(JSON.stringify(output, '', 4)))
