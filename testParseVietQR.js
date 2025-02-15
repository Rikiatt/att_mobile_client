function parseVietQR(vietqr) {
    try {        
        const regex = /image\/(\d+)-(\d+)-qr\.png\?amount=(\d+)/;
        const match = vietqr.match(regex);
        
        if (match) {
            const bankBIN = match[1];
            const accountNumber = match[2];
            const amount = match[3];
            
            return { bankBIN, accountNumber, amount };
        } else {
            throw new Error("Cannot parse URL VietQR");
        }
    } catch (error) {
        console.error("Failed:", error.message);
        return null;
    }
}

const vietqr = "https://img.vietqr.io/image/970418-8842293737-qr.png?amount=111&addInfo=";
const result = parseVietQR(vietqr);
console.log(result);