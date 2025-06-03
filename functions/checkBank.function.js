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

const filePath = 'C:\\att_mobile_client\\database\\localdata.json';
let chatId = process.env.CHATID; // mặc định là gửi vào nhóm Warning - Semi Automated Transfer
const telegramToken = process.env.TELEGRAM_TOKEN;
const { sendTelegramAlert, saveAlertToDatabase } = require('../functions/alert.function');
// const jsonFilePath = "C:\\att_mobile_client\\database\\info-qr.json";

const fileContent = fs.readFileSync(filePath, 'utf-8');
const jsonData = JSON.parse(fileContent);

const siteOrg = jsonData?.org?.site || '';
const siteAtt = jsonData?.att?.site?.split('/').pop() || '';

const validSite = siteOrg || siteAtt; // Ưu tiên org nếu có, nếu không dùng att

const siteToChatIdMap = {
    'shbet': process.env.CHATID_SHBET,
    'new88': process.env.CHATID_NEW88,
    'jun88cmd': process.env.CHATID_JUN88CMD,
    'jun88k36': process.env.CHATID_JUN88K36        
};

if (siteToChatIdMap[validSite]) {
    chatId = siteToChatIdMap[validSite];
}

async function checkContentABB(device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [{
            name: "Chuyển tiền",
            vi: ["Bạn muốn chuyển tiền", "Tới người nhận khác"],            
            en: ["Bạn muốn chuyển tiền", "Tới người nhận khác"]
        }];

        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => content.includes(kw)) ||
                screen.en.every(kw => content.includes(kw))
            ) {
                console.log(`Phát hiện có thao tác thủ công khi xuất với ABB ở màn hình: ${screen.name}`);

                console.log('Đóng app ABB');
                await stopABB({
                    device_id
                });

                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với ABB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với ABB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });

                return;
            }
        }        
    } catch (error) {
        console.error("Lỗi xử lý XML:", error.message);
    }
}

