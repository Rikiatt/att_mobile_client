const dotenv = require('dotenv');
dotenv.config();
const adb = require('adbkit');
const fs = require('fs');
const path = require('path');
const { delay } = require('../helpers/functionHelper');
const xml2js = require('xml2js');
const adbPath = path.join(__dirname, '../platform-tools', 'adb.exe');
const client = adb.createClient({ bin: adbPath });
const Tesseract = require('tesseract.js');
const { pipeline } = require("stream/promises");
const { Logger } = require("../config/require.config");

const filePath = 'C:\\att_mobile_client\\database\\localdata.json';
let chatId = process.env.CHATID; // mặc định là gửi vào nhóm Warning - Semi Automated Transfer
const telegramToken = process.env.TELEGRAM_TOKEN;
const { sendTelegramAlert, saveAlertToDatabase } = require('../functions/alert.function');
// const jsonFilePath = "C:\\att_mobile_client\\database\\info-qr.json";
const notifier = require('../events/notifier');

const fileContent = fs.readFileSync(filePath, 'utf-8');
const jsonData = JSON.parse(fileContent);

const siteOrg = jsonData?.org?.site || '';
const siteAtt = jsonData?.att?.site?.split('/').pop() || '';

const validSite = siteOrg || siteAtt; // Ưu tiên org nếu có, nếu không dùng att
const { getDataJson } = require('../functions/function');

const siteToChatIdMap = {
  'shbet': process.env.CHATID_SHBET,
  'new88': process.env.CHATID_NEW88,
  'jun88cmd': process.env.CHATID_JUN88CMD,
  'jun88k36': process.env.CHATID_JUN88K36
};

if (siteToChatIdMap[validSite]) {
  chatId = siteToChatIdMap[validSite];
}

// chua xong - chinh xong canh bao
async function checkContentABB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const screenKeywords = [{
      name: "Chuyển tiền",
      vi: ["Bạn muốn chuyển tiền", "Tới người nhận khác"],
      en: ["Bạn muốn chuyển tiền", "Tới người nhận khác"]
    }];

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với ABB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng ABB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với ABB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app ABB', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện thao tác thủ công (id: ${device_id})`
        });

        await stopABB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// check QR dang sai - chinh xong canh bao
async function checkContentACB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAccount = "";
    let expectedAmount = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAccount = match[1].replace(/\s/g, "");
      expectedAmount = match[2].replace(/[.,\s]/g, "");
    }

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Chuyển tiền", "Người nhận mới"],
        en: ["Transfer", "New recipient"]
      }
    ];

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng ACB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app ACB', __filename);

        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện thao tác thủ công (id: ${device_id})`
        });
        await stopACB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

    /* TH2: Màn hình xác nhận sau khi quét QR */
    const detectText = [];
    const editTextPattern = /\sresource-id=""\sclass="android\.widget\.EditText"/g;
    let matchEditText;

    while ((matchEditText = editTextPattern.exec(content)) !== null) {
      const beforeMatch = content.slice(0, matchEditText.index);
      const textMatch = beforeMatch.match(/text="([^"]*?)"[^>]*$/);
      if (textMatch) {
        detectText.push(textMatch[1]);
      }
    }

    if (detectText.length >= 5) {
      const accountNumber = (detectText[1] || "").replace(/\s/g, "");
      const amount = (detectText[3] || "").replace(/[.,\s]/g, "");

      Logger.log(0, `OCR Account Number: ${accountNumber}`, __filename);
      Logger.log(0, `INFO Account Number: ${expectedAccount}`, __filename);
      Logger.log(0, `OCR Amount: ${amount}`, __filename);
      Logger.log(0, `INFO Amount: ${expectedAmount}`, __filename);

      const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

      if (!isMatch) {
        const reason = `ACB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
        Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

        await stopACB({ device_id });

        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `ACB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`
        });

        await sendTelegramAlert(
          telegramToken,
          chatId,
          `${reason} (id thiết bị: ${device_id})`
        );

        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `${reason} (id thiết bị: ${device_id})`,
          filePath: localPath
        });

        return;
      } else {
        Logger.log(0, 'ACB: OCR TRÙNG info-qr về account_number và amount.', __filename);
        return;
      }
    }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// chua lam
async function checkContentBAB(device_id, localPath) {
  Logger.log(0, 'BAB chưa làm.', __filename);
}

// khong dump dc
async function checkContentBIDV(device_id, localPath) {
  Logger.log(0, 'BIDV không hỗ trợ dump.', __filename);
}

function normalizeText(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractOCRFieldsFromLinesEIB(ocrRawText) {
  // Đọc số tài khoản và số tiền đúng theo vị trí
  const lines = ocrRawText.split('\n').map(line => line.trim()).filter(Boolean);
  let foundAccount = "", foundAmount = "";

  for (let i = 0; i < lines.length; i++) {
    const lineNorm = normalizeText(lines[i]);

    if ((lineNorm.includes("so tai khoan thu huong") || lineNorm.includes("beneficiary account number")) && i + 1 < lines.length) {
      foundAccount = lines[i + 1].replace(/[^0-9]/g, "");
    }

    if (lineNorm.includes("so tien") || lineNorm.includes("amount")) {
      for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
        const possibleAmount = lines[j].replace(/[^\d]/g, "");
        if (possibleAmount.length > 0) {
          foundAmount = possibleAmount;
          break;
        }
      }
    }
  }

  return {
    ocrAccount: normalizeText(foundAccount),
    ocrAmount: normalizeText(foundAmount)
  };
}

