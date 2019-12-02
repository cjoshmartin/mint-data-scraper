require('dotenv').config({ debug: true})

const puppeteer = require('puppeteer');
const client = require('twilio')(process.env.TWLLIO_ACCOUNTSID, process.env.TWLLIO_AUTHTOKEN);
const MongoClient = require('mongodb').MongoClient;

const { utils, sleep } = require("./utils");

class Mint {
    constructor(utilsFunctions) {
        this.utilsFunctions = utilsFunctions
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
}



const mintScrape = async () => {
    const browser = await puppeteer.launch(
        {
            // args: ['--no-sandbox'],
            // devtools: true,
            headless: false,
        },
    )

    const page = await browser.newPage()
    const funcs = await new utils(browser, page)
    const mint =  new Mint(funcs)

    funcs.page.setViewport({ width: 1366, height: 768 });
    await funcs.navigateTo('https://mint.intuit.com/overview.event')

    const form = {
        username: 'input[type="email"]',
        password: 'input[type="password"]',
        submit: 'button[type="submit"]'
    }

    // login
    await funcs.waitForSelector(form.username)
    await funcs.login(
        process.env.MINT_USERNAME,
        process.env.MINT_PASSWORD,
        form
    )

    // verifcation page if it exist 

    // if (funcs.isSelectorPresent('#ius-label-mfa-send-an-email-to')){
    //     await funcs.clickButton('input[type="submit"')

    //     await sleep(30000)

    //     const code = await client.messages.list({ limit: 1 }).then((messages) => {
    //         const output = messages[0].body
    //         console.log(output)
    //         const verifitionCode = output.match(/\d{6}/)
    //         return verifitionCode[0]
    //     })

    //     await funcs.waitForSelector('#ius-mfa-confirm-code')

    // await funcs.page.evaluate((verificationCode) =>{
    //     // const inputField =
    //      (document.getElementById('ius-mfa-confirm-code')).value = 999
    //     // console.log(inputField)
    //     // inputField.value = verificationCode
    // }, code)
    // await funcs.page.type('input[id="ius-mfa-confirm-code"]', code)
    // await funcs.page.keyboard.sendCharacter(code)
    // const input = await funcs.page.$(`#ius-mfa-confirm-code`);
    // await input.press('Backspace');
    // await input.type(code);

    // await funcs.clickButton('#ius-mfa-otp-sms-header')
    // await sleep(1000)
    // await funcs.clickButton('input[type="submit"]')
    // }

    await sleep(5000)
    await page.screenshot({ path: 'buddy-screenshot.png' });

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

    await funcs.navigateTo("https://mint.intuit.com/trend.event")

    await funcs.waitForSelector('h1.spending')
    await sleep(5000)
    await funcs.page.evaluate(() => {
        const to_click = Array.from(document.querySelectorAll('.left-nav .open a')).find(e => e.text === 'By Merchant')
        console.log(to_click)
        to_click.click()
    })


    await sleep(5000)

    await funcs.clickButton('a#show-more-less')

    await sleep(5000)

    const spending = await funcs.page.evaluate(() => {
        const tranactionList = Array.from(document.querySelectorAll('#portfolio-entries tr')).map((element) => {
            const child = element.children
            const company = child[0].textContent
            const amount = child[1].textContent
            return { company, amount }
        }).filter(e => e['amount'].length > 0)
        return { ...tranactionList }
    })

    const funFacts = await mint.getFacts()

    await funcs.page.evaluate(async () => {
        const netIncomeSelector = Array.from(document.querySelectorAll('.left-nav a')).find(e => e.text === 'Net Income')
        netIncomeSelector.click();

        Array.from(netIncomeSelector.parentNode.querySelectorAll('.open a')).find(e => e.text == 'Over Time').click()
    })

    await sleep(3000)

    const netIncome = await mint.getFacts()

    await funcs.closeBrowser()

    const output = {
        ...assetsObj,
        spending,
        funFacts,
        netIncome,
    }


    // MongoDb stuff

    const MongoUrl = process.env.DB_URL
    const dbName = process.env.DB_NAME

    const client = new MongoClient(MongoUrl)

    try {
        await client.connect()
        console.log(`correctly connected to ${MongoUrl}`)

        const db = client.db(dbName)

        await db.collection('inserts').insertOne(output)
    } catch (error) {
        console.log(error.stack)
    }

    client.close()

    return output
}

mintScrape().catch((e) => console.log(e)).then(output => console.log(JSON.stringify(output, '', 4)))
