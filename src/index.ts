require('dotenv').config({ debug: true });

import puppeteerConfiguation from './puppeteerConfiguation';
import Mint from './Mint';

const mintScrape = async () => {
  const mint =  await Mint.builder(puppeteerConfiguation);

    // login
  await mint.loginToMint();

  await Mint.promisedBasedSleep(5000);
  await mint.page.screenshot({ path: 'buddy-screenshot.png' });

    // breaking here

  const assetsSelector = 'li.asset-total >  span';
  const debtTotalSelector = 'li.debt-total >  span';
  const netWorthSelector = 'li.net-worth >  span';
  const cashSelector = '.cash >  var';
  const assetsList = [
        [assetsSelector, 'assetsAmount'],
        [debtTotalSelector, 'DebtAmount'],
        [netWorthSelector, 'netWorthAmount'],
        [cashSelector, 'cashAmount'],
  ];
  const assetsObj = {};
  await Mint.promisedBasedSleep(3000);

  for (let asset of assetsList) {
    const selector = asset[0];
    const assetName = asset[1];
    console.log(`Scraping the asset: ${assetName}`);

    assetsObj[assetName] = await mint.getInnerTextOfSelector(selector);
  }

  // TODO: Fix this
  const trends = await mint.getTrends();
  await mint.closeBrowser();

  const output = {
    ...assetsObj,
    ...trends,
  };

    // MongoDb stuff
//   mint.insertInDB(output);
  return output;
};

mintScrape()
.catch((e:any) => console.log(e))
.then(output => console.log(
                            JSON
// @ts-ignore
                            .stringify(output, ' ', 4),
                            ),
    );