function extractOCRFieldsFromLinesNCB(ocrRawText) {
  const lines = ocrRawText.split('\n').map(line => line.trim()).filter(Boolean);
  let foundAccount = "", foundAmount = "";
  let vndIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const lower = normalizeText(lines[i]);
    if (lower.includes("vnd")) {
      vndIndex = i;
      break;
    }
  }

  if (vndIndex !== -1) {
    for (let i = vndIndex - 1; i >= 0; i--) {
      const match = lines[i].match(/\d{1,3}(,\d{3})*/);
      if (match) {
        foundAmount = match[0].replace(/[^0-9]/g, "");
        break;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const prev = normalizeText(lines[i - 1] || "");
    const curr = lines[i].replace(/\s/g, "");
    if (prev.includes("nguoi nhan") && /^[0-9]{6,20}$/.test(curr)) {
      foundAccount = curr;
      break;
    }
  }

  return {
    ocrAccount: normalizeText(foundAccount),
    ocrAmount: normalizeText(foundAmount)
  };
}

async function dumpOCRToLocal(device_id, localPath) {
  try {
    const screencapStream = await client.shell(device_id, `screencap -p`);

    await pipeline(
      screencapStream,
      fs.createWriteStream(localPath)
    );

    Logger.log(0, `Screenshot saved to: ${localPath}`, __filename);
  } catch (error) {
    Logger.log(2, `dumpOCRToLocal error: ${error.message}`, __filename);
  }
}

let ocrMatchedByDevice = {}; // Theo dõi trạng thái từng thiết bị
let lastActivityByDevice = {}; // Theo dõi activity gần nhất của từng thiết bị

// ok - chinh xong canh bao
async function checkContentEIB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const currentActivity = content.match(/package=\"(.*?)\"/);
    const currentPackage = currentActivity ? currentActivity[1] : "";
    const lastActivity = lastActivityByDevice[device_id] || "";

    if (ocrMatchedByDevice[device_id] && currentPackage !== lastActivity && currentPackage.includes("com.vnpay.EximBankOmni")) {
      Logger.log(0, 'Đã chuyển màn hình sau khi OCR trùng. Reset ocrMatchedByDevice.', __filename);
      ocrMatchedByDevice[device_id] = false;
    }

    lastActivityByDevice[device_id] = currentPackage;

    const hasCollapsingToolbarMenuTransfer = content.includes('resource-id="com.vnpay.EximBankOmni:id/collapsingToolbarMenuTransfer"');
    const hasBtnMenuTransferAddForm = content.includes('resource-id="com.vnpay.EximBankOmni:id/btnMenuTransferAddForm"');

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    if (hasCollapsingToolbarMenuTransfer && hasBtnMenuTransferAddForm) {
      const screenName = "Chuyển tiền";

      // Đọc file local-banks.json
      const localBanksPath = path.join(__dirname, "../database/local-banks.json");
      let banksData = [];

      if (fs.existsSync(localBanksPath)) {
        const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
        if (rawData) {
          banksData = JSON.parse(rawData);
        }
      }

      let message = '';
      if (banksData.length === 0) {
        message = `Phát hiện có thao tác thủ công khi xuất với EIB ở màn hình: ${screenName} (id thiết bị: ${device_id})`;
      } else {
        const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
        if (bankItem) {
          message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng EIB!`;
        } else {
          message = `Phát hiện có thao tác thủ công khi xuất với EIB ở màn hình: ${screenName} (id thiết bị: ${device_id})`;
        }
      }

      Logger.log(1, message, __filename);
      Logger.log(0, 'Đóng app EIB', __filename);
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Phát hiện thao tác thủ công ở màn hình: ${screenName} (id: ${device_id})`
      });

      await stopEIB({ device_id });
      await sendTelegramAlert(telegramToken, chatId, message);
      await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
      return;
    }

    const hasConfirmScreenHint =
      content.includes('resource-id="com.vnpay.EximBankOmni:id/swSaveBene"') &&
      content.includes('class="android.widget.Switch"')

    /* TH2: Màn hình xác nhận sau khi quét QR */
    if (hasConfirmScreenHint && !ocrMatchedByDevice[device_id]) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';

      if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
        Logger.log(0, 'Quét xong QR. Tiến hành OCR...', __filename);

        const remoteScreenshot = '/sdcard/screenshot.png';
        const screenshotDir = 'C:/att_mobile_client/resource/screenshot';
        const localScreenshot = path.join(screenshotDir, `${device_id}_screen.png`);

        await client.shell(device_id, 'input swipe 540 1777 540 1444 300').then(adb.util.readAll);
        await client.shell(device_id, `screencap -p ${remoteScreenshot}`).then(adb.util.readAll);

        const transferStream = await client.pull(device_id, remoteScreenshot);
        const writeStream = fs.createWriteStream(localScreenshot);
        await new Promise((resolve, reject) => {
          transferStream.pipe(writeStream);
          transferStream.on('end', resolve);
          transferStream.on('error', reject);
        });

        const { data: { text } } = await Tesseract.recognize(localScreenshot, 'vie+eng');
        Logger.log(0, `log text from OCR:\n${text}`, __filename);

        const { ocrAccount, ocrAmount } = extractOCRFieldsFromLinesEIB(text);

        const jsonPath = "C:/att_mobile_client/database/info-qr.json";
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        let expectedAccount = "";
        let expectedAmount = "";
        const vietqrUrl = jsonData.data?.vietqr_url || "";
        const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
        if (match) {
          expectedAccount = normalizeText(match[1]);
          expectedAmount = normalizeText(match[2]);
        }

        Logger.log(0, `OCR Account Number: ${ocrAccount} | length: ${ocrAccount.length}`, __filename);
        Logger.log(0, `INFO Account Number: ${expectedAccount} | length: ${expectedAccount.length}`, __filename);
        Logger.log(0, `OCR Amount: ${ocrAmount} | length: ${ocrAmount.length}`, __filename);
        Logger.log(0, `INFO Amount: ${expectedAmount} | length: ${expectedAmount.length}`, __filename);

        const ocrHasAccount =
          ocrAccount === expectedAccount ||
          (ocrAccount.length === expectedAccount.length + 1 && ocrAccount.startsWith(expectedAccount));

        const ocrHasAmount = ocrAmount === expectedAmount;

        if (!(ocrHasAccount && ocrHasAmount)) {
          const reason = "OCR KHÁC info-qr về số tài khoản hoặc số tiền";
          Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

          notifier.emit('multiple-banks-detected', {
            device_id,
            message: `OCR KHÁC info-qr về số tài khoản hoặc số tiền`
          });

          await stopEIB({ device_id });
          await sendTelegramAlert(telegramToken, chatId, `${reason} tại màn hình xác nhận giao dịch (id: ${device_id})`);
          Logger.log(1, `${reason} tại màn hình xác nhận giao dịch (id: ${device_id})`, __filename);
          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `${reason} (id: ${device_id})`,
            filePath: localScreenshot
          });
          return;
        } else {
          ocrMatchedByDevice[device_id] = true;
          Logger.log(0, 'OCR TRÙNG info-qr về account_number và amount. OCR ảnh .', __filename);
        }
      }

      if (!content.includes("com.vnpay.EximBankOmni")) {
        ocrMatchedByDevice[device_id] = false;
      }
    }
  } catch (error) {
    console.error("checkContentEIB got an error:", error.message);
  }
}