async function checkContentACB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const expectedAccount = jsonData.data?.account_number?.replace(/\s/g, "") || "";
    const expectedAmount = jsonData.data?.amount?.toString().replace(/,/g, "").replace(/\./g, "") || "";

    // --- TH1: Màn hình thao tác thủ công cần cảnh báo ---
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: [
          "Chuyển tiền", "Chuyển tiền đến", "Tài khoản ngân hàng",
          "Thẻ ngân hàng", "CMND / Hộ chiếu", "Số điện thoại",
          "Danh sách người nhận", "Xem tất cả"
        ],
        en: [
          "Transfer", "Transfer to", "Bank account",
          "Bank card", "ID / Passport", "Cellphone number",
          "Beneficiary list", "View all"
        ]
      }
    ];

    for (const screen of screenKeywords) {
      if (
        screen.vi.every(kw => content.includes(kw)) ||
        screen.en.every(kw => content.includes(kw))
      ) {
        console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
        await stopACB({ device_id });
        await sendTelegramAlert(
          telegramToken,
          chatId,
          `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
        );
        console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `Phát hiện có thao tác thủ công khi xuất với ACB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
          filePath: localPath
        });
        return;
      }
    }

    // --- TH 2: Màn hình xác nhận sau khi quét QR ---
    const detectText = [];
    const editTextPattern = /\sresource-id=""\sclass="android\.widget\.EditText"/g;
    let match;

    while ((match = editTextPattern.exec(content)) !== null) {
      const beforeMatch = content.slice(0, match.index);
      const textMatch = beforeMatch.match(/text="([^"]*?)"[^>]*$/);
      if (textMatch) {
        detectText.push(textMatch[1]);
        // console.log("DetectText[] ->", detectText);
      }
    }
    
    if (detectText.length >= 5) {
      const accountNumber = (detectText[1] || "").replace(/\s/g, "");
      const amount = (detectText[3] || "").replace(/[.,\s]/g, "");

      console.log("OCR Account Number:", accountNumber);
      console.log("INFO Account Number:", expectedAccount);
      console.log("OCR Amount:", amount);
      console.log("INFO Amount:", expectedAmount);

      const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

      if (!isMatch) {
        const reason = `ACB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
        console.log(`${reason}. Gửi cảnh báo.`);
        await stopACB({ device_id });
        await sendTelegramAlert(
          telegramToken,
          chatId,
          `Cảnh báo! ${reason} (id thiết bị: ${device_id})`
        );
        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `${reason} (id thiết bị: ${device_id})`,
          filePath: localPath
        });
        return;
      } else {
        console.log("ACB: OCR TRÙNG info-qr về account_number và amount.");
        return;
      }
    } 
    // else {
    //   console.log("ACB: Không ở đúng màn hình xác nhận sau QR (ít hơn 5 EditText)");
    // }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
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
    console.log('log lineNorm:', lineNorm);

    if ( ( lineNorm.includes("so tai khoan thu huong") || lineNorm.includes("beneficiary account number") ) && i + 1 < lines.length) {
      foundAccount = lines[i + 1].replace(/[^0-9]/g, "");
    }

    if ( lineNorm.includes("so tien") || lineNorm.includes("amount") ) {
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

let ocrMatchedByDevice = {}; // Theo dõi trạng thái từng thiết bị
let lastActivityByDevice = {}; // Theo dõi activity gần nhất của từng thiết bị

async function checkContentEIB(device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const currentActivity = content.match(/package=\"(.*?)\"/);
        const currentPackage = currentActivity ? currentActivity[1] : "";
        const lastActivity = lastActivityByDevice[device_id] || "";

        if (ocrMatchedByDevice[device_id] && currentPackage !== lastActivity && currentPackage.includes("com.vnpay.EximBankOmni")) {
            console.log("Đã chuyển màn hình sau khi OCR trùng. Reset ocrMatchedByDevice.");
            ocrMatchedByDevice[device_id] = false;
        }

        lastActivityByDevice[device_id] = currentPackage;

        const hasCollapsingToolbarMenuTransfer = content.includes('resource-id="com.vnpay.EximBankOmni:id/collapsingToolbarMenuTransfer"');
        const hasBtnMenuTransferAddForm = content.includes('resource-id="com.vnpay.EximBankOmni:id/btnMenuTransferAddForm"');

        if (hasCollapsingToolbarMenuTransfer && hasBtnMenuTransferAddForm) {
            const screenName = "Chuyển tiền (XML)";
            console.log(`Phát hiện thao tác thủ công ở màn hình: ${screenName}`);
            await stopEIB({ device_id });
            // await sendTelegramAlert(telegramToken, chatId, `Cảnh báo! Phát hiện thao tác thủ công ở màn hình: ${screenName} (id: ${device_id})`);
            console.log(`Cảnh báo! Phát hiện thao tác thủ công ở màn hình: ${screenName} (id: ${device_id})`);
            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Thao tác thủ công ở màn hình: ${screenName} (id: ${device_id})`,
                filePath: localPath
            });
            return;
        }

        const hasConfirmScreenHint =
            content.includes('resource-id="com.vnpay.EximBankOmni:id/swSaveBene"') &&
            content.includes('class="android.widget.Switch"')

        if (hasConfirmScreenHint && !ocrMatchedByDevice[device_id]) {
            console.log("Quét xong QR. Tiến hành OCR...");

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
            console.log("log text from OCR:\n", text);

            const { ocrAccount, ocrAmount } = extractOCRFieldsFromLinesEIB(text);

            const jsonPath = "C:/att_mobile_client/database/info-qr.json";
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const expectedAccount = normalizeText(jsonData.data?.account_number?.toString() || "");
            const expectedAmount = normalizeText(jsonData.data?.amount?.toString() || "");

            console.log("OCR Account Number:", ocrAccount, "| length:", ocrAccount.length);
            console.log("INFO Account Number:", expectedAccount, "| length:", expectedAccount.length);
            console.log("OCR Amount:", ocrAmount, "| length:", ocrAmount.length);
            console.log("INFO Amount:", expectedAmount, "| length:", expectedAmount.length);

            const ocrHasAccount =
                ocrAccount === expectedAccount ||
                (ocrAccount.length === expectedAccount.length + 1 && ocrAccount.startsWith(expectedAccount));

            const ocrHasAmount = ocrAmount === expectedAmount;

            if (!(ocrHasAccount && ocrHasAmount)) {
                const reason = "OCR KHÁC info-qr về số tài khoản hoặc số tiền";
                console.log(`${reason}. Gửi cảnh báo.`);
                await stopEIB({ device_id });
                // await sendTelegramAlert(telegramToken, chatId, `Cảnh báo! ${reason} tại màn hình xác nhận giao dịch (id: ${device_id})`);
                console.log(`Cảnh báo! ${reason} tại màn hình xác nhận giao dịch (id: ${device_id})`);
                await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `${reason} (id: ${device_id})`,
                filePath: localScreenshot
                });
                return;
            } else {
                ocrMatchedByDevice[device_id] = true;
                console.log("OCR TRÙNG info-qr về account_number và amount. OCR ảnh .");
            }
        }

        if (!content.includes("com.vnpay.EximBankOmni")) {
            ocrMatchedByDevice[device_id] = false;
        }

    } catch (error) {
        console.error("checkContentEIB got an error:", error.message);
    }
}

async function dumpOCRToLocal(device_id, localPath) {
  try {
    const screencapStream = await client.shell(device_id, `screencap -p`);

    await pipeline(
      screencapStream,
      fs.createWriteStream(localPath)
    );

    console.log("Screenshot saved to:", localPath);
  } catch (error) {
    console.error(`dumpOCRToLocal error: ${error.message}`);
  }
}

