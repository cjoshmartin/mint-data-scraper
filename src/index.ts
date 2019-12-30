require('dotenv').config({ debug: true });

import puppeteerConfiguation from './puppeteerConfiguation';
import Mint from './Mint';

const mintScrape = async () => {
  const mint =  await Mint.builder(puppeteerConfiguation);

    // login
  await mint.loginToMint();

  await Mint.promisedBasedSleep(5000);

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
  await Mint.promisedBasedSleep(10000);

  for (let asset of assetsList) {
    const selector = asset[0];
    const assetName = asset[1];
    console.log(`Scraping the asset: ${assetName}`);

    assetsObj[assetName] = await mint.getInnerTextOfSelector(selector);
  }

  const trends = await mint.getTrends();
  await mint.closeBrowser();

  const output = {
    ...assetsObj,
    ...trends,
  };

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