// ca tieng anh, tieng viet duoc - chinh xong canh bao
async function checkContentHDB(device_id, localPath) {
  try {
    const xmlData = fs.readFileSync(localPath, 'utf-8');

    // Transfer (Normal)
    const foundMenuTransfer = xmlData.includes('resource-id="com.vnpay.hdbank:id/menusMenuTransfer"');
    const foundItemTransfer = xmlData.includes('resource-id="com.vnpay.hdbank:id/tvItemTransfer"');

    // Internal transfer and interbank tranfer
    const foundAccountNo = xmlData.includes('resource-id="com.vnpay.hdbank:id/account_no"');
    const foundFromAccBalance = xmlData.includes('resource-id="com.vnpay.hdbank:id/llFromAccBalance"');
    const foundFromAccTitleBlacnce = xmlData.includes('resource-id="com.vnpay.hdbank:id/tvFromAccTitleBlacnce"');
    const foundBalance = xmlData.includes('resource-id="com.vnpay.hdbank:id/balance"');
    const foundRegisterLoanYellow = xmlData.includes('resource-id="com.vnpay.hdbank:id/llRegisterLoanYellow"');
    const foundTitleRegisterLoan = xmlData.includes('resource-id="com.vnpay.hdbank:id/tvTitleRegisterLoan"');
    const foundBank = xmlData.includes('resource-id="com.vnpay.hdbank:id/bank"');
    const foundTransfer = xmlData.includes('resource-id="com.vnpay.hdbank:id/transfer"');
    const foundSaveContact = xmlData.includes('resource-id="com.vnpay.hdbank:id/swSaveContact"');

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    if ((foundMenuTransfer && foundItemTransfer)

      || (foundAccountNo && foundFromAccBalance && foundFromAccTitleBlacnce && foundBalance &&
        foundRegisterLoanYellow && foundTitleRegisterLoan && foundBank && foundTransfer)

      || (foundAccountNo && foundFromAccBalance && foundFromAccTitleBlacnce && foundBalance &&
        foundRegisterLoanYellow && foundTitleRegisterLoan && foundTransfer && foundSaveContact)) {

      // Đọc file local-banks.json
      const localBanksPath = path.join(__dirname, "../database/local-banks.json");
      let banksData = [];

      if (fs.existsSync(localBanksPath)) {
        const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
        if (rawData) {
          banksData = JSON.parse(rawData);
        }
      }

      let message = '';
      if (banksData.length === 0) {
        message = `Phát hiện có thao tác thủ công khi xuất với HDB (id thiết bị: ${device_id})`;
      } else {
        const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
        if (bankItem) {
          message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng HDB`;
        } else {
          message = `Phát hiện có thao tác thủ công khi xuất với HDB (id thiết bị: ${device_id})`;
        }
      }

      Logger.log(1, message, __filename);
      Logger.log(0, 'Đóng app HDB', __filename);
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Phát hiện thao tác thủ công (id: ${device_id})`
      });

      await stopHDB({ device_id });
      await sendTelegramAlert(telegramToken, chatId, message);
      await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
      return;
    }
  } catch (error) {
    Logger.log(1, `Lỗi khi kiểm tra HDB: ${error.message}`, __filename);
  }
}

// xong
async function checkContentICB(device_id, localPath) {
  Logger.log(0, 'ICB không hỗ trợ dump.', __filename);
}

