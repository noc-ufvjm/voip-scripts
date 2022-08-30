const puppeteer = require('puppeteer');
const dotenv = require('dotenv');

dotenv.config();

const getDeviceMAC = async (ip) => {
    let browser = null;
    try {
	browser = await puppeteer.launch({
	    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
	});
	const page = await browser.newPage();


	const fillInput = (selector, value) => {
	    return page.evaluate(({ selector, value }) => {
		const el = document.querySelector(selector);
		if (!el) return;
		el.value = value
	    }, { selector, value });
	};

	await page.setRequestInterception(true);
	page.on('request', interceptedRequest => {
	    if (interceptedRequest.isInterceptResolutionHandled()) return;
	    if (
		interceptedRequest.url().endsWith('.png') ||
		    interceptedRequest.url().endsWith('.jpg')
	    )
		interceptedRequest.abort();
	    else interceptedRequest.continue();
	});
	await page.goto(`https://${ip}/`);

	// Preenchendo login
	await page.waitForSelector('#idUsername');
	await fillInput('#idUsername', process.env.YEALINK_USERNAME);

	// Preenchendo senha
	await page.waitForSelector('#idPassword');
	await fillInput('#idPassword', process.env.YEALINK_PASSWORD);

	await page.screenshot({ path: '01-login.png', fullPage: true })

	// Clicando no botão de login e aguardando página de status carregar.
	await page.click('#idConfirm');
	await page.waitForSelector('#tdMACAddress');

	await page.screenshot({ path: '02-status.png', fullPage: true })

	const macElement = await page.$('#tdMACAddress');
	const macValue = await page.evaluate(el => el.innerText, macElement);
	
	await browser.close();
	return macValue;
    } catch(e) {
	if (browser)
	    await browser.close();
	throw e;
    }
};

const parseNamedArguments = argv => {
    const namedArgs = argv.filter(arg => arg.match(/^[a-zA-Z]+=/));
    return namedArgs.reduce((obj, arg) => {
	const [key, value] = arg.split('=');
	return { ...obj, [key]: value };
    }, {});
}

const parsedArgs = parseNamedArguments(process.argv);
if (!parsedArgs.ip) {
    console.error(`Use: getDeviceMAC ip=IP_DO_TELEFONE`);
    process.exit(-1);
}
getDeviceMAC(parsedArgs.ip).then(console.log).catch(e => console.error(`Erro: ${e.message}`));
