const getAgoraRTCClient = require("./lib/getAgoraRTCClient").default;
const { desktopCapturer } = require("electron");

const CHANNEL_ID = "444444";
const ACCOUNT_ID = "10000001";
const ADMIN_ID = "999999";

async function init() {
    const client = await getAgoraRTCClient();
    await client.safeJoin(null,ACCOUNT_ID,ACCOUNT_ID)
    const deskStream =  await getDeskStream()
    console.log(deskStream)
    await client.startDeskStream('localStream',deskStream)
}

async function startStream() {
    const deskStream = getDeskStream()
}

function getDeskStream() {
    return new Promise((resolve, reject) => {
        desktopCapturer.getSources(
            {
                types: ["window", "screen"]
            },
            (error, sources) => {
                if (error) throw error;
                console.log(sources);

                for (let i = 0; i < sources.length; ++i) {
                    if (
                        sources[i].name === "Screen 1" ||
                        sources[i].name === "Entire screen"
                    ) {
                        navigator.mediaDevices
                            .getUserMedia({
                                audio: {
                                    mandatory: {
                                        chromeMediaSource: "desktop"
                                    }
                                },
                                video: {
                                    mandatory: {
                                        chromeMediaSource: "desktop"
                                    }
                                }
                            })
                            .then(stream => resolve(stream))
                            .catch(e => reject(e));
                    }
                    return
                }
                reject(new Error("no desck screen stream"));
            }
        );
    });
}


init()