// ok - chinh xong canh bao
async function checkContentMB(device_id, localPath) {
  try {
    const xml = fs.readFileSync(localPath, "utf-8").trim();
    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAccount = "";
    let expectedAmount = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAccount = match[1].replace(/\s/g, "");
      expectedAmount = match[2].replace(/[^\d]/g, "");
    }

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ", "Truy vấn giao dịch giá trị lớn", "Chuyển tiền"],
        en: ["Account", "Phone number", "Card", "Large-value transaction inquiry", "Transfer"]
      }
    ];

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => xml.includes(kw)) || screen.en.every(kw => xml.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng MB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app MB', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
        });

        await stopMB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

    /* TH2: Check QR */
    const isTransferToScreen = xml.includes('resource-id="MInput_0a67f0a6-0cc5-483a-8e23-9300e20ab1ac"') &&
      xml.includes('resource-id="MInput_c3a8b456-f94f-471b-bca1-dc2cb3662035"');

    if (isTransferToScreen) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';

      if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
        let accountNumber = "";
        const accMatch = xml.match(/text="([\d\s]+)"\s+resource-id="MInput_c3a8b456-f94f-471b-bca1-dc2cb3662035"/);
        if (accMatch) {
          accountNumber = accMatch[1].replace(/\s/g, "");
        }

        let amount = "";
        const amtMatch = xml.match(/text="([\d\s,.]+)"\s+resource-id="MInput_0a67f0a6-0cc5-483a-8e23-9300e20ab1ac"/);
        if (amtMatch) {
          amount = amtMatch[1].replace(/[^\d]/g, "").trim();
        }

        Logger.log(0, `OCR Account Number: ${accountNumber}`, __filename);
        Logger.log(0, `INFO Account Number: ${expectedAccount}`, __filename);
        Logger.log(0, `OCR Amount: ${amount}`, __filename);
        Logger.log(0, `INFO Amount: ${expectedAmount}`, __filename);

        const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

        if (!isMatch) {
          const reason = `MB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
          Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

          await stopMB({ device_id });

          notifier.emit('multiple-banks-detected', {
            device_id,
            message: reason
          });

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `${reason} (id thiết bị: ${device_id})`
          );

          Logger.log(1, `${reason} (id thiết bị: ${device_id})`, __filename);

          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `${reason} (id thiết bị: ${device_id})`,
            filePath: localPath
          });

          return;
        } else {
          Logger.log(0, 'MB: OCR TRÙNG info-qr về account_number và amount.', __filename);
          return;
        }
      }
    }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// khong dump dc
async function checkContentMSB(device_id, localPath) {
  Logger.log(0, 'MSB không hỗ trợ dump.', __filename);
}

// ok - chinh xong canh bao
async function checkContentNAB(device_id, localPath) {
  try {
    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    const content = fs.readFileSync(localPath, "utf-8").trim();
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Tài khoản", "Thẻ", "Quét QR", "Chuyển tiền quốc tế", "Danh bạ &#10; người nhận", "Danh sách &#10; lịch chuyển tiền"],
        en: ["Account", "Card", "QR code", "International payments", "Danh bạ &#10; người nhận", "Danh sách &#10; lịch chuyển tiền"]
      },
      {
        name: "Chuyển tiền đến tài khoản",
        vi: ["Chuyển tiền đến tài khoản", "Tài khoản nhận tiền", "Tên người nhận", "Số tiền"],
        en: ["Chuyển tiền đến tài khoản", "Tài khoản nhận tiền", "Tên người nhận", "Số tiền"]
      }
    ];

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAcc = "";
    let expectedAmt = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAcc = match[1].replace(/\s/g, "");
      expectedAmt = match[2].replace(/[.,\s]/g, "");
    }

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
        if (screen.name === "Chuyển tiền") {
          // Đọc file local-banks.json
          const localBanksPath = path.join(__dirname, "../database/local-banks.json");
          let banksData = [];

          if (fs.existsSync(localBanksPath)) {
            const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
            if (rawData) {
              banksData = JSON.parse(rawData);
            }
          }

          let message = '';
          if (banksData.length === 0) {
            message = `Phát hiện có thao tác thủ công khi xuất với NAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          } else {
            const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
            if (bankItem) {
              message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng NAB`;
            } else {
              message = `Phát hiện có thao tác thủ công khi xuất với NAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
            }
          }

          Logger.log(1, message, __filename);
          Logger.log(0, 'Đóng app NAB', __filename);
          notifier.emit('multiple-banks-detected', {
            device_id,
            message: `Phát hiện thao tác thủ công (id: ${device_id})`
          });

          await stopNAB({ device_id });
          await sendTelegramAlert(telegramToken, chatId, message);
          await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
          return;
        }

        /* TH2: Màn hình xác nhận sau khi quét QR */
        if (screen.name === "Chuyển tiền đến tài khoản") {
          const accMatches = [...content.matchAll(/text="([\d\s]+)"\s+resource-id="ops\.namabank\.com\.vn:id\/accountNumber"/g)];
          const amtMatches = [...content.matchAll(/text="([\d.,\s]+)"\s+resource-id="ops\.namabank\.com\.vn:id\/amount"/g)];

          const ocrAccount = accMatches.length ? accMatches[accMatches.length - 1][1].replace(/\s/g, "") : "";
          const ocrAmount = amtMatches.length ? amtMatches[amtMatches.length - 1][1].replace(/[.,\s]/g, "") : "";

          Logger.log(0, `OCR Account Number: ${ocrAccount}`, __filename);
          Logger.log(0, `INFO Account Number: ${expectedAcc}`, __filename);
          Logger.log(0, `OCR Amount: ${ocrAmount}`, __filename);
          Logger.log(0, `INFO Amount: ${expectedAmt}`, __filename);

          const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
          const qrDevice = infoQR?.data?.device_id || '';
          const qrType = infoQR?.type || '';

          if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
            if (ocrAccount !== expectedAcc || ocrAmount !== expectedAmt) {
              await stopNAB({ device_id });

              await sendTelegramAlert(
                telegramToken,
                chatId,
                `Lệch QR NAB ở màn hình "${screen.name}" (${device_id})\nTài khoản: ${ocrAccount}, Số tiền: ${ocrAmount}`
              );

              Logger.log(1, `Lệch QR NAB ở màn hình "${screen.name}" (${device_id})\nTài khoản: ${ocrAccount}, Số tiền: ${ocrAmount}`, __filename);

              notifier.emit('multiple-banks-detected', {
                device_id,
                message: `Lệch QR NAB ở màn hình "${screen.name}" (${device_id})\nTài khoản: ${ocrAccount}, Số tiền: ${ocrAmount}`
              });

              await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Lệch QR NAB: account_number hoặc amount không khớp (${device_id})`,
                filePath: localPath
              });
              return;
            } else {
              Logger.log(0, 'OCR khớp info-qr.json, tiếp tục theo dõi...', __filename);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("checkContentNAB got an error:", error.message);
  }
}

// xong
async function checkContentNCB(device_id, localPath) {
  Logger.log(0, 'NCB không hỗ trợ dump.', __filename);
}

// ok - chinh xong canh bao
async function checkContentOCB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAccount = "";
    let expectedAmount = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAccount = match[1].replace(/\s/g, "");
      expectedAmount = match[2].replace(/[.,\s]/g, "");
    }

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Chuyển tiền", "Trong OCB", "Ngân hàng khác", "Đến số thẻ", "Xem tất cả", "Chuyển gần đây"],
        en: ["Transfer money", "Within OCB", "Interbank", "To card number", "See all", "Recent transferred"]
      }
    ];

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng OCB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app OCB', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
        });

        await stopOCB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

    /* TH2: Màn hình xác nhận sau khi quét QR */
    const detectText = [];
    const targetResourceIds = [
      "vn.com.ocb.awe:id/tvAccountNumber",
      "vn.com.ocb.awe:id/edtInput"
    ];

    const matches = content.matchAll(/text="(.*?)"[^>]*resource-id="(.*?)"/g);
    for (const match of matches) {
      const text = match[1]?.trim();
      const resourceId = match[2];
      if (targetResourceIds.includes(resourceId)) {
        detectText.push(text);
      }
    }

    if (detectText.length >= 3) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';

      if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
        const accountNumber = (detectText[0] || "").replace(/\s/g, "");
        const amount = (detectText[1] || "").replace(/[.,\s]/g, "");

        Logger.log(0, `OCR Account Number: ${accountNumber}`, __filename);
        Logger.log(0, `INFO Account Number: ${expectedAccount}`, __filename);
        Logger.log(0, `OCR Amount: ${amount}`, __filename);
        Logger.log(0, `INFO Amount: ${expectedAmount}`, __filename);

        const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

        if (!isMatch) {
          const reason = `OCB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
          Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

          notifier.emit('multiple-banks-detected', {
            device_id,
            message: `OCB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`
          });

          await stopOCB({ device_id });

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `${reason} (id thiết bị: ${device_id})`
          );

          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `${reason} (id thiết bị: ${device_id})`,
            filePath: localPath
          });

          return;
        } else {
          Logger.log(0, 'OCB: OCR TRÙNG info-qr về account_number và amount.', __filename);
          return;
        }
      }
    }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// ok - chinh xong canh bao