async function checkContentNCB(device_id, localPath) {
  try {
    const { data: { text } } = await Tesseract.recognize(localPath, 'vie+eng');
    console.log("log text from OCR:\n", text);

    const lowerText = normalizeText(text);

    if ( lowerText.includes("chuyen tien") && (lowerText.includes("toi tai khoan") || lowerText.includes("toi the"))) {
      const reason = "Phát hiện màn hình chọn hình thức chuyển tiền (OCR)";
      console.log(`${reason}. Gửi cảnh báo.`);
      await stopNCB({ device_id });
      await sendTelegramAlert(telegramToken, chatId, `Cảnh báo! ${reason} (id: ${device_id})`);
      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `${reason} (id: ${device_id})`,
        filePath: localPath
      });
      return;
    }

    if (!(lowerText.includes("so tien chuyen") || lowerText.includes("han muc"))) {
      console.log("Chưa tới màn hình xác nhận chuyển khoản, bỏ qua check ocr.");
      return;
    }

    console.log("Phát hiện màn hình sau khi quét QR, chuyển tiếp sang màn hình xác nhận.");
    await client.shell(device_id, 'input keyevent 61');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await delay(10000);
    await dumpOCRToLocal(device_id, localPath);
    
    const { data: { text: secondText } } = await Tesseract.recognize(localPath, 'vie+eng');
    const { ocrAccount, ocrAmount } = extractOCRFieldsFromLinesNCB(secondText);

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const expectedAccount = normalizeText(jsonData.data?.account_number?.toString() || "");
    const expectedAmount = normalizeText(jsonData.data?.amount?.toString() || "");

    console.log("OCR Account Number:", ocrAccount, "| length:", ocrAccount.length);
    console.log("INFO Account Number:", expectedAccount, "| length:", expectedAccount.length);
    console.log("OCR Amount:", ocrAmount, "| length:", ocrAmount.length);
    console.log("INFO Amount:", expectedAmount, "| length:", expectedAmount.length);

    const ocrHasAccount =
      ocrAccount === expectedAccount ||
      (ocrAccount.length === expectedAccount.length + 1 && ocrAccount.startsWith(expectedAccount));

    const ocrHasAmount = ocrAmount === expectedAmount;

    if (!(ocrHasAccount && ocrHasAmount)) {
      const reason = "OCR KHÁC info-qr về số tài khoản hoặc số tiền";
      console.log(`${reason}. Gửi cảnh báo.`);
      await stopNCB({ device_id });
      await sendTelegramAlert(telegramToken, chatId, `Cảnh báo! ${reason} tại màn hình xác nhận giao dịch (id: ${device_id})`);
      await saveAlertToDatabase({
        timestamp: new Date().toISOString(),
        reason: `${reason} (id: ${device_id})`,
        filePath: localPath
      });
      return;
    } else {
      ocrMatchedByDevice[device_id] = true;
      console.log("OCR TRÙNG info-qr về account_number và amount. OCR ảnh .");
    }

  } catch (error) {
    console.error("checkContentNCB got an error:", error.message);
  }
}

