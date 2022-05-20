require("dotenv").config()
const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite")

const url = "http://libauto.mingdao.edu.tw/AACourses/Web/wLogin.php";
const username = process.env.USERNAME;
const passwd = process.env.PASSWD;
start(url);

async function start(url) {
	const html = await login(url);
	const table = getTable(html);
	console.log(table)
}

function getTable(html){
	const table = [];
	const $ = cheerio.load(html);
	//F_行_列(start=1)
	for (var x = 1; x <= 5; x++) {
		const row = [];
		for (var y = 1; y <= 8; y++) {
			row[y-1] = $(`#F_${x}_${y} table tbody tr td span div div.subj`).text()
		}
		table[x-1] = row;
	}
	return table;
}

async function login(url) {
	const getCookie = async (url) => {
		const res = await axios({
			responseType: 'arraybuffer',
			method: "get",
			url:url,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.47",
			},
		});
		const returnCookie = await res.headers["set-cookie"][0];
		const cookie = returnCookie.slice(0, 36);
		return cookie;
	}
	const cookie = await getCookie(url);
	const res = await axios({
		responseType: 'arraybuffer',
		method: "post",
		url:url,
		headers: {
			"accept-language": "zh-TW,zh;q=0.9",
			"Content-Length": "193",
			"Content-Type": "application/x-www-form-urlencoded",
			"Cookie": cookie,
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.47",
		},
		data: `sureReg=YES&goURL=&accessWay=ACCOUNT&HTTP_REFERER=http%3A%2F%2Flibauto.mingdao.edu.tw%2FAACourses%2FWeb%2FqWTT.php&wRole=STD&stdID=${username}&stdPWD=${passwd}&uRFID=&Submit=%BDT%A9w%B5n%A4J`,
		transformResponse:[(data)=>{
			return iconv.decode(Buffer.from(data), 'big5')
		}]
	});
	const body = await res.data
	return body;
}