async function checkContentSHBSAHA(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Đến người khác", "Đến tôi tại SHB", "SHS"],
        en: ["Đến người khác", "Đến tôi tại SHB", "SHS"]
      }
    ];

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với SHB SAHA ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng SHB SAHA`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với SHB SAHA ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app SHB SAHA', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện thao tác thủ công (id: ${device_id})`
        });

        await stopSHBSAHA({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

    /* TH2: Màn hình xác nhận sau khi quét QR */
    // Kiểm tra màn hình "Chuyển tiền đến" (sau khi quét xong QR code)
    const hasTransferForm = [
      "Chuyển tiền đến",
      "Ngân hàng nhận",
      "Số tài khoản",
      "Tên người nhận",
      "Số tiền"
    ].every(keyword => content.includes(keyword));

    if (hasTransferForm) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';

      if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
        const accountMatch = content.match(/text="Số tài khoản"[\s\S]*?text="(\d{6,})"/);
        const amountMatch = content.match(/text="Số tiền"[\s\S]*?text="([0-9,\. ]+ VND)"/);

        const xmlAccount = accountMatch ? accountMatch[1].replace(/\D/g, '') : "";
        const xmlAmount = amountMatch ? amountMatch[1].replace(/[^0-9]/g, '') : "";

        const jsonPath = "C:/att_mobile_client/database/info-qr.json";
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        let expectedAccount = "";
        let expectedAmount = "";
        const vietqrUrl = jsonData.data?.vietqr_url || "";
        const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
        if (match) {
          expectedAccount = match[1].replace(/\D/g, "");
          expectedAmount = match[2].replace(/\D/g, "");
        }

        Logger.log(0, `XML Account Number: ${xmlAccount}`, __filename);
        Logger.log(0, `INFO Account Number: ${expectedAccount}`, __filename);
        Logger.log(0, `XML Amount: ${xmlAmount}`, __filename);
        Logger.log(0, `INFO Amount: ${expectedAmount}`, __filename);

        const xmlHasAccount =
          xmlAccount === expectedAccount ||
          (xmlAccount.length === expectedAccount.length + 1 && xmlAccount.startsWith(expectedAccount));

        const xmlHasAmount = xmlAmount === expectedAmount;

        if (!(xmlHasAccount && xmlHasAmount)) {
          const reason = "XML KHÁC info-qr về số tài khoản hoặc số tiền";
          Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

          await stopSHBSAHA({ device_id });
          notifier.emit('multiple-banks-detected', {
            device_id,
            message: `XML KHÁC info-qr về số tài khoản hoặc số tiền`
          });

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `${reason} với SHB SAHA (id thiết bị: ${device_id})`
          );

          Logger.log(1, `${reason} với SHB SAHA (id thiết bị: ${device_id})`, __filename);

          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `${reason} (id thiết bị: ${device_id})`,
            filePath: localPath
          });

          return;
        } else {
          Logger.log(0, 'XML TRÙNG info-qr về account_number và amount.', __filename);
        }
      }
    }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// ok - tieng viet - chinh xong canh bao
async function checkContentTPB(device_id, localPath) {
  try {
    const xml = fs.readFileSync(localPath, "utf-8").trim();
    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAccount = "";
    let expectedAmount = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAccount = match[1].replace(/\s/g, "");
      expectedAmount = match[2].replace(/[,\.\s]/g, "");
    }

    // Nếu là màn hình "Chuyển tiền tới"
    const isTransferToScreen = xml.includes('Chuyển tiền tới') &&
      xml.includes('resource-id="com.tpb.mb.gprsandroid:id/btn_continue"');

    /* TH2: Màn hình xác nhận sau khi quét QR */
    if (isTransferToScreen) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';

      if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
        // Lấy account_number trước dấu phẩy từ node tv_number
        let accountNumber = "";
        const accMatch = xml.match(/text="([^"]+?),[^"]*?"\s+resource-id="com\.tpb\.mb\.gprsandroid:id\/tv_number"/);
        if (accMatch) {
          accountNumber = accMatch[1].replace(/\s/g, "").trim();
        }

        // Lấy amount từ node edtInputMoney
        let amount = "";
        const amtMatch = xml.match(/text="([^"]+)"\s+resource-id="com\.tpb\.mb\.gprsandroid:id\/edtInputMoney"/);
        if (amtMatch) {
          amount = amtMatch[1].replace(/[,\s]/g, "").trim();
        }

        Logger.log(0, `OCR Account Number: ${accountNumber}`, __filename);
        Logger.log(0, `INFO Account Number: ${expectedAccount}`, __filename);
        Logger.log(0, `OCR Amount: ${amount}`, __filename);
        Logger.log(0, `INFO Amount: ${expectedAmount}`, __filename);

        const isMatch =
          accountNumber === expectedAccount &&
          amount === expectedAmount;

        if (!isMatch) {
          const reason = `TPB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
          Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

          await stopTPB({ device_id });

          notifier.emit('multiple-banks-detected', {
            device_id,
            message: reason
          });

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `${reason} (id thiết bị: ${device_id})`
          );

          Logger.log(1, `${reason} (id thiết bị: ${device_id})`, __filename);

          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `${reason} (id thiết bị: ${device_id})`,
            filePath: localPath
          });

          return;
        } else {
          Logger.log(0, 'TPB: OCR TRÙNG info-qr về account_number và amount.', __filename);
          return;
        }
      }
    }

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    // Xử lý các màn cũ như "Chuyển tiền/Chatpay"
    const screenKeywords = [
      {
        name: "Chuyển tiền/Chatpay",
        vi: ["Chuyển tiền ChatPay", "Người Nhận Mới - Trong TPBank", "Người Nhận Mới - Liên Ngân Hàng/Thẻ", "Dán Thông Tin Chuyển Tiền"],
        en: ["Chuyển tiền ChatPay", "Người Nhận Mới - Trong TPBank", "Người Nhận Mới - Liên Ngân Hàng/Thẻ", "Dán Thông Tin Chuyển Tiền"]
      },
      {
        name: "Chuyển tiền",
        vi: ["Chuyển tiền", "Từ tài khoản", "Chuyển đến", "Trong TPBank", "Liên Ngân Hàng", "Thẻ ATM"],
        en: ["Chuyển tiền", "Từ tài khoản", "Chuyển đến", "Trong TPBank", "Liên Ngân Hàng", "Thẻ ATM"]
      }
    ];

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => xml.includes(kw)) || screen.en.every(kw => xml.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng TPB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app TPB', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện thao tác thủ công (id: ${device_id})`
        });

        await stopTPB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

  } catch (error) {
    console.error("checkContentTPB got an error:", error.message);
  }
}

// ok tieng viet - ok tieng viet2 - VPB khong on dinh de dump xml :((
async function checkContentVPB(device_id, localPath) {
  Logger.log(0, 'VPB không còn hỗ trợ dump.', __filename);
}