async function checkContentOCB(device_id, localPath) {
  try {
    const content = fs.readFileSync(localPath, "utf-8").trim();

    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const expectedAccount = jsonData.data?.account_number?.replace(/\s/g, "") || "";
    const expectedAmount = jsonData.data?.amount?.toString().replace(/,/g, "").replace(/\./g, "") || "";

    // --- TH1: Màn hình thao tác thủ công cần cảnh báo ---
    const screenKeywords = [
        {
            name: "Chuyển tiền",
            vi: ["Chuyển tiền", "Trong OCB", "Ngân hàng khác", "Đến số thẻ", "Xem tất cả", "Chuyển gần đây"],
            en: ["Transfer money", "Within OCB", "Interbank", "To card number", "See all", "Recent transferred"]
        }
    ];

    for (const screen of screenKeywords) {
        if (
            screen.vi.every(kw => content.includes(kw)) ||
            screen.en.every(kw => content.includes(kw))
        ) {
            console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
            console.log('Đóng app OCB');
            await stopOCB({ device_id });
            await sendTelegramAlert(
              telegramToken,
              chatId,
              `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
            );            
            await saveAlertToDatabase({
              timestamp: new Date().toISOString(),
              reason: `Phát hiện có thao tác thủ công khi xuất với OCB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
              filePath: localPath
            });

            return;
        }
    }

    // --- TH2: Check QR ---
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

    // console.log("DetectText[] ->", detectText);

    if (detectText.length >= 3) {
      const accountNumber = (detectText[0] || "").replace(/\s/g, "");
      const amount = (detectText[1] || "").replace(/[.,\s]/g, "");

      console.log("OCR Account Number:", accountNumber);
      console.log("INFO Account Number:", expectedAccount);
      console.log("OCR Amount:", amount);
      console.log("INFO Amount:", expectedAmount);

      const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

      if (!isMatch) {
        const reason = `OCB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
        console.log(`${reason}. Gửi cảnh báo.`);
        await stopOCB({ device_id });
        await sendTelegramAlert(
          telegramToken,
          chatId,
          `Cảnh báo! ${reason} (id thiết bị: ${device_id})`
        );
        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `${reason} (id thiết bị: ${device_id})`,
          filePath: localPath
        });
        return;
      } else {
        console.log("OCB: OCR TRÙNG info-qr về account_number và amount.");
        return;
      }
    } 
    // else {
    //   console.log("OCB: Không đủ thông tin từ OCR để so sánh với info-qr.");
    // }
  } catch (error) {
    console.error("Lỗi xử lý XML:", error.message);
  }
}

async function checkContentNAB(device_id, localPath) {
    try {
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

        for (const screen of screenKeywords) {
        if (
            screen.vi.every(kw => content.includes(kw)) ||
            screen.en.every(kw => content.includes(kw))
        ) {
            if (screen.name === "Chuyển tiền") {
            console.log(`Phát hiện có thao tác thủ công khi xuất với NAB ở màn hình: ${screen.name}`);
            await stopNAB({ device_id });
            await sendTelegramAlert(
                telegramToken,
                chatId,
                `Cảnh báo! Phát hiện thao tác thủ công NAB ở: ${screen.name} (${device_id})`
            );
            console.log(`Cảnh báo! Phát hiện thao tác thủ công NAB ở: ${screen.name} (${device_id})`);
            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Phát hiện thao tác thủ công NAB ở: ${screen.name} (${device_id})`,
                filePath: localPath
            });
            return;
            }

            if (screen.name === "Chuyển tiền đến tài khoản") {                
                const accMatches = [...content.matchAll(/text="([\d\s]+)"\s+resource-id="ops\.namabank\.com\.vn:id\/accountNumber"/g)];
                const amtMatches = [...content.matchAll(/text="([\d.,\s]+)"\s+resource-id="ops\.namabank\.com\.vn:id\/amount"/g)];

                const ocrAccount = accMatches.length ? accMatches[accMatches.length - 1][1].replace(/\s/g, "") : "";
                const ocrAmount = amtMatches.length ? amtMatches[amtMatches.length - 1][1].replace(/[.,\s]/g, "") : "";

                const jsonPath = "C:/att_mobile_client/database/info-qr.json";
                const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
                const expectedAcc = (jsonData.data?.account_number || "").replace(/\s/g, "");
                const expectedAmt = (jsonData.data?.amount || "").toString().replace(/[.,]/g, "");

                console.log("OCR Account Number:", ocrAccount);
                console.log("INFO Account Number:", expectedAcc);
                console.log("OCR Amount:", ocrAmount);
                console.log("INFO Amount:", expectedAmt);

                if (ocrAccount !== expectedAcc || ocrAmount !== expectedAmt) {
                    await stopNAB({ device_id });
                    await sendTelegramAlert(
                      telegramToken,
                      chatId,
                      `Cảnh báo! Lệch QR NAB ở màn hình "${screen.name}" (${device_id})\nTài khoản: ${ocrAccount}, Số tiền: ${ocrAmount}`
                    );
                    console.log(`Cảnh báo! Lệch QR NAB ở màn hình "${screen.name}" (${device_id})\nTài khoản: ${ocrAccount}, Số tiền: ${ocrAmount}`);
                    await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Lệch QR NAB: account_number hoặc amount không khớp (${device_id})`,
                    filePath: localPath
                    });
                    return;
                } else {
                    console.log("OCR khớp info-qr.json, tiếp tục theo dõi...");
                }
            }
        }
        }
    } catch (error) {
        console.error("checkContentNAB got an error:", error.message);
    }
}

async function checkContentSHBSAHA (device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [
            {
                name: "Chuyển tiền",                
                vi: ["Đến người khác", "Đến tôi tại SHB", "SHS"],
                en: ["Đến người khác", "Đến tôi tại SHB", "SHS"]
            }            
        ];

        for (const screen of screenKeywords) {
            if ( screen.vi.every(kw => content.includes(kw)) || screen.en.every(kw => content.includes(kw))) {
                console.log(`Phát hiện có thao tác thủ công khi xuất với SHB SAHA ở màn hình: ${screen.name}`);

                console.log('Đóng app SHB SAHA');
                await stopSHBSAHA({ device_id });

                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với SHB SAHA ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );
                console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với SHB SAHA ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với SHB SAHA ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });

                return;
            }
        }

        // Kiểm tra màn hình "Chuyển tiền đến" (sau khi quét xong QR code)
        const hasTransferForm = [
            "Chuyển tiền đến",
            "Ngân hàng nhận",
            "Số tài khoản",
            "Tên người nhận",
            "Số tiền"].every(keyword => content.includes(keyword));

        if (hasTransferForm) {
            const accountMatch = content.match(/text="Số tài khoản"[\s\S]*?text="(\d{6,})"/);
            const amountMatch = content.match(/text="Số tiền"[\s\S]*?text="([0-9,\. ]+ VND)"/);

            const xmlAccount = accountMatch ? accountMatch[1].replace(/\D/g, '') : "";
            const xmlAmount = amountMatch ? amountMatch[1].replace(/[^0-9]/g, '') : "";

            const jsonPath = "C:/att_mobile_client/database/info-qr.json";
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            const expectedAccount = jsonData.data?.account_number?.toString().replace(/\D/g, '') || "";
            const expectedAmount = jsonData.data?.amount?.toString().replace(/\D/g, '') || "";

            console.log("XML Account Number:", xmlAccount);
            console.log("INFO Account Number:", expectedAccount);
            console.log("XML Amount:", xmlAmount);
            console.log("INFO Amount:", expectedAmount);

            const xmlHasAccount = 
                xmlAccount === expectedAccount ||
                (xmlAccount.length === expectedAccount.length + 1 && xmlAccount.startsWith(expectedAccount));

            const xmlHasAmount = xmlAmount === expectedAmount;

            if (!(xmlHasAccount && xmlHasAmount)) {
                const reason = "XML KHÁC info-qr về số tài khoản hoặc số tiền";
                console.log(`${reason}. Gửi cảnh báo.`);
                await stopSHBSAHA({ device_id });
                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `Cảnh báo! ${reason} với SHB SAHA (id thiết bị: ${device_id})`
                );
                console.log(`Cảnh báo! ${reason} với SHB SAHA (id thiết bị: ${device_id})`);
                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `${reason} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });
                return;
            } else {
                console.log("XML TRÙNG info-qr về account_number và amount.");
            }
        }
    } catch (error) {    
        console.error("Lỗi xử lý XML:", error.message);
    }
}

