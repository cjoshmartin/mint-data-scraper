const fill_field = (selector, val) => { document.querySelector(selector).value = val }
const _clickButton = (selector) => { document.querySelector(selector).click() }

const sleep = (milliseconds) => {
    console.log(`sleeping for ${milliseconds}ms`)
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

class utils {
    constructor(browser, page) {
        this.browser = browser;
        this.page = page;
    }
    async clickButton(field){
        await this.page.evaluate(_clickButton, field);
    }
    async clickSubmit(){
        await this.clickButton('button[type="submit"]')
    }
        getArrayOf(items){
            return Array.from(items)
        }
    async getArrayOfSelectors(selectors, document){
        return this.getArrayOf(document.querySelectorAll(selectors))
    }

    async getSelectorFromArrayOfSelectors(selectors, searchValue, document){
       const listOfSelectors = this.getArrayOfSelectors(selectors, document) 
       return listOfSelectors.find(e => e.text === searchValue)
    }
    async getSelectorFromArrayAndClick(){
        
        await this.page.evaluate(async (selectors, searchValue, sleepTime=0) => {
            const selector = this.getSelectorFromArrayOfSelectors(selectors, searchValue, document)
            await sleep(sleepTime)
            selector.click()

        })

    }
    async getInnerTextOfSelector(selector){
        await this.waitForSelector(selector)

        return await this.page.evaluate((_selector) => {
            return document.querySelector(_selector).innerText;
        }, selector);
    }

    async login(username, password, form) {
        await this.page.type(form.username, username);
        await this.page.type(form.password, password);
        this.clickButton(form.submit);
    }

    async waitForSelector(selector) {
        await this.page.waitForSelector(selector)
            .then(() => console.log(`Saw '${selector}'`))
            .catch(this.closeBrowser)
    }

    async isSelectorPresent(selector, timeOut = 5000) {
        try {
            await sleep(timeOut)
            await this.waitForSelector(selector)
            return true;

        } catch (error) {
            console.log(error) // might be an error because of a bad selector
            return false
        }
    }

    async waitAndClick(selector) {
        this.waitForSelector(selector)
        this.clickButton(selector)
    }
    async navigateTo(url){
        this.page.goto(url)
    }
    async closeBrowser() {
        await this.browser.close();
    }

    parseBool(val) {
        return val === true || val === "true"
    }
}

exports.utils = utils;
exports.sleep = sleep;