// ok - chinh xong canh bao
async function checkContentSEAB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAccount = "";
    let expectedAmount = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAccount = match[1].replace(/\D/g, "");
      expectedAmount = match[2].replace(/\D/g, "");
    }

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Chuyển tiền", "Tới số tài khoản của tôi", "Tới số tài khoản khác", "Tới số điện thoại", "Tới số thẻ", "Quét mã QR", "Chuyển tiền định kỳ", "Gửi tiền mừng", "Chuyển tiền quốc tế"],
        en: ["Transfer", "Transfer to my account", "Transfer to other account", "Transfer to phone number", "Transfer to card number", "Scan QR code", "Periodic money transfer", "Transfer lucky money", "Chuyển tiền quốc tế"]
      }
    ];

    for (const screen of screenKeywords) {
      if (screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng SEAB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app SEAB', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
        });

        await stopSEAB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

    /* TH2: Check QR thông qua edittext */
    const regex = /text="([^"]+)"\s+resource-id="vn\.com\.seabank\.mb1:id\/edittext"/g;
    const detectText = [];
    let matchItem;
    while ((matchItem = regex.exec(content)) !== null) {
      detectText.push(matchItem[1]);
    }

    if (detectText.length >= 2) {
      const infoQR = await getDataJson(path.join('C:\\att_mobile_client\\database\\info-qr.json'));
      const qrDevice = infoQR?.data?.device_id || '';
      const qrType = infoQR?.type || '';

      if (device_id === qrDevice && qrType !== 'test') { // TEST THẺ thì không cần check gì hết, chỉ check nếu qrType === 'org' || 'att'
        const accountNumber = detectText[0].replace(/\s/g, "");
        const amount = detectText[1].replace(/[.,\s]/g, "");

        Logger.log(0, `OCR Account Number: ${accountNumber}`, __filename);
        Logger.log(0, `INFO Account Number: ${expectedAccount}`, __filename);
        Logger.log(0, `OCR Amount: ${amount}`, __filename);
        Logger.log(0, `INFO Amount: ${expectedAmount}`, __filename);

        const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

        if (!isMatch) {
          const reason = `SEAB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
          Logger.log(1, `${reason}. Gửi cảnh báo.`, __filename);

          await stopSEAB({ device_id });

          notifier.emit('multiple-banks-detected', {
            device_id,
            message: reason
          });

          await sendTelegramAlert(
            telegramToken,
            chatId,
            `${reason} (id thiết bị: ${device_id})`
          );

          await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `${reason} (id thiết bị: ${device_id})`,
            filePath: localPath
          });

          return;
        } else {
          Logger.log(0, 'SEAB: OCR TRÙNG info-qr về account_number và amount.', __filename);
          return;
        }
      }
    }

  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// chua check QR - chinh xong canh bao
async function checkContentSTB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    let expectedAccount = "";
    let expectedAmount = "";
    const vietqrUrl = jsonData.data?.vietqr_url || "";
    const match = vietqrUrl.match(/image\/[^-]+-(\d+)-qr\.png\?amount=(\d+)/);
    if (match) {
      expectedAccount = match[1].replace(/\D/g, "");
      expectedAmount = match[2].replace(/\D/g, "");
    }

    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Chuyển tiền", "Số điện thoại", "Số tài khoản", "Số thẻ", "Tên ngân hàng", "Số tài khoản nhận", "Số tiền cần chuyển"],
        en: ["Chuyển tiền", "Số điện thoại", "Số tài khoản", "Số thẻ", "Tên ngân hàng", "Số tài khoản nhận", "Số tiền cần chuyển"]
      }
    ];

    const exceptionKeyword = "Tên người nhận";

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    for (const screen of screenKeywords) {
      const viMatch = screen.vi.every(kw => content.includes(kw));
      const enMatch = screen.en.every(kw => content.includes(kw));
      const isException = content.includes(exceptionKeyword);

      if ((viMatch || enMatch) && !isException) {
        // Đọc file local-banks.json
        const localBanksPath = path.join(__dirname, "../database/local-banks.json");
        let banksData = [];

        if (fs.existsSync(localBanksPath)) {
          const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
          if (rawData) {
            banksData = JSON.parse(rawData);
          }
        }

        let message = '';
        if (banksData.length === 0) {
          message = `Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
        } else {
          const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
          if (bankItem) {
            message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng STB`;
          } else {
            message = `Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`;
          }
        }

        Logger.log(1, message, __filename);
        Logger.log(0, 'Đóng app STB', __filename);
        notifier.emit('multiple-banks-detected', {
          device_id,
          message: `Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
        });

        await stopSTB({ device_id });
        await sendTelegramAlert(telegramToken, chatId, message);
        await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
        return;
      }
    }

    // TH2: Chưa làm

  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

// chua lam// chua lam// chua lam
async function checkContentTCB(device_id, localPath) {
  Logger.log(0, 'TCB chưa làm.', __filename);
}

// khong dump dc
async function checkContentVCB(device_id, localPath) { // chua lam
  Logger.log(0, 'VCB không hỗ trợ dump.', __filename);
}

// chua lam
async function checkContentVIB(device_id, localPath) {
  Logger.log(0, 'VIB chưa làm.', __filename);
}

// ca tieng anh, tieng viet duoc - chinh xong canh bao
async function checkContentVIETBANK(device_id, localPath) {
  try {
    const xmlData = fs.readFileSync(localPath, 'utf-8');

    // Transfer (normal)
    const foundlnReceiverInfo = xmlData.includes('resource-id="com.vnpay.vietbank:id/lnReceiverInfo"');
    const foundtvTitleInfo = xmlData.includes('resource-id="com.vnpay.vietbank:id/tvTitleInfo"');
    const foundrcvReceiverInfo = xmlData.includes('resource-id="com.vnpay.vietbank:id/rcvReceiverInfo"');
    const foundDanh_ba_thu_huong = xmlData.includes('resource-id="com.vnpay.vietbank:id/Danh_ba_thu_huong"');

    /* TH1: Màn hình thao tác thủ công cần cảnh báo */
    if ((foundlnReceiverInfo && foundtvTitleInfo && foundrcvReceiverInfo && foundDanh_ba_thu_huong)) {
      // Đọc file local-banks.json
      const localBanksPath = path.join(__dirname, "../database/local-banks.json");
      let banksData = [];

      if (fs.existsSync(localBanksPath)) {
        const rawData = fs.readFileSync(localBanksPath, "utf-8").trim();
        if (rawData) {
          banksData = JSON.parse(rawData);
        }
      }

      let message = '';
      if (banksData.length === 0) {
        message = `Phát hiện có thao tác thủ công khi xuất với VIETBANK (id thiết bị: ${device_id})`;
      } else {
        const bankItem = banksData.find(item => item["THIẾT BỊ"]?.includes(device_id));
        if (bankItem) {
          message = `Thiết bị ${bankItem["THIẾT BỊ"]} có thao tác thủ công khi dùng VIETBANK`;
        } else {
          message = `Phát hiện có thao tác thủ công khi xuất với VIETBANK (id thiết bị: ${device_id})`;
        }
      }

      Logger.log(1, message, __filename);
      Logger.log(0, 'Đóng app VIETBANK', __filename);
      notifier.emit('multiple-banks-detected', {
        device_id,
        message: `Phát hiện thao tác thủ công (id: ${device_id})`
      });

      await stopVIETBANK({ device_id });
      await sendTelegramAlert(telegramToken, chatId, message);
      await saveAlertToDatabase({ timestamp: new Date().toISOString(), reason: message, filePath: localPath });
      return;
    }
  } catch (error) {
    Logger.log(1, `Lỗi khi kiểm tra VIETBANK: ${error.message}`, __filename);
  }
}