async function checkContentTPB(device_id, localPath) {
  try {
    const xml = fs.readFileSync(localPath, "utf-8").trim();
    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const expectedAccount = jsonData.data?.account_number?.replace(/\s/g, "") || "";
    const expectedAmount = jsonData.data?.amount?.toString().replace(/,/g, "") || "";

    // Nếu là màn hình "Chuyển tiền tới"
    const isTransferToScreen = xml.includes('Chuyển tiền tới') && 
      xml.includes('resource-id="com.tpb.mb.gprsandroid:id/btn_continue"');

    if (isTransferToScreen) {
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
        amount = amtMatch[1].replace(/,/g, "").trim();
      }

      console.log("OCR Account Number:", accountNumber);
      console.log("INFO Account Number:", expectedAccount);
      console.log("OCR Amount:", amount);
      console.log("INFO Amount:", expectedAmount);

      const isMatch =
        accountNumber === expectedAccount &&
        amount === expectedAmount;

      if (!isMatch) {
        const reason = `TPB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
        console.log(`${reason}. Gửi cảnh báo.`);

        await stopTPB({ device_id });
        await sendTelegramAlert(telegramToken, chatId,
          `Cảnh báo! ${reason} (id thiết bị: ${device_id})`
        );
        console.log(`Cảnh báo! ${reason} (id thiết bị: ${device_id})`);
        await saveAlertToDatabase({
          timestamp: new Date().toISOString(),
          reason: `${reason} (id thiết bị: ${device_id})`,
          filePath: localPath
        });

        return;
      } else {
        console.log("TPB: OCR TRÙNG info-qr về account_number và amount.");
        return; // Không alert, không đóng app
      }
    }

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
        if (
            screen.vi.every(kw => xml.includes(kw)) ||
            screen.en.every(kw => xml.includes(kw))
        ) {
            console.log(`Phát hiện có thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name}`);
            console.log('Đóng app TPB');
            await stopTPB({ device_id });
            await sendTelegramAlert(
              telegramToken,
              chatId,
              `Cảnh báo! Phát hiện thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
            );
            console.log(`Cảnh báo! Phát hiện thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
            await saveAlertToDatabase({
            timestamp: new Date().toISOString(),
            reason: `Phát hiện thao tác thủ công khi xuất với TPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
            filePath: localPath
            });
            return;
        }
    }

  } catch (error) {
    console.error("checkContentTPB got an error:", error.message);
  }
}

async function checkContentVPB(device_id, localPath) {
  try {
    const xml = fs.readFileSync(localPath, "utf-8").trim();
    const jsonPath = "C:/att_mobile_client/database/info-qr.json";
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const expectedAccount = jsonData.data?.account_number?.replace(/\s/g, "") || "";
    const expectedAmount = jsonData.data?.amount?.toString().replace(/,/g, "") || "";

    /* Trường hợp 1: Màn hình thao tác thủ công cần cảnh báo */
    const screenKeywords = [
      {
        name: "Chuyển tiền",
        vi: ["Tới tài khoản", "Tới thẻ", "Tới tài khoản/&#10;thẻ của tôi", "Cộng đồng&#10;thịnh vượng"],
        en: ["Tới tài khoản", "Tới thẻ", "Tới tài khoản/&#10;thẻ của tôi", "Cộng đồng&#10;thịnh vượng"]
      },
      {
        name: "Chuyển đến số tài khoản",
        vi: ["Chuyển đến số tài khoản", "Tài khoản nguồn", "Thông tin người nhận", "Chọn ngân hàng"],
        en: ["Chuyển đến số tài khoản", "Tài khoản nguồn", "Thông tin người nhận", "Chọn ngân hàng"]
      }
    ];

    for (const screen of screenKeywords) {
        if (
            screen.vi.every(kw => xml.includes(kw)) ||
            screen.en.every(kw => xml.includes(kw))
        ) {
            console.log(`Phát hiện có thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name}`);
            console.log('Đóng app VPB');
            await stopVPB({ device_id });
            await sendTelegramAlert(
                telegramToken,
                chatId,
                `Cảnh báo! Phát hiện thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
            );
            console.log(`Cảnh báo! Phát hiện thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Phát hiện thao tác thủ công khi xuất với VPB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                filePath: localPath
            });
            return;
        }
    }

    //* Trường hợp 2: Check QR */
    const isTransferToScreen = xml.includes('resource-id="com.vnpay.vpbankonline:id/titleReceiveInfo"');    

    if (isTransferToScreen) {
        let accountNumber = "";
        const accMatch = xml.match(/text="([\d\s]+)"\s+resource-id="com\.vnpay\.vpbankonline:id\/edtAccount"/);
        if (accMatch) {
            accountNumber = accMatch[1].replace(/\s/g, "");
        }

        let amount = "";
        const amtMatch = xml.match(/text="([\d\s,.]+)"\s+resource-id="com\.vnpay\.vpbankonline:id\/edtAmount"/);
        if (amtMatch) {
            amount = amtMatch[1].replace(/[^\d]/g, "").trim();
        }

        console.log("OCR Account Number:", accountNumber);
        console.log("INFO Account Number:", expectedAccount);
        console.log("OCR Amount:", amount);
        console.log("INFO Amount:", expectedAmount);

        const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

        if (!isMatch) {
            const reason = `VPB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
            console.log(`${reason}. Gửi cảnh báo.`);

            await stopVPB({ device_id });
            await sendTelegramAlert(
                telegramToken,
                chatId,
                `Cảnh báo! ${reason} (id thiết bị: ${device_id})`
            );
            console.log(`Cảnh báo! ${reason} (id thiết bị: ${device_id})`);
            await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `${reason} (id thiết bị: ${device_id})`,
                filePath: localPath
            });

            return;
        } else {
            console.log("VPB: OCR TRÙNG info-qr về account_number và amount.");
            return;
            }
        }
    } catch (error) {
        console.error("checkContentVPB got an error :", error.message);
    }
}

async function checkContentMB(device_id, localPath) {
    try {
        const xml = fs.readFileSync(localPath, "utf-8").trim();
        const jsonPath = "C:/att_mobile_client/database/info-qr.json";
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        const expectedAccount = jsonData.data?.account_number?.replace(/\s/g, "") || "";
        const expectedAmount = jsonData.data?.amount?.toString().replace(/,/g, "") || "";

        /* Trường hợp 1: Màn hình thao tác thủ công cần cảnh báo */
        const screenKeywords = [
            {
                name: "Chuyển tiền",
                vi: ["Số tài&#10;khoản", "Số&#10;điện thoại", "&#10;Số thẻ", "Truy vấn giao dịch giá trị lớn", "Chuyển tiền"],
                en: ["Account", "Phone number", "Card", "Large-value transaction inquiry", "Transfer"]
            }
        ];

        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => xml.includes(kw)) ||
                screen.en.every(kw => xml.includes(kw))
            ) {
                console.log(`Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name}`);
                console.log('Đóng app MB');
                await stopMB({ device_id });
                await sendTelegramAlert(
                telegramToken,
                chatId,
                `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );
                console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);
                await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `Phát hiện có thao tác thủ công khi xuất với MB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                filePath: localPath
                });
                return;
            }
        }

        //* Trường hợp 2: Check QR */
        const isTransferToScreen = xml.includes('resource-id="MInput_0a67f0a6-0cc5-483a-8e23-9300e20ab1ac"') &&
                                xml.includes('resource-id="MInput_c3a8b456-f94f-471b-bca1-dc2cb3662035"');

        if (isTransferToScreen) {
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

            console.log("OCR Account Number:", accountNumber);
            console.log("INFO Account Number:", expectedAccount);
            console.log("OCR Amount:", amount);
            console.log("INFO Amount:", expectedAmount);

            const isMatch = accountNumber === expectedAccount && amount === expectedAmount;

            if (!isMatch) {
                const reason = `MB: OCR KHÁC info-qr về số tài khoản hoặc số tiền`;
                console.log(`${reason}. Gửi cảnh báo.`);
                await stopMB({ device_id });
                await sendTelegramAlert(
                  telegramToken,
                  chatId,
                  `Cảnh báo! ${reason} (id thiết bị: ${device_id})`
                );
                console.log(`Cảnh báo! ${reason} (id thiết bị: ${device_id})`);
                await saveAlertToDatabase({
                timestamp: new Date().toISOString(),
                reason: `${reason} (id thiết bị: ${device_id})`,
                filePath: localPath
                });
                return;
            } else {
                console.log("MB: OCR TRÙNG info-qr về account_number và amount.");
                return;
            }
        }
    } catch (error) {
        console.error("Lỗi xử lý XML:", error.message);
    }
}

// chưa xong
// chưa xong
// chưa xong
async function checkContentSEAB(device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [{
            name: "Chuyển tiền",
            vi: ["Chuyển tiền", "Số điện thoại", "Số tài khoản", "Số thẻ"],
            en: ["Chuyển tiền", "Số điện thoại", "Số tài khoản", "Số thẻ"]
        }];

        for (const screen of screenKeywords) {
            if (
                screen.vi.every(kw => content.includes(kw)) ||
                screen.en.every(kw => content.includes(kw))
            ) {
                console.log(`Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name}`);
                console.log('Đóng app SEAB');
                await stopSEAB({
                    device_id
                });
                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );
                console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với SEAB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });

                return;
            }
        }        
    } catch (error) {
        console.error("Lỗi xử lý XML:", error.message);
    }
}

async function checkContentSTB(device_id, localPath) {
    try {
        const content = fs.readFileSync(localPath, "utf-8").trim();

        const screenKeywords = [{
            name: "Chuyển tiền",
            vi: ["Chuyển tiền", "Số điện thoại", "Số tài khoản", "Số thẻ", "Tên ngân hàng", "Số tài khoản nhận", "Số tiền cần chuyển"],
            en: ["Chuyển tiền", "Số điện thoại", "Số tài khoản", "Số thẻ", "Tên ngân hàng", "Số tài khoản nhận", "Số tiền cần chuyển"]
        }];
        const exceptionKeyword = "Tên người nhận";

        for (const screen of screenKeywords) {
            const viMatch = screen.vi.every(kw => content.includes(kw));
            const enMatch = screen.en.every(kw => content.includes(kw));
            const isException = content.includes(exceptionKeyword);

            if ((viMatch || enMatch) && !isException) {
                console.log(`Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name}`);
                console.log('Đóng app STB');
                await stopSTB({ device_id });
                await sendTelegramAlert(
                    telegramToken,
                    chatId,
                    `Cảnh báo! Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`
                );
                console.log(`Cảnh báo! Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`);

                await saveAlertToDatabase({
                    timestamp: new Date().toISOString(),
                    reason: `Phát hiện có thao tác thủ công khi xuất với STB ở màn hình: ${screen.name} (id thiết bị: ${device_id})`,
                    filePath: localPath
                });

                return;
            }
        }      
    } catch (error) {
        console.error("Lỗi xử lý XML:", error.message);
    }
}

function extractNodesOCB(obj) {
    let bin = null,
        account_number = null,
        amount = null;
    const bankList = [
        "ACB (Asia Commercial Bank)", "Ngân hàng TMCP Á Châu",
        "Vietcombank (Bank for Foreign Trade of Vietnam)", "Ngân hàng TMCP Ngoại Thương Việt Nam",
        "Vietinbank (Vietnam Joint Stock Commercial Bank for Industry and Trade)", "Ngân hàng TMCP Công Thương Việt Nam",
        "Techcombank (Vietnam Technological and Commercial Joint Stock Bank)", "Ngân hàng TMCP Kỹ Thương Việt Nam",
        "BIDV (Bank for Investment and Development of Vietnam)", "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam",
        "Military Commercial Joint Stock Bank", "Ngân hàng TMCP Quân Đội",
        "National Citizen Bank", "Ngân hàng TMCP Quốc Dân"
    ];

    let foundBank = false;
    let foundAccount = false;

    function traverse(node) {
        if (!node) return;

        if (typeof node === 'object') {
            for (let key in node) {
                traverse(node[key]);
            }
        }

        if (typeof node === 'string') {
            let text = node.trim();
            if (!text || text === "false" || text === "true") return;

            // 1️⃣ Tìm ngân hàng
            if (!bin) {
                for (let bank of bankList) {
                    if (text.includes(bank)) {
                        bin = bankBinMapOCB[bank] || bank;
                        foundBank = true;
                        return;
                    }
                }
            }

            // 2️⃣ Tìm số tài khoản (chỉ tìm sau khi đã tìm thấy ngân hàng)
            if (foundBank && !account_number) {
                const accountMatch = text.match(/\b\d{6,}\b/); // Tìm số tài khoản (ít nhất 6 số)
                if (accountMatch) {
                    account_number = accountMatch[0];
                    foundAccount = true;
                    console.log(`💳 Tìm thấy số tài khoản: ${account_number}`);
                    return;
                }
            }
        }

        // 3️⃣ Lấy số tiền từ đúng thẻ có resource-id="vn.com.ocb.awe:id/edtInput"
        if (typeof node === 'object' && node['resource-id'] === 'vn.com.ocb.awe:id/edtInput' && node.text) {
            amount = parseInt(node.text.replace(/,/g, ''), 10);
        }
    }

    traverse(obj);
    return {
        bin,
        account_number,
        amount
    };
}

function extractNodesMB(obj) {
    let bin = null,
        account_number = null,
        amount = null;
    const bankList = [
        "Asia (ACB)", "Á Châu (ACB)",
        "Vietnam Foreign Trade (VCB)", "Ngoại thương Việt Nam (VCB)",
        "Vietnam Industry and Trade (VIETINBANK)", "Công Thương Việt Nam (VIETINBANK)",
        "Technology and Trade (TCB)", "Kỹ Thương (TCB)",
        "Investment and development (BIDV)", "Đầu tư và phát triển (BIDV)",
        "Military (MB)", "Quân đội (MB)",
        "NCB", "Quốc Dân (NCB)"
    ];

    let foundBank = false;
    let foundAccount = false;
    let maxAmount = 0;

    function traverse(node) {
        if (!node) return;

        if (typeof node === 'object') {
            for (let key in node) {
                traverse(node[key]);
            }
        }

        if (typeof node === 'string') {
            let text = node.trim();
            if (!text || text === "false" || text === "true") return;

            // 1️⃣ Tìm ngân hàng trước
            if (!bin) {
                for (let bank of bankList) {
                    if (text.includes(bank)) {
                        bin = bankBinMapMB[bank] || bank;
                        foundBank = true;
                        return;
                    }
                }
            }

            // 2️⃣ Tìm số tài khoản (chỉ tìm sau khi đã tìm thấy ngân hàng)
            if (foundBank && !account_number) {
                const accountMatch = text.match(/\b\d{6,}\b/); // Tìm số tài khoản (ít nhất 6 số)
                if (accountMatch) {
                    account_number = accountMatch[0];
                    foundAccount = true;
                    return;
                }
            }

            // 3️⃣ Tìm số tiền giao dịch lớn nhất
            const amountMatch = text.match(/^\d{1,3}(?:,\d{3})*$/);
            if (amountMatch) {
                let extractedAmount = parseInt(amountMatch[0].replace(/,/g, ''), 10); // Bỏ dấu `,` và convert thành số
                if (extractedAmount > maxAmount) {
                    maxAmount = extractedAmount;
                }
            }
        }
    }

    traverse(obj);
    amount = maxAmount;

    return {
        bin,
        account_number,
        amount
    };
}

// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng OCB
const bankBinMapOCB = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Vietinbank (Vietnam Joint Stock Commercial Bank for Industry and Trade)": "970415", "Ngân hàng TMCP Công Thương Việt Nam": "970415",  
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418", "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam": "970418",
    "Military (MB)": "970422", "Ngân hàng TMCP Quân Đội": "970422",
    "NCB": "970419", "Ngân hàng TMCP Quốc Dân": "970419"  
}


// Bảng ánh xạ tên ngân hàng sang mã BIN khi dùng MB Bank
const bankBinMapMB = {
    "Asia (ACB)": "970416",
    "Vietnam Foreign Trade (VCB)": "970436",
    "Vietnam Industry and Trade (VIETINBANK)": "970415",
    "Technology and Trade (TCB)": "970407",
    "Investment and development (BIDV)": "970418",
    "Military (MB)": "970422",
    "NCB": "970419",
    
    "Á Châu (ACB)": "970416",
    "Ngoại thương Việt Nam (VCB)": "970436",
    "Công Thương Việt Nam (VIETINBANK)": "970415",
    "Kỹ Thương (TCB)": "970407",
    "Đầu tư và phát triển (BIDV)": "970418",
    "Quân đội (MB)": "970422",
    "Quốc Dân (NCB)": "970419"
}

const compareData = (xmlData, jsonData) => {
    let differences = [];
    if (xmlData.bin !== jsonData.bin) differences.push(`BIN khác: XML(${xmlData.bin}) ≠ JSON(${jsonData.bin})`);
    if (xmlData.account_number !== String(jsonData.account_number)) differences.push(`Số tài khoản khác: XML(${xmlData.account_number}) ≠ JSON(${jsonData.account_number})`);
    if (Number(xmlData.amount) !== Number(jsonData.amount)) differences.push(`Số tiền khác: XML(${xmlData.amount}) ≠ JSON(${jsonData.amount})`);
    return differences;
}

async function stopABB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop vn.abbank.retail');
    console.log('Đã dừng app ABB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopACB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop mobile.acb.com.vn');
    console.log('Đã dừng app ACB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopBIDV ({ device_id }) {    
    await client.shell(device_id, 'am force-stop com.vnpay.bidv');
    console.log('Đã dừng BIDV');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopEIB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop com.vnpay.EximBankOmni');
    console.log('Đã dừng EIB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopICB ({ device_id }) {    
    await client.shell(device_id, 'am force-stop com.vietinbank.ipay');
    console.log('Đã dừng ICB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopLPBANK ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.lpb.lienviet24h');
  console.log('Đã dừng app LPB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopNCB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.ncb.bank');
  console.log('Đã dừng app NCB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopOCB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.ocb.awe');
  console.log('Đã dừng app OCB OMNI');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopNAB ({ device_id }) {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop ops.namabank.com.vn');
    console.log('Dừng luôn app NAB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopSHBSAHA ({ device_id }) {    
    await client.shell(device_id, 'am force-stop vn.shb.saha.mbanking');
    console.log('Đã dừng SHB SAHA');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopTPB ({ device_id }) {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.tpb.mb.gprsandroid');
    console.log('Dừng luôn app TPB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopVCB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.VCB');
  console.log('Đã dừng VCB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopVPB ({ device_id }) {    
    await client.shell(device_id, 'input keyevent 3');
    await client.shell(device_id, 'am force-stop com.vnpay.vpbankonline');
    console.log('Dừng luôn app VPB');
    await delay(500);
    return { status: 200, message: 'Success' };
}

async function stopMB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.mbmobile');
  console.log('Đã dừng app MB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopMSB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.msb.smartBanking');
  console.log('Đã dừng app MSB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopPVCB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.pvcombank.retail');
  console.log('Đã dừng app PVCB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopSTB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop com.sacombank.ewallet');
  console.log('Đã dừng app STB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

async function stopSEAB ({ device_id }) {    
  await client.shell(device_id, 'am force-stop vn.com.seabank.mb1');
  console.log('Đã dừng app STB');
  await delay(500);
  return { status: 200, message: 'Success' };
}

module.exports = { checkContentABB, checkContentACB, checkContentEIB, checkContentNCB, checkContentOCB, checkContentNAB, checkContentSHBSAHA, checkContentTPB, checkContentVPB, checkContentMB, checkContentSTB,
  stopABB, stopACB, stopBIDV, stopEIB, stopICB, stopLPBANK, stopMB, stopMSB, stopNAB, stopNCB, stopOCB, stopSHBSAHA, stopPVCB, stopSEAB, stopSTB, stopVCB, stopTPB, stopVPB
}