const getSignalingClient = require("./lib/getSignalingClient.js").default;

const CHANNEL_ID = "444444";
const ACCOUNT_ID = "10000001";
const ADMIN_ID = "999999";

async function initSigal() {
    console.log("初始化客户端");
    const client = await getSignalingClient(ACCOUNT_ID, undefined);
    console.log("加入房间", CHANNEL_ID);
    await client.leave();
    await client.join(CHANNEL_ID);
    sendMessage(client);

    setInterval(() => {
        sendMessage(client);
    }, 100);
}

function sendMessage(client) {
    const message = getMessage();
    console.log("发送消息", message);

    client.sendMessage(ADMIN_ID, message);
}

function getMessage() {
    return {
        type: getRandomType(),
        account: ACCOUNT_ID,
        app: "desk",
        content: "你们都还好么",
        dateTime: new Date().toJSON()
    };
}

const TYPES = ["debug", "log", "info", "warn", "error", "other"];
function getRandomType() {
    return TYPES[~~(Math.random() * (TYPES.length + 1))] || TYPES[0];
}

initSigal();