// chua lam
async function checkContentVIKKI(device_id, localPath) {
  Logger.log(0, 'VIKKI chưa làm.', __filename);
}

// chua lam
async function checkContentPVCB(device_id, localPath) {
  Logger.log(0, 'PVCB chưa làm.', __filename);
}

// // Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng OCB
// const bankBinMapOCB = {
//     "Asia (ACB)": "970416",
//     "Vietnam Foreign Trade (VCB)": "970436",
//     "Vietinbank (Vietnam Joint Stock Commercial Bank for Industry and Trade)": "970415", "Ngân hàng TMCP Công Thương Việt Nam": "970415",  
//     "Technology and Trade (TCB)": "970407",
//     "Investment and development (BIDV)": "970418", "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam": "970418",
//     "Military (MB)": "970422", "Ngân hàng TMCP Quân Đội": "970422",
//     "NCB": "970419", "Ngân hàng TMCP Quốc Dân": "970419"  
// }

// // Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng MB Bank
// const bankBinMapMB = {
//     "Asia (ACB)": "970416",
//     "Vietnam Foreign Trade (VCB)": "970436",
//     "Vietnam Industry and Trade (VIETINBANK)": "970415",
//     "Technology and Trade (TCB)": "970407",
//     "Investment and development (BIDV)": "970418",
//     "Military (MB)": "970422",
//     "NCB": "970419",

//     "Á Châu (ACB)": "970416",
//     "Ngoại thương Việt Nam (VCB)": "970436",
//     "Công Thương Việt Nam (VIETINBANK)": "970415",
//     "Kỹ Thương (TCB)": "970407",
//     "Đầu tư và phát triển (BIDV)": "970418",
//     "Quân đội (MB)": "970422",
//     "Quốc Dân (NCB)": "970419"
// }

async function stopABB({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.abbank.retail');
  Logger.log(0, 'Đã dừng app ABB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopACB({ device_id }) {
  await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
  Logger.log(0, 'Đã dừng app ACB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopBIDV({ device_id }) {
  await client.shell(device_id, 'am force-stop com.vnpay.bidv');
  Logger.log(0, 'Đã dừng BIDV', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopEIB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
  Logger.log(0, 'Đã dừng EIB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopHDB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.vnpay.hdbank');
  Logger.log(0, 'Đã dừng HDB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopICB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.vietinbank.ipay');
  Logger.log(0, 'Đã dừng ICB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopLPBANK({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.com.lpb.lienviet24h');
  Logger.log(0, 'Đã dừng app LPB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopNCB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.ncb.bank');
  Logger.log(0, 'Đã dừng app NCB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopOCB({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  Logger.log(0, 'Đã dừng app OCB OMNI', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopNAB({ device_id }) {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
  Logger.log(0, 'Dừng luôn app NAB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopSHBSAHA({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.shb.saha.mbanking');
  Logger.log(0, 'Đã dừng SHB SAHA', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopTPB({ device_id }) {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
  Logger.log(0, 'Dừng luôn app TPB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopVCB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.VCB');
  Logger.log(0, 'Đã dừng VCB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopVIB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.vib.myvib2');
  Logger.log(0, 'Đã dừng VIB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopVIETBANK({ device_id }) {
  await client.shell(device_id, 'am force-stop com.vnpay.vietbank');
  Logger.log(0, 'Đã dừng VIETBANK', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopVPB({ device_id }) {
  await client.shell(device_id, 'input keyevent 3');
  await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
  Logger.log(0, 'Dừng luôn app VPB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopMB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.mbmobile');
  Logger.log(0, 'Đã dừng app MB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopMSB({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
  Logger.log(0, 'Đã dừng app MSB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopPVCB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.pvcombank.retail');
  Logger.log(0, 'Đã dừng app PVCB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopSTB({ device_id }) {
  await client.shell(device_id, 'am force-stop com.sacombank.ewallet');
  Logger.log(0, 'Đã dừng app STB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopSEAB({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.com.seabank.mb1');
  Logger.log(0, 'Đã dừng app SEAB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopTCB({ device_id }) {
  await client.shell(device_id, 'am force-stop vn.com.techcombank.bb.app');
  Logger.log(0, 'Đã dừng app TCB', __filename);
  await delay(500);
  return { status: 200, message: 'Success' };
}

module.exports = {
  checkContentABB, checkContentACB, checkContentBAB, checkContentBIDV, checkContentEIB, checkContentHDB, checkContentICB, checkContentNCB, checkContentOCB, checkContentNAB, checkContentSHBSAHA, checkContentTPB, checkContentVPB, checkContentMB, checkContentMSB, checkContentPVCB, checkContentSEAB, checkContentSTB, checkContentTCB, checkContentVCB, checkContentVIB, checkContentVIETBANK, checkContentVIKKI,
  stopABB, stopACB, stopBIDV, stopEIB, stopHDB, stopICB, stopLPBANK, stopMB, stopMSB, stopNAB, stopNCB, stopOCB, stopSHBSAHA, stopPVCB, stopSEAB, stopSTB, stopTCB, stopVCB, stopVIB, stopTPB, stopVPB
}