require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

//env: STDID, STDPWD
const url = "http://libauto.mingdao.edu.tw/AACourses/Web/wLogin.php";
const delay = 1500; //爬取Meet網址的延遲(不要設太低，學校server會炸)

start(url);

/**
 * {name, teacher, online:{url, code}}
 */
async function start(url) {
	try {
		console.log("Getting Table...");
		const data = await getData(url);
		console.log("Finish!");
		console.log("Table:%o", data);
		return data;
	} catch (err) {
		console.error(err);
		return;
	}
}

async function getData(url) {
	try {
		async function getCookie() {
			try {
				console.log("Getting cookie...");
				const res = await axios({
					responseType: "arraybuffer",
					method: "get",
					url: url,
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.47",
					},
					transformResponse: [
						(data) => {
							return iconv.decode(Buffer.from(data), "big5");
						},
					],
				});
				const returnCookie = await res.headers["set-cookie"][0];
				const cookie = returnCookie.slice(0, 36);
				console.log("Getting cookie finish!");
				return cookie;
			} catch (err) {
				console.log(err);
				return;
			}
		}
		const cookie = await getCookie();

		async function getHtml() {
			try {
				console.log("Getting html...");
				const res = await axios({
					responseType: "arraybuffer",
					method: "post",
					url: url,
					headers: {
						"Cookie": cookie,
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.47",
					},
					data: `sureReg=YES&goURL=&accessWay=ACCOUNT&HTTP_REFERER=http%3A%2F%2Flibauto.mingdao.edu.tw%2FAACourses%2FWeb%2FqWTT.php&wRole=STD&stdID=${encodeURI(
						process.env.STDID
					)}&stdPWD=${encodeURI(process.env.STDPWD)}&uRFID=&Submit=%BDT%A9w%B5n%A4J`,
					transformResponse: [
						(data) => {
							return iconv.decode(Buffer.from(data), "big5");
						},
					],
				});
				console.log("Getting html finish!");
				return res.data;
			} catch (err) {
				console.log(err);
				return;
			}
		}
		const html = await getHtml();
		const $ = cheerio.load(html);

		async function getOnline(x, y, f_sPeriodsem) {
			try {
				console.log(`Getting online info... (day: ${x}), period: ${y})`);
				const id = $(`#F_${x}_${y}_P div img`).attr("id").slice(6);
				const res = await axios({
					method: "get",
					url: `http://libauto.mingdao.edu.tw/AACourses/Web/qVT.php?F_sPeriodsem=${f_sPeriodsem}&eID=${id}`,
					headers: {
						"Cookie": cookie,
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.47",
					},
					transformResponse: [
						(data) => {
							return iconv.decode(Buffer.from(data), "big5");
						},
					],
				});

				const form = cheerio.load(res.data);
				const online = form(`#main div.vtC`).text().trim().split(/ +/);
				const url = online[0];
				const code = online[1];
				console.log(`Getting online info finish`);
				return { url: url, code: code };
			} catch (err) {
				console.log(err);
				return;
			}
		}

		async function getTable() {
			try {
				const table = [];
				const location = "table tbody tr td span div div.";
				//F_行_列(start=1)
				for (var x = 1; x <= 5; x++) {
					const row = [];
					for (var y = 1; y <= 8; y++) {
						//共40次httprequest
						const online = await getOnline(
							x,
							y,
							$(`#F_sPeriodsem option:selected`).val()
						);
						row[y - 1] = {
							name: $(`#F_${x}_${y} ${location}subj`).text(),
							teacher: $(`#F_${x}_${y} ${location}tea`).text(),
							online: online,
						};
						timeout(delay);
					}
					table[x - 1] = row;
				}
				return table;
			} catch (err) {
				console.log(err);
				return;
			}
		}
		const data = await getTable();
		return data;
	} catch (err) {
		return console.log(err);
	}
}

//delay
function timeout(